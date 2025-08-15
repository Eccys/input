# Declarative Web Input Framework

A lightweight, zero-dependency framework for defining complex, high-level input events like multi-key shortcuts and mouse gestures directly in your HTML or with a simple JavaScript configuration.

## Key Features

- **Declarative API**: Define complex shortcuts directly in your HTML using `data-*` attributes.
- **Keyboard Support**: Recognizes both chords (`Ctrl+S`) and sequences (`g` then `i`).
- **Gesture Recognition**: Built-in support for simple mouse gesture recognition (e.g., drawing shapes).
- **Extensible**: Easily add your own custom recognizers for new input types.
- **Zero Dependencies**: Written in plain, modern JavaScript.

## Quick Start

1.  **Installation**

    ```sh
    # Clone the repository
    git clone https://github.com/Eccys/input.git
    cd input
    ```

2.  **Declarative Usage (HTML)**

    The easiest way to use the framework is by adding `data-*` attributes to your HTML elements. The framework will automatically discover and wire them up.

    ```html
    <button data-input-action="save" data-input-shortcut="Control+s">Save</button>
    <button data-input-action="inbox" data-input-shortcut="g i">Inbox</button>
    ```

    Then, simply initialize the manager in your JavaScript:

    ```javascript
    import { InputManager } from './src/index.js';

    const manager = new InputManager(document.body);
    manager.start();
    ```

3.  **Programmatic Usage (JavaScript)**

    You can also define all your inputs programmatically.

    ```javascript
    import { InputManager } from './src/index.js';
    import KeyboardRecognizer from './src/recognizers/Keyboard.js';
    import GestureRecognizer from './src/recognizers/Gesture.js';

    const manager = new InputManager(document.body);

    // Define keyboard actions
    const keyboard = new KeyboardRecognizer({
        'save': 'Control+s',
        'inbox': 'g i',
    });

    // Define gesture actions with template paths
    const z_gesture = [[0,0], [100,0], [0,100], [100,100]];
    const gesture = new GestureRecognizer({
        'undo': z_gesture,
    });

    manager.addRecognizer(keyboard);
    manager.addRecognizer(gesture);
    manager.start();
    ```

4.  **Listening for Events**

    The framework dispatches a `input-recognized` custom event on the target element. You can listen for it to trigger your application's logic.

    ```javascript
    document.body.addEventListener('input-recognized', (e) => {
        if (e.detail.action === 'save') {
            console.log('Saving project...');
        }
    });
    ```

## API

-   `InputManager(element)`: The main class. Attaches to a root DOM element.
-   `.addRecognizer(recognizer)`: Adds a recognizer instance (e.g., `KeyboardRecognizer`).
-   `.start()`: Begins listening for events and discovers declarative actions.
-   `.stop()`: Stops listening for all events.
-   `.dispatch(action, detail)`: Programmatically trigger an action.

See the `examples/` directory for a live demo.
