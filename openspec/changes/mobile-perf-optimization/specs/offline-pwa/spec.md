## ADDED Requirements

### Requirement: Service Worker Registration
The system SHALL register a custom vanilla Service Worker `sw.js` on-demand in production environment to enable Progressive Web App (PWA) offline capabilities.

#### Scenario: Registering the service worker on load
- **WHEN** the application boots in production mode
- **THEN** the system SHALL check if service workers are supported by the browser and register `sw.js` located in the root public directory

### Requirement: Local-First Asset Caching
The Service Worker SHALL implement a robust local caching strategy. Upon installation, it SHALL cache all vital structural assets (index.html, JS, CSS, preloaded fonts, and SVG icons).

#### Scenario: Caching vital files for offline usage
- **WHEN** the Service Worker's `install` event is triggered
- **THEN** the Service Worker SHALL open the primary cache database, fetch the list of production assets, and cache them to allow zero-network boot-up

### Requirement: Cache First Offline Fallback
The Service Worker SHALL intercept all resource requests and serve static assets directly from the local cache database to maximize response speeds, only requesting from the network if a cache miss occurs.

#### Scenario: App boots up with no internet connection
- **WHEN** the user opens the application while offline
- **THEN** the Service Worker SHALL intercept the request for static files and serve the pre-cached local resources, rendering the page instantly

### Requirement: Automatic Stale Cache Eviction
The Service Worker SHALL automatically clear obsolete caches whenever a new version of the application is installed.

#### Scenario: Installing a new build
- **WHEN** the Service Worker is activated with a new cache version identifier
- **THEN** the system SHALL programmatically identify all old cache keys, delete them from the browser's storage, and trigger a silent reload to activate the new version
