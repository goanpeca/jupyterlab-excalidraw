/**
 * jupyterlab-excalidraw: JupyterLab 4 extension for Excalidraw drawings.
 *
 * Registers a custom `DocumentWidget` and `DocumentModel` with
 * JupyterLab's `DocumentRegistry`, enabling native open/edit of
 * `.excalidraw` files with the full Excalidraw editor.
 *
 * @module index
 */
import { ILayoutRestorer, JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { IThemeManager, WidgetTracker } from '@jupyterlab/apputils';
import { ABCWidgetFactory, DocumentRegistry } from '@jupyterlab/docregistry';
import { ILauncher } from '@jupyterlab/launcher';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { ExcalidrawModel } from './model';
import { ExcalidrawWidget, ExcalidrawDocumentWidget } from './widget';
import { excalidrawIcon } from './icons';

/** Plugin identifier used for settings and registration. */
const PLUGIN_ID = 'jupyterlab-excalidraw:plugin';

/** Display name for the widget factory. */
const FACTORY_NAME = 'Excalidraw';

/** Internal name for the registered file type. */
const FILE_TYPE = 'excalidraw';

/**
 * Widget factory that creates {@link ExcalidrawDocumentWidget} instances
 * for `.excalidraw` files.
 */
class ExcalidrawWidgetFactory extends ABCWidgetFactory<ExcalidrawDocumentWidget, ExcalidrawModel> {
  private _theme = 'light';

  /** Set the theme applied to newly created widgets. */
  set theme(value: string) {
    this._theme = value;
  }

  /** @override Create a new Excalidraw document widget for the given context. */
  /** Grid mode passed to new widgets. */
  gridMode = false;

  /** Default background color passed to new widgets. */
  viewBackgroundColor = '';

  protected createNewWidget(
    context: DocumentRegistry.IContext<ExcalidrawModel>
  ): ExcalidrawDocumentWidget {
    const content = new ExcalidrawWidget({
      model: context.model,
      theme: this._theme,
      gridMode: this.gridMode,
      viewBackgroundColor: this.viewBackgroundColor
    });
    return new ExcalidrawDocumentWidget({ content, context });
  }
}

/**
 * Model factory that creates {@link ExcalidrawModel} instances.
 *
 * Registered with the `DocumentRegistry` so JupyterLab knows
 * how to create document models for `.excalidraw` files.
 */
class ExcalidrawModelFactory implements DocumentRegistry.IModelFactory<ExcalidrawModel> {
  get name(): string {
    return 'excalidraw-model';
  }
  get contentType(): 'file' {
    return 'file';
  }
  get fileFormat(): 'text' {
    return 'text';
  }
  get isDisposed(): boolean {
    return this._isDisposed;
  }
  dispose(): void {
    this._isDisposed = true;
  }
  preferredLanguage(_path: string): string {
    return 'json';
  }

  /**
   * Create a new {@link ExcalidrawModel}.
   *
   * @param options - Model options provided by the document context,
   *   including the shared model for collaborative editing support.
   */
  createNew(options?: DocumentRegistry.IModelOptions): ExcalidrawModel {
    return new ExcalidrawModel(
      options as DocumentRegistry.IModelOptions<DocumentRegistry.ICodeModel['sharedModel']>
    );
  }

  private _isDisposed = false;
}

/**
 * The main JupyterLab plugin.
 *
 * Registers the `.excalidraw` file type, widget/model factories,
 * theme sync, settings, launcher entry, and layout restoration.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  autoStart: true,
  requires: [],
  optional: [ILayoutRestorer, IThemeManager, ILauncher, ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    restorer: ILayoutRestorer | null,
    themeManager: IThemeManager | null,
    launcher: ILauncher | null,
    settingRegistry: ISettingRegistry | null
  ): void => {
    const { commands, docRegistry } = app;

    // --- Model factory ---
    docRegistry.addModelFactory(new ExcalidrawModelFactory());

    // --- File type ---
    docRegistry.addFileType({
      name: FILE_TYPE,
      displayName: 'Excalidraw Drawing',
      mimeTypes: ['application/json'],
      extensions: ['.excalidraw'],
      fileFormat: 'text',
      contentType: 'file',
      icon: excalidrawIcon
    });

    // --- Widget factory ---
    const factory = new ExcalidrawWidgetFactory({
      name: FACTORY_NAME,
      label: 'Excalidraw',
      fileTypes: [FILE_TYPE],
      defaultFor: [FILE_TYPE],
      modelName: 'excalidraw-model'
    });
    docRegistry.addWidgetFactory(factory);

    // --- Widget tracker (for layout restoration) ---
    const tracker = new WidgetTracker<ExcalidrawDocumentWidget>({
      namespace: 'jupyterlab-excalidraw'
    });

    factory.widgetCreated.connect((_sender, widget) => {
      widget.title.icon = excalidrawIcon;
      tracker.add(widget);
    });

    if (restorer) {
      restorer.restore(tracker, {
        command: 'docmanager:open',
        args: (widget: ExcalidrawDocumentWidget) => ({
          path: widget.context.path,
          factory: FACTORY_NAME
        }),
        name: (widget: ExcalidrawDocumentWidget) => widget.context.path
      });
    }

    // --- Theme sync ---
    let syncTheme = true;

    const updateTheme = (): void => {
      if (!syncTheme || !themeManager) {
        return;
      }
      const theme = themeManager.isLight(themeManager.theme ?? '') ? 'light' : 'dark';
      factory.theme = theme;
      tracker.forEach((widget: ExcalidrawDocumentWidget) => {
        widget.excalidrawWidget.theme = theme;
      });
    };

    if (themeManager) {
      themeManager.themeChanged.connect(updateTheme);
      updateTheme();
    }

    // --- Settings ---
    let gridMode = false;
    let viewBackgroundColor = '';

    const applySettings = (settings: ISettingRegistry.ISettings): void => {
      syncTheme = settings.get('syncTheme').composite as boolean;
      gridMode = settings.get('gridMode').composite as boolean;
      viewBackgroundColor = settings.get('viewBackgroundColor').composite as string;
      factory.gridMode = gridMode;
      factory.viewBackgroundColor = viewBackgroundColor;
      updateTheme();
    };

    if (settingRegistry) {
      settingRegistry
        .load(PLUGIN_ID)
        .then(settings => {
          applySettings(settings);
          settings.changed.connect(() => {
            applySettings(settings);
          });
        })
        .catch((reason: unknown) => {
          console.warn('Failed to load excalidraw settings:', reason);
        });
    }

    // --- New drawing command ---
    const CREATE_COMMAND = 'excalidraw:create-new';
    commands.addCommand(CREATE_COMMAND, {
      label: 'New Excalidraw Drawing',
      icon: excalidrawIcon,
      execute: async (args: Record<string, unknown>): Promise<void> => {
        const cwd = (args['cwd'] as string) || '';
        const model = await app.serviceManager.contents.newUntitled({
          path: cwd,
          type: 'file',
          ext: '.excalidraw'
        });
        await commands.execute('docmanager:open', {
          path: model.path,
          factory: FACTORY_NAME
        });
      }
    });

    // --- Launcher entry ---
    if (launcher) {
      launcher.add({
        command: CREATE_COMMAND,
        category: 'Other',
        rank: 10
      });
    }

    // --- Export to PNG command ---
    commands.addCommand('excalidraw:export-png', {
      label: 'Export Drawing as PNG',
      icon: excalidrawIcon,
      isEnabled: () => tracker.currentWidget !== null,
      execute: async (): Promise<void> => {
        const widget = tracker.currentWidget;
        if (!widget) {
          return;
        }
        const api = widget.excalidrawWidget.excalidrawAPI;
        if (!api) {
          return;
        }
        const { exportToBlob } = await import('@excalidraw/excalidraw');
        const elements = api.getSceneElements();
        const appState = api.getAppState();
        const files = api.getFiles();
        const blob = await exportToBlob({
          elements,
          appState: { ...appState, exportWithDarkMode: appState.theme === 'dark' },
          files,
          mimeType: 'image/png',
          getDimensions: () => ({ width: 1920, height: 1080, scale: 2 })
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const baseName = widget.context.path.replace(/\.excalidraw$/, '');
        a.href = url;
        a.download = `${baseName}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });

    // --- Export to SVG command ---
    commands.addCommand('excalidraw:export-svg', {
      label: 'Export Drawing as SVG',
      icon: excalidrawIcon,
      isEnabled: () => tracker.currentWidget !== null,
      execute: async (): Promise<void> => {
        const widget = tracker.currentWidget;
        if (!widget) {
          return;
        }
        const api = widget.excalidrawWidget.excalidrawAPI;
        if (!api) {
          return;
        }
        const { exportToSvg } = await import('@excalidraw/excalidraw');
        const elements = api.getSceneElements();
        const appState = api.getAppState();
        const files = api.getFiles();
        const svg = await exportToSvg({
          elements,
          appState: { ...appState, exportWithDarkMode: appState.theme === 'dark' },
          files
        });
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const baseName = widget.context.path.replace(/\.excalidraw$/, '');
        a.href = url;
        a.download = `${baseName}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }
};

export default plugin;
