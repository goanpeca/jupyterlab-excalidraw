/**
 * Document model for `.excalidraw` files.
 *
 * Extends JupyterLab's `DocumentModel` with typed accessors
 * for the Excalidraw JSON format.
 *
 * @module model
 */
import { DocumentModel } from '@jupyterlab/docregistry';

/**
 * Root-level shape of a `.excalidraw` JSON file.
 *
 * @see https://docs.excalidraw.com/docs/codebase/json-schema
 */
export interface IExcalidrawData {
  /** Fixed identifier — always `"excalidraw"`. */
  readonly type: 'excalidraw';
  /** Schema version (currently `2`). */
  readonly version: number;
  /** Origin that produced this file. */
  readonly source: string;
  /** All drawing elements (rectangles, arrows, text, etc.). */
  readonly elements: ReadonlyArray<Record<string, unknown>>;
  /** Editor/canvas state (background, grid, zoom, etc.). */
  readonly appState: Readonly<Record<string, unknown>>;
  /** Binary file data for embedded images keyed by file ID. */
  readonly files: Readonly<Record<string, unknown>>;
}

/** The current Excalidraw schema version. */
const SCHEMA_VERSION = 2;

/** The `source` field written into files created by this extension. */
const SOURCE_ID = 'jupyterlab-excalidraw';

/**
 * Create a blank Excalidraw document with no elements.
 *
 * @returns A valid {@link IExcalidrawData} with empty elements/appState/files.
 */
export function createEmptyExcalidrawData(): IExcalidrawData {
  return {
    type: 'excalidraw',
    version: SCHEMA_VERSION,
    source: SOURCE_ID,
    elements: [],
    appState: {},
    files: {}
  };
}

/**
 * Document model for `.excalidraw` files.
 *
 * Content is stored as a JSON string via the inherited
 * `toString()` / `fromString()` methods.
 *
 * The typed helpers {@link toExcalidrawData} and {@link fromExcalidrawData}
 * provide safe serialization/deserialization between the string
 * representation and the structured {@link IExcalidrawData} interface.
 */
export class ExcalidrawModel extends DocumentModel {
  /**
   * Parse the current model content into an {@link IExcalidrawData} object.
   *
   * @returns Parsed data, or empty data if content is blank/invalid.
   */
  toExcalidrawData(): IExcalidrawData {
    const raw = this.toString();
    if (!raw || raw.trim() === '') {
      return createEmptyExcalidrawData();
    }
    try {
      return JSON.parse(raw) as IExcalidrawData;
    } catch {
      return createEmptyExcalidrawData();
    }
  }

  /**
   * Serialize an {@link IExcalidrawData} object into the model.
   *
   * This updates the underlying shared model and marks the document dirty.
   *
   * @param data - The Excalidraw data to persist.
   */
  fromExcalidrawData(data: IExcalidrawData): void {
    this.fromString(JSON.stringify(data, null, 2));
  }
}
