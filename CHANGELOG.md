# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Export to PNG/SVG via Command Palette
- Grid mode setting
- View background color setting

## [0.0.2] - 2026-03-25

### Added

- Full Excalidraw editor embedded in JupyterLab
- Native `.excalidraw` file type registration
- Create new drawings from Launcher and Command Palette
- Automatic dark/light theme sync with JupyterLab
- Save interception (Cmd/Ctrl+S routes through JupyterLab, not browser download)
- Dirty indicator and document lifecycle (save, revert)
- Custom Excalidraw icon in file browser and tabs
- Settings: `syncTheme`, `gridMode`, `viewBackgroundColor`
- ESLint + Prettier + ruff linting
- GitHub Actions CI (Python 3.10-3.13, lint, build)
- Dependabot for automated dependency updates

## [0.0.1] - 2026-03-25

### Added

- Initial PyPI placeholder release (name reservation)

[Unreleased]: https://github.com/goanpeca/jupyterlab-excalidraw/compare/v0.0.2...HEAD
[0.0.2]: https://github.com/goanpeca/jupyterlab-excalidraw/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/goanpeca/jupyterlab-excalidraw/releases/tag/v0.0.1
