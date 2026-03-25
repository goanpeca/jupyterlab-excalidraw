"""Tests for jupyterlab-excalidraw extension registration."""

from __future__ import annotations


def test_version_importable():
    """Verify the package version is importable."""
    from jupyterlab_excalidraw import __version__

    assert isinstance(__version__, str)
    assert len(__version__) > 0


def test_labextension_paths():
    """Verify labextension paths are returned correctly."""
    from jupyterlab_excalidraw import _jupyter_labextension_paths

    paths = _jupyter_labextension_paths()
    assert len(paths) == 1
    assert paths[0]["src"] == "labextension"
    assert paths[0]["dest"] == "jupyterlab-excalidraw"
