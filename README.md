# jupyterlab-excalidraw

[![PyPI version](https://img.shields.io/pypi/v/jupyterlab-excalidraw.svg)](https://pypi.org/project/jupyterlab-excalidraw/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/pypi/pyversions/jupyterlab-excalidraw.svg)](https://pypi.org/project/jupyterlab-excalidraw/)
[![JupyterLab](https://img.shields.io/badge/JupyterLab-4.x-orange?logo=jupyter)](https://jupyterlab.readthedocs.io/)

A JupyterLab 4 extension that lets you create and edit [Excalidraw](https://excalidraw.com/) drawings directly in JupyterLab.

![Excalidraw in JupyterLab](https://raw.githubusercontent.com/goanpeca/jupyterlab-excalidraw/main/docs/images/excalidraw.png)

## Features

- Open and edit `.excalidraw` files natively in JupyterLab
- Create new drawings from the Launcher or Command Palette
- Full Excalidraw editor — shapes, arrows, text, images, freehand drawing
- Export to PNG and SVG via Command Palette
- Automatic dark/light theme sync with JupyterLab
- Configurable grid mode and background color
- Standard document lifecycle — save (Cmd/Ctrl+S), revert, dirty indicator
- Custom Excalidraw icon in file browser, tabs, and Launcher

## Requirements

- JupyterLab >= 4.0.0, < 5

## Installation

```bash
pip install jupyterlab-excalidraw
```

## Development

```bash
# Clone the repo
git clone https://github.com/goanpeca/jupyterlab-excalidraw.git
cd jupyterlab-excalidraw

# Install in development mode
pip install -e ".[dev]"
jlpm install
jlpm build

# Watch mode (auto-rebuild on changes)
jlpm watch
# In another terminal:
jupyter lab
```

### Build commands

| Command | Description |
|---|---|
| `jlpm build` | Build TypeScript + labextension (dev) |
| `jlpm build:prod` | Clean build for production |
| `jlpm build:lib` | Build TypeScript only |
| `jlpm build:labextension` | Build labextension only |
| `jlpm clean` | Remove build artifacts |
| `jlpm watch` | Watch mode for development |

### Python checks

```bash
ruff check jupyterlab_excalidraw/
ruff format --check jupyterlab_excalidraw/
```

## How it works

The extension registers a custom `DocumentWidget` and `DocumentModel` with JupyterLab's `DocumentRegistry`. The widget embeds the [`@excalidraw/excalidraw`](https://www.npmjs.com/package/@excalidraw/excalidraw) React component inside a Lumino widget. File I/O uses JupyterLab's built-in `ContentsManager` — `.excalidraw` files are plain JSON.

Cmd/Ctrl+S is intercepted at the widget level to prevent Excalidraw's built-in browser download and instead route saves through JupyterLab's document context.

## License

MIT
