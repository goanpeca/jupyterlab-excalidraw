"""jupyterlab-excalidraw: JupyterLab extension for Excalidraw drawings."""

from __future__ import annotations

from jupyterlab_excalidraw._version import __version__  # noqa: F401


def _jupyter_labextension_paths() -> list[dict[str, str]]:
    """Register the frontend labextension."""
    return [{"src": "labextension", "dest": "jupyterlab-excalidraw"}]
