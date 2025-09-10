class InputManager {
    constructor(element) {
        this.element = element;
        this.recognizers = [];
        this.isListening = false;

        this.eventListeners = {
            'keydown': this.handleEvent.bind(this),
            'keyup': this.handleEvent.bind(this),
            'mousedown': this.handleEvent.bind(this),
            'mouseup': this.handleEvent.bind(this),
            'mousemove': this.handleEvent.bind(this),
        };
    }

    addRecognizer(recognizer) {
        this.recognizers.push(recognizer);
        recognizer.manager = this;
    }

    start() {
        if (this.isListening) return;
        this.discoverDeclarativeActions();
        for (const eventType in this.eventListeners) {
            this.element.addEventListener(eventType, this.eventListeners[eventType], { capture: true });
        }
        this.isListening = true;
    }

    discoverDeclarativeActions() {
        const elements = this.element.querySelectorAll('[data-input-action]');
        const keyboardDefs = {};

        elements.forEach(el => {
            const action = el.dataset.inputAction;
            const shortcut = el.dataset.inputShortcut;

            if (action && shortcut) {
                keyboardDefs[action] = shortcut;
                // Automatically dispatch to the element that defined the action
                el.addEventListener('input-recognized', (e) => {
                    if (e.detail.action === action) {
                        console.log(`Dispatching action '${action}' to element:`, el);
                        // In a real app, you might click() it or fire another custom event.
                        el.style.transform = 'scale(0.95)';
                        setTimeout(() => el.style.transform = '', 100);
                    }
                });
            }
        });

        if (Object.keys(keyboardDefs).length > 0) {
            const keyboardRecognizer = new KeyboardRecognizer(keyboardDefs);
            this.addRecognizer(keyboardRecognizer);
        }
    }

    stop() {
        if (!this.isListening) return;
        for (const eventType in this.eventListeners) {
            this.element.removeEventListener(eventType, this.eventListeners[eventType], { capture: true });
        }
        this.isListening = false;
    }

    handleEvent(event) {
        for (const recognizer of this.recognizers) {
            recognizer.handleEvent(event);
        }
    }

    dispatch(action, detail = {}) {
        const event = new CustomEvent('input-recognized', {
            bubbles: true,
            cancelable: true,
            detail: { action, ...detail }
        });
        this.element.dispatchEvent(event);
    }
}

export { InputManager };

import KeyboardRecognizer from './recognizers/Keyboard.js';
import GestureRecognizer from './recognizers/Gesture.js';

export { InputManager, KeyboardRecognizer, GestureRecognizer };
