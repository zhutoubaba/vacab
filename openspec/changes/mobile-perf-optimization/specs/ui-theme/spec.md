## MODIFIED Requirements

### Requirement: Bright and Dark Themes
The system SHALL support two visual themes: a Bright Theme (warm cream, peach, and soft teal colors) and a Dark Theme (slate, charcoal, and neon teal colors). The system SHALL apply the selected theme globally across all screens and components. To ensure optimal performance on mobile devices, the theme SHALL use solid opaque backgrounds and fine borders instead of dynamic backdrop blur filters, and transitions MUST target explicit properties rather than using generic "all" transitions.

#### Scenario: User toggles theme
- **WHEN** the user clicks the theme toggle button in the header
- **THEN** the system SHALL smoothly transition the entire visual interface to the opposite theme (Bright to Dark, or Dark to Bright) by swapping CSS variables on the root document using explicit GPU-accelerated transition properties

### Requirement: Theme Persistence
The system MUST persist the user's selected theme across browser sessions and reloads.

#### Scenario: Persisting theme across page reloads
- **WHEN** the user reloads the application
- **THEN** the system SHALL check localStorage for a saved theme preference, fall back to the system's preferred color scheme (matchMedia) if none is found, and apply the correct theme before rendering the UI to prevent screen flickering
