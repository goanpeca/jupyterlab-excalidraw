"""Tests for jupyterlab-excalidraw extension registration and model logic."""

from __future__ import annotations

import json
from pathlib import Path

import pytest


class TestExtensionRegistration:
    """Verify the extension registers correctly with JupyterLab."""

    def test_version_importable(self):
        """Version string is importable and non-empty."""
        from jupyterlab_excalidraw import __version__

        assert isinstance(__version__, str)
        assert len(__version__) > 0

    def test_labextension_paths(self):
        """Labextension paths point to correct directories."""
        from jupyterlab_excalidraw import _jupyter_labextension_paths

        paths = _jupyter_labextension_paths()
        assert len(paths) == 1
        assert paths[0]["src"] == "labextension"
        assert paths[0]["dest"] == "jupyterlab-excalidraw"


class TestSchemaValidation:
    """Verify the settings schema is valid JSON with required fields."""

    @pytest.fixture()
    def schema(self):
        """Load the plugin schema."""
        schema_path = Path(__file__).parent.parent.parent / "schema" / "plugin.json"
        with open(schema_path) as f:
            return json.load(f)

    def test_schema_is_valid_json(self, schema):
        """Schema file is parseable JSON."""
        assert isinstance(schema, dict)

    def test_schema_has_title(self, schema):
        """Schema declares a title."""
        assert "title" in schema
        assert schema["title"] == "Excalidraw"

    def test_schema_has_properties(self, schema):
        """Schema declares at least one setting."""
        assert "properties" in schema
        assert len(schema["properties"]) > 0

    def test_sync_theme_setting_exists(self, schema):
        """The ``syncTheme`` boolean setting is present."""
        props = schema["properties"]
        assert "syncTheme" in props
        assert props["syncTheme"]["type"] == "boolean"
        assert props["syncTheme"]["default"] is True

    def test_grid_mode_setting_exists(self, schema):
        """The ``gridMode`` boolean setting is present."""
        props = schema["properties"]
        assert "gridMode" in props
        assert props["gridMode"]["type"] == "boolean"

    def test_view_background_color_setting_exists(self, schema):
        """The ``viewBackgroundColor`` string setting is present."""
        props = schema["properties"]
        assert "viewBackgroundColor" in props
        assert props["viewBackgroundColor"]["type"] == "string"


class TestInstallJson:
    """Verify install.json is valid and references the correct package."""

    @pytest.fixture()
    def install_data(self):
        """Load install.json."""
        install_path = Path(__file__).parent.parent.parent / "install.json"
        with open(install_path) as f:
            return json.load(f)

    def test_install_json_exists(self, install_data):
        """install.json is parseable."""
        assert isinstance(install_data, dict)

    def test_package_manager_is_python(self, install_data):
        """Extension installs via pip."""
        assert install_data.get("packageManager") == "python"

    def test_package_name_matches(self, install_data):
        """Package name in install.json matches the project."""
        assert install_data.get("packageName") == "jupyterlab-excalidraw"


class TestPackageJson:
    """Verify package.json metadata is consistent."""

    @pytest.fixture()
    def pkg(self):
        """Load package.json."""
        pkg_path = Path(__file__).parent.parent.parent / "package.json"
        with open(pkg_path) as f:
            return json.load(f)

    def test_name_matches(self, pkg):
        """Package name is ``jupyterlab-excalidraw``."""
        assert pkg["name"] == "jupyterlab-excalidraw"

    def test_has_jupyterlab_key(self, pkg):
        """The ``jupyterlab`` config key is present."""
        assert "jupyterlab" in pkg
        assert pkg["jupyterlab"]["extension"] is True

    def test_excalidraw_dependency(self, pkg):
        """Excalidraw is a declared dependency."""
        assert "@excalidraw/excalidraw" in pkg.get("dependencies", {})

    def test_has_lint_scripts(self, pkg):
        """ESLint and Prettier scripts are configured."""
        scripts = pkg.get("scripts", {})
        assert "eslint:check" in scripts
        assert "prettier:check" in scripts

    def test_has_build_scripts(self, pkg):
        """Core build scripts are configured."""
        scripts = pkg.get("scripts", {})
        assert "build" in scripts
        assert "build:lib" in scripts
        assert "build:labextension" in scripts
