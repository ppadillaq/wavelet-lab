# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-09

### Added

- Initial Flask application for interactive signal exploration and wavelet analysis.
- EarthScope Explorer with dynamic network, station, and channel selection, seismic waveform retrieval, and interactive visualization.
- Continuous Wavelet Transform (CWT) analysis with Morlet and Mexican Hat wavelets and configurable parameters.
- USGS earthquake catalogue with magnitude filters and configurable result limits.
- Water Data Explorer with USGS Water Data API integration, station selection, historical streamflow retrieval, and interactive hydrograph visualization.
- Signal Processing Lab with an initial interface for wavelet compression and CWT analysis.
- Signal transfer from EarthScope and Water Data Explorer to the shared Signal Processing Lab.
- Redesigned homepage with navigation to the available data explorers.
- Project overview and development roadmap in the README.
- Production Python dependencies and API key support for the USGS water data service.
- Integrated EarthScope and Water Data Explorer with the shared Signal Processing Lab.

[0.1.0]: https://github.com/ppadillaq/wavelet-lab/releases/tag/v0.1.0