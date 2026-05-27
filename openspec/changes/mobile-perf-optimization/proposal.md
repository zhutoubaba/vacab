## Why

Mobile web applications, especially when run on budget or older mobile devices, can suffer from performance lags due to heavy GPU filters (like dynamic CSS backdrops), excessive web font loading overhead, lack of native-feeling swiping gestures, and redundant resources. Optimizing these areas will result in a lightweight, instantly loading, highly responsive vocabulary application that achieves a 60fps/120fps fluid feel with zero build-size bloat and works completely offline.

## What Changes

- **GPU Rendering Optimization**: Remove expensive CSS `backdrop-filter: blur(...)` and `-webkit-backdrop-filter` rules, replacing them with flat solid HSL variables (`--bg-card-solid`) and clean borders. Refactor generic `transition: all` rules to target specific properties explicitly.
- **Physical Clean-up**: Delete the unused, leftover [src/App.css](file:///z:/node/vacab/src/App.css) stylesheet to reduce repository bloat.
- **Bandwidth Font Pruning**: Reduce Google Fonts preloads in [index.html](file:///z:/node/vacab/index.html) from five weights down to three essential weights (400, 600, 700), lowering initial resource downloads by ~40%.
- **Zero-Dependency Hand-Crafted PWA**: Add a hand-written Vanilla Service Worker (`sw.js`) inside [public/](file:///z:/node/vacab/public/) and register it in [src/main.tsx](file:///z:/node/vacab/src/main.tsx) to cache all vital assets, providing instant offline loading with zero bundle overhead.
- **High-Performance Native Gesture Navigation**: Implement native CSS-based GPU-accelerated touch swipe handlers (`onTouchStart`, `onTouchMove`, `onTouchEnd`) inside [src/components/LearnView.tsx](file:///z:/node/vacab/src/components/LearnView.tsx) to provide smooth, natural card swiping without heavy external motion libraries.

## Capabilities

### New Capabilities
- `offline-pwa`: Implements a hand-coded zero-dependency service worker caching strategy for complete offline access and local-first reliability.
- `fluid-gestures`: Adds lightweight, native touch gesture handlers for GPU-accelerated micro-animations on mobile devices.

### Modified Capabilities
- `ui-theme`: Streamline styling, replace heavy blur effects with high-contrast borders and solid backdrops, and optimize transition rendering paths.

## Impact

- **CSS & HTML Shell**: Swapping out blur styles in [src/index.css](file:///z:/node/vacab/src/index.css) and reducing font weight loads in [index.html](file:///z:/node/vacab/index.html).
- **Vite Public assets**: Adding a new `public/sw.js` file for local-first service worker caching.
- **Main React bootstrap**: Registering the service worker inside [src/main.tsx](file:///z:/node/vacab/src/main.tsx) conditionally for production builds.
- **Learn View Component**: Upgrading the 3D card layout in [src/components/LearnView.tsx](file:///z:/node/vacab/src/components/LearnView.tsx) with native touch-swipe hooks.
