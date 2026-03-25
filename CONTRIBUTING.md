# Contributing to jupyterlab-excalidraw

Thank you for your interest in contributing!

## Development Setup

```bash
# Clone the repo
git clone https://github.com/goanpeca/jupyterlab-excalidraw.git
cd jupyterlab-excalidraw

# Create a conda/venv environment with Python 3.10+ and Node 20+
conda create -n excalidraw python=3.13 nodejs=22 -y
conda activate excalidraw

# Install Python package in development mode
pip install -e ".[dev]"

# Install JS dependencies
jlpm install

# Build the extension
jlpm build

# Start JupyterLab in watch mode (auto-rebuild on TS changes)
jlpm watch
# In another terminal:
jupyter lab
```

## Running Checks

```bash
# Python
ruff check jupyterlab_excalidraw/
ruff format --check jupyterlab_excalidraw/
pytest

# TypeScript
jlpm build:lib
jlpm eslint:check
jlpm prettier:check

# Generate API docs
jlpm docs
```

## Project Structure

```
jupyterlab-excalidraw/
  src/                            # TypeScript source (JupyterLab frontend)
    index.ts                      # Plugin registration, factories, commands
    model.ts                      # ExcalidrawModel (document model)
    widget.ts                     # ExcalidrawWidget + ExcalidrawDocumentWidget
    icons.ts                      # Excalidraw LabIcon SVG
  style/                          # CSS styles
  schema/                         # JupyterLab settings schema
  jupyterlab_excalidraw/          # Python package
    __init__.py                   # Labextension registration
    _version.py                   # Version from package.json
    tests/                        # pytest test suite
```

## Key Architecture

- **DocumentModel** (`model.ts`): Extends JupyterLab's `DocumentModel`. Stores `.excalidraw` JSON as text. `toExcalidrawData()` / `fromExcalidrawData()` handle serialization.
- **ExcalidrawWidget** (`widget.ts`): Lumino widget wrapping the React `<Excalidraw>` component. Manages debounced model sync, theme changes, and React lifecycle.
- **ExcalidrawDocumentWidget** (`widget.ts`): Intercepts Cmd/Ctrl+S to flush model before save (prevents Excalidraw's built-in browser download).
- **Plugin** (`index.ts`): Registers file type, factories, commands, launcher entry, theme sync, settings.

## Submitting Changes

1. Fork the repo and create a feature branch
2. Make changes with tests
3. Run all checks (Python + TypeScript)
4. Submit a pull request
