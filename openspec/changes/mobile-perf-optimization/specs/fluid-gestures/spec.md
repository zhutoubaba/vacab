## ADDED Requirements

### Requirement: Native Fluid Pointer Swiping
The flashcard Learn view SHALL implement hardware-accelerated touch swipe gestures using React pointer/touch event bindings.

#### Scenario: Swiping a flashcard left or right
- **WHEN** the user initiates a horizontal swipe on the active flashcard card
- **THEN** the system SHALL calculate the touch displacement and bind the offset to the card's style using a GPU-accelerated inline translation transform

### Requirement: Swipe Trigger Threshold
The system SHALL evaluate the swipe displacement upon release. If the displacement exceeds a set threshold (e.g. 100px), it SHALL trigger a card navigation action (e.g., swipe left to mark correct, swipe right to mark incorrect).

#### Scenario: Releasing swipe above threshold
- **WHEN** the user releases the touch event after moving the card past 100px
- **THEN** the system SHALL trigger the navigation event (Next/Prev/Mark) and smoothly animate the card out of the screen using hardware-accelerated CSS keyframes

#### Scenario: Releasing swipe below threshold
- **WHEN** the user releases the touch event after moving the card less than 100px
- **THEN** the system SHALL trigger a snap-back animation that smoothly returns the card to its center position (`transform: translate3d(0, 0, 0)`)
