## 1. Project Styling & Layout Refactoring

- [x] 1.1 Delete the unused leftover [src/App.css](file:///z:/node/vacab/src/App.css) stylesheet to prune repository bloat.
- [x] 1.2 Refactor `.glass` CSS and card properties in [src/index.css](file:///z:/node/vacab/src/index.css): remove `backdrop-filter: blur(16px)` and `-webkit-backdrop-filter`, and replace with flat solid HSL backgrounds (`background-color: var(--bg-card-solid)`) and thin borders (`border: 1px solid var(--border-color)`).
- [x] 1.3 Update `.bottom-nav` stylesheet inside [src/index.css](file:///z:/node/vacab/src/index.css) to completely eliminate dynamic blur effects and ensure robust rendering.
- [x] 1.4 Refactor generic `transition: all` style rules in [src/index.css](file:///z:/node/vacab/src/index.css) into explicit, performance-optimized, property-specific transitions (e.g. `transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease`).

## 2. Bandwidth & Resource Load Optimizations

- [x] 2.1 Prune the Google Fonts stylesheet link inside the `<head>` of [index.html](file:///z:/node/vacab/index.html) to request only 400, 600, and 700 weights instead of 5 weights, cutting initial network font load sizes.
- [x] 2.2 Validate font preconnecting and verify the app header loads fast with zero rendering blocking.

## 3. Zero-Dependency Vanilla Service Worker

- [x] 3.1 Create a highly optimized native [public/sw.js](file:///z:/node/vacab/public/sw.js) Service Worker that caches static assets (`/index.html`, `/assets/*`, Google Font URL preloads, SVG icons) on install, utilizing a cache-first offline strategy.
- [x] 3.2 Add stale cache eviction logic in [public/sw.js](file:///z:/node/vacab/public/sw.js) to prune old cache tables whenever a new cache version is activated.
- [x] 3.3 Add service worker registration block in [src/main.tsx](file:///z:/node/vacab/src/main.tsx) to safely register the `sw.js` script in production environments.

## 4. Hardware-Accelerated Swipe Gestures

- [x] 4.1 Update [src/components/LearnView.tsx](file:///z:/node/vacab/src/components/LearnView.tsx) to attach native React `onTouchStart`, `onTouchMove`, and `onTouchEnd` event listeners to the flashcard wrapper.
- [x] 4.2 Code touch movement tracking inside the swipe handlers, calculating horizontal offset delta and rotation and applying it directly to the card element via inline CSS `transform: translate3d(...) rotate(...)` rules.
- [x] 4.3 Implement swipe release boundary handling: if drag distance exceeds 100px threshold, trigger study validation callbacks (Mark as Correct/Incorrect) and slide out; otherwise, trigger a smooth spring-back snap.
- [x] 4.4 Build the application (`npx vite build`), verify production builds, and run automated type audits.
