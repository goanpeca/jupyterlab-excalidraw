/**
 * Excalidraw widget and document widget for JupyterLab.
 *
 * {@link ExcalidrawWidget} renders the `@excalidraw/excalidraw` React
 * component inside a Lumino `Widget`.
 *
 * {@link ExcalidrawDocumentWidget} wraps it as a JupyterLab
 * `DocumentWidget` with save interception and context management.
 *
 * @module widget
 */
import { DocumentWidget } from '@jupyterlab/docregistry';
import { Widget } from '@lumino/widgets';
import { Signal, ISignal } from '@lumino/signaling';
import { Message } from '@lumino/messaging';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Excalidraw } from '@excalidraw/excalidraw';
import type {
  ExcalidrawImperativeAPI,
  BinaryFiles,
  AppState
} from '@excalidraw/excalidraw/dist/types/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/dist/types/excalidraw/element/types';
import type { Theme } from '@excalidraw/excalidraw/dist/types/excalidraw/element/types';
import '@excalidraw/excalidraw/index.css';

import { ExcalidrawModel } from './model';
import type { IExcalidrawData } from './model';

/**
 * Volatile `appState` keys that Excalidraw uses at runtime but
 * should never be persisted to the `.excalidraw` file.
 */
const VOLATILE_APP_STATE_KEYS = [
  'collaborators',
  'cursorButton',
  'draggingElement',
  'editingElement',
  'resizingElement',
  'selectedElementIds',
  'selectionElement'
] as const;

/** Milliseconds to wait after save before accepting onChange again. */
const POST_SAVE_SUPPRESS_MS = 500;

/** Milliseconds to debounce Excalidraw onChange before writing to model. */
const CHANGE_DEBOUNCE_MS = 300;

/** Milliseconds after excalidrawAPI init before accepting onChange. */
const INIT_SETTLE_MS = 500;

/**
 * Strip volatile keys from an Excalidraw appState object.
 *
 * @param appState - The raw appState from Excalidraw's onChange callback.
 * @returns A new object with only persistable keys.
 */
function stripVolatileAppState(
  appState: Readonly<Record<string, unknown>>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(appState)) {
    if (!(VOLATILE_APP_STATE_KEYS as readonly string[]).includes(key)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Build an {@link IExcalidrawData} from raw Excalidraw scene data.
 *
 * Filters deleted elements and strips volatile appState keys.
 *
 * @param elements - All scene elements (may include deleted).
 * @param appState - Raw appState from Excalidraw.
 * @param files - Binary file attachments.
 * @returns A serializable {@link IExcalidrawData}.
 */
function buildExcalidrawData(
  elements: readonly Record<string, unknown>[],
  appState: Readonly<Record<string, unknown>>,
  files: Readonly<Record<string, unknown>>
): IExcalidrawData {
  return {
    type: 'excalidraw',
    version: 2,
    source: 'jupyterlab-excalidraw',
    elements: elements.filter((el: Record<string, unknown>) => !el['isDeleted']),
    appState: stripVolatileAppState(appState),
    files: files ?? {}
  };
}

/** Constructor options for {@link ExcalidrawWidget}. */
export interface IExcalidrawWidgetOptions {
  /** The document model backing this widget. */
  readonly model: ExcalidrawModel;
  /** Initial Excalidraw theme (`'light'` or `'dark'`). Defaults to `'light'`. */
  readonly theme?: string;
  /** Whether to show a background grid. */
  readonly gridMode?: boolean;
  /** Default canvas background color (CSS value). */
  readonly viewBackgroundColor?: string;
}

/**
 * Lumino widget that renders the Excalidraw React component.
 *
 * Manages the React lifecycle (mount/unmount), debounced model sync
 * on scene changes, and external model change handling (e.g. revert).
 */
export class ExcalidrawWidget extends Widget {
  private _model: ExcalidrawModel;
  private _excalidrawAPI: ExcalidrawImperativeAPI | null = null;
  private _root: Root | null = null;
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _isUpdatingModel = false;
  private _initialized = false;
  private _suppressed = false;
  private _theme: string;
  private _gridMode: boolean;
  private _viewBackgroundColor: string;
  private _ready = new Signal<this, void>(this);

  constructor(options: IExcalidrawWidgetOptions) {
    super();
    this._model = options.model;
    this._theme = options.theme ?? 'light';
    this._gridMode = options.gridMode ?? false;
    this._viewBackgroundColor = options.viewBackgroundColor ?? '';
    this.addClass('jp-ExcalidrawWidget');
    this._model.contentChanged.connect(this._onModelChanged, this);
  }

  /** The Excalidraw imperative API, or null if not yet initialized. */
  get excalidrawAPI(): ExcalidrawImperativeAPI | null {
    return this._excalidrawAPI;
  }

  /** Signal emitted once the Excalidraw API is ready and init has settled. */
  get ready(): ISignal<this, void> {
    return this._ready;
  }

  /** Set the Excalidraw theme. Triggers a React re-render. */
  set theme(value: string) {
    this._theme = value;
    this._renderReact();
  }

  /**
   * Temporarily suppress onChange handling for `ms` milliseconds.
   *
   * Called after save to prevent Excalidraw's post-save noise
   * (focus changes, internal state settling) from re-dirtying the model.
   *
   * @param ms - Duration in milliseconds to suppress.
   */
  suppressChanges(ms: number): void {
    this._suppressed = true;
    setTimeout(() => {
      this._suppressed = false;
      this._model.dirty = false;
    }, ms);
  }

  /**
   * Synchronously flush current Excalidraw scene state to the model.
   *
   * Cancels any pending debounce timer and reads directly from the
   * Excalidraw API. Called before save to guarantee model is up-to-date.
   */
  flushToModel(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
    if (!this._excalidrawAPI) {
      return;
    }
    this._isUpdatingModel = true;
    const data = buildExcalidrawData(
      this._excalidrawAPI.getSceneElements() as unknown as Record<string, unknown>[],
      this._excalidrawAPI.getAppState() as unknown as Record<string, unknown>,
      (this._excalidrawAPI.getFiles() ?? {}) as unknown as Record<string, unknown>
    );
    this._model.fromExcalidrawData(data);
    this._isUpdatingModel = false;
  }

  /** @override Mount React after the widget is attached to the DOM. */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this._renderReact();
  }

  /** @override Unmount React before the widget is detached. */
  protected onBeforeDetach(msg: Message): void {
    this._root?.unmount();
    this._root = null;
    super.onBeforeDetach(msg);
  }

  /**
   * Render (or re-render) the Excalidraw React component.
   *
   * Reads current model data for `initialData` and schedules
   * init settle after the API callback fires.
   */
  private _renderReact(): void {
    const data = this._model.toExcalidrawData();

    const element = React.createElement(Excalidraw, {
      excalidrawAPI: (api: ExcalidrawImperativeAPI) => {
        this._excalidrawAPI = api;
        setTimeout(() => {
          this._initialized = true;
          this._model.dirty = false;
          this._ready.emit(undefined);
        }, INIT_SETTLE_MS);
      },
      initialData: {
        elements: data.elements as unknown as readonly ExcalidrawElement[],
        appState: {
          ...(data.appState as unknown as Partial<AppState>),
          gridModeEnabled: this._gridMode,
          ...(this._viewBackgroundColor ? { viewBackgroundColor: this._viewBackgroundColor } : {})
        },
        files: data.files as unknown as BinaryFiles,
        scrollToContent: true
      },
      theme: this._theme as Theme,
      onChange: (
        elements: readonly ExcalidrawElement[],
        appState: AppState,
        files: BinaryFiles
      ) => {
        this._onExcalidrawChange(elements, appState, files);
      }
    });

    if (!this._root) {
      this._root = createRoot(this.node);
    }
    this._root.render(element);
  }

  /**
   * Handle Excalidraw's `onChange` callback.
   *
   * Debounces writes to the model to avoid excessive serialization.
   * Skipped during initialization, model updates, and post-save suppression.
   */
  private _onExcalidrawChange(
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles
  ): void {
    if (!this._initialized || this._isUpdatingModel || this._suppressed) {
      return;
    }

    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    this._debounceTimer = setTimeout(() => {
      this._isUpdatingModel = true;
      this._model.fromExcalidrawData(
        buildExcalidrawData(
          elements as unknown as Record<string, unknown>[],
          appState as unknown as Record<string, unknown>,
          files as unknown as Record<string, unknown>
        )
      );
      this._isUpdatingModel = false;
    }, CHANGE_DEBOUNCE_MS);
  }

  /**
   * Handle external model changes (e.g. file revert).
   *
   * Reloads the Excalidraw scene from the updated model content.
   */
  private _onModelChanged(): void {
    if (this._isUpdatingModel) {
      return;
    }
    if (this._excalidrawAPI) {
      const data = this._model.toExcalidrawData();
      this._excalidrawAPI.updateScene({
        elements: data.elements as unknown as ExcalidrawElement[],
        appState: data.appState as unknown as AppState
      });
      if (data.files && Object.keys(data.files).length > 0) {
        const files = data.files as unknown as BinaryFiles;
        this._excalidrawAPI.addFiles(Object.values(files));
      }
    }
  }

  /** @override Clean up timers, signals, and React root. */
  dispose(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._model.contentChanged.disconnect(this._onModelChanged, this);
    this._root?.unmount();
    this._root = null;
    super.dispose();
  }
}

/**
 * DocumentWidget wrapper for the Excalidraw editor.
 *
 * Intercepts Cmd/Ctrl+S at the DOM level (capture phase) to prevent
 * Excalidraw's built-in browser-download save. Instead, flushes the
 * current scene to the model and saves through JupyterLab's document
 * context.
 */
export class ExcalidrawDocumentWidget extends DocumentWidget<ExcalidrawWidget, ExcalidrawModel> {
  constructor(options: DocumentWidget.IOptions<ExcalidrawWidget, ExcalidrawModel>) {
    super(options);
    this.node.addEventListener('keydown', this._onKeyDown, true);
  }

  /** The inner {@link ExcalidrawWidget}. */
  get excalidrawWidget(): ExcalidrawWidget {
    return this.content;
  }

  /**
   * Capture-phase keydown handler.
   *
   * Intercepts Cmd/Ctrl+S before Excalidraw can trigger a browser
   * download, flushes model state, and saves via the document context.
   */
  private _onKeyDown = (e: KeyboardEvent): void => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      e.stopPropagation();
      this.content.flushToModel();
      this.context
        .save()
        .then(() => {
          this.content.suppressChanges(POST_SAVE_SUPPRESS_MS);
        })
        .catch((err: unknown) => {
          console.error('jupyterlab-excalidraw: save failed', err);
        });
    }
  };

  /** @override Remove keydown listener on dispose. */
  dispose(): void {
    this.node.removeEventListener('keydown', this._onKeyDown, true);
    super.dispose();
  }
}
