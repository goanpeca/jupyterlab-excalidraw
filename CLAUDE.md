# CLAUDE.md — jupyterlab-excalidraw

## Project Overview

JupyterLab 4 extension that embeds the [Excalidraw](https://excalidraw.com/) whiteboard editor as a native document widget. Users can create, open, edit, and save `.excalidraw` files directly in JupyterLab.

## Repository Structure

```
jupyterlab-excalidraw/
├── src/                           # TypeScript frontend source
│   ├── index.ts                   # Plugin registration, factories, commands, settings
│   ├── model.ts                   # ExcalidrawModel (DocumentModel subclass)
│   ├── widget.ts                  # ExcalidrawWidget + ExcalidrawDocumentWidget
│   └── icons.ts                   # Excalidraw LabIcon SVG
├── style/                         # CSS styles
│   ├── base.css                   # Widget styling
│   └── index.css                  # Style entry point
├── schema/plugin.json             # JupyterLab settings schema
├── jupyterlab_excalidraw/         # Python package
│   ├── __init__.py                # Labextension registration
│   ├── _version.py                # Version (auto-synced from package.json)
│   └── tests/                     # pytest test suite
├── pyproject.toml                 # Python build config (hatchling + hatch-jupyter-builder)
├── package.json                   # Node build config (TypeScript + webpack)
├── tsconfig.json                  # TypeScript compiler config (strict mode)
└── .github/workflows/             # CI + publish workflows
```

## Key Architecture Decisions

- **DocumentWidget pattern** — uses JupyterLab's `DocumentRegistry` with custom `IModelFactory` and `ABCWidgetFactory`, not a standalone panel
- **React inside Lumino** — `ExcalidrawWidget` uses `react-dom/client.createRoot()` to mount the React Excalidraw component inside a Lumino `Widget`
- **Save interception** — Cmd/Ctrl+S is captured at the DOM level (capture phase) to prevent Excalidraw's built-in browser download and route saves through JupyterLab's `context.save()`
- **Debounced model sync** — Excalidraw's `onChange` fires frequently; writes to the model are debounced (300ms) to avoid excessive serialization
- **Volatile state stripping** — Runtime-only `appState` keys (collaborators, dragging, selection) are stripped before persisting
- **Version from package.json** — Python version is auto-synced from `package.json` via `hatch-nodejs-version`

## Development Commands

```bash
# Install in dev mode
pip install -e ".[dev]"
jlpm install
jlpm build

# TypeScript
jlpm build:lib            # Compile TS
jlpm eslint:check         # Lint
jlpm prettier:check       # Format check
jlpm docs                 # Generate API docs

# Python
ruff check jupyterlab_excalidraw/
ruff format --check jupyterlab_excalidraw/
pytest                    # Run tests

# Watch mode
jlpm watch                # Auto-rebuild TS on changes
```

## Code Conventions

- TypeScript: strict mode, no `any` (use proper Excalidraw types from `@excalidraw/excalidraw/dist/types/`)
- Python: ruff lint + format, numpy-style docstrings, `from __future__ import annotations`
- All settings go in `schema/plugin.json` — read them in `index.ts` via `ISettingRegistry`
- CSS class prefix: `jp-Excalidraw*`

## Important Gotchas

- Excalidraw fires `onChange` during initialization — the `INIT_SETTLE_MS` delay prevents false dirty marking
- After save, `suppressChanges()` blocks `onChange` for 500ms to prevent Excalidraw's post-save noise from re-dirtying
- `@excalidraw/excalidraw` requires React 18 — cannot upgrade to React 19 while JupyterLab 4 depends on React 18
- TypeScript must stay at ~5.5 — JupyterLab builder requires it
- The `.excalidraw` file format is plain JSON with `type: "excalidraw"` and `version: 2`
