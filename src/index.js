import KeyboardRecognizer from './recognizers/Keyboard.js';
import GestureRecognizer from './recognizers/Gesture.js';

class InputManager {
    constructor(element) {
        this.element = element;
        this.recognizers = [];
        this.isListening = false;
        this.declarativeDiscovered = false;
        this.actionElements = new Map();

        this.eventListeners = {
            'keydown': this.handleEvent.bind(this),
            'keyup': this.handleEvent.bind(this),
            'mousedown': this.handleEvent.bind(this),
            'mouseup': this.handleEvent.bind(this),
            'mousemove': this.handleEvent.bind(this),
            'contextmenu': this.handleEvent.bind(this),
        };
    }

    addRecognizer(recognizer) {
        if (!recognizer) return;
        this.recognizers.push(recognizer);
        recognizer.manager = this;
    }

    start() {
        if (this.isListening) return;
        if (!this.declarativeDiscovered) {
            this.discoverDeclarativeActions();
            this.declarativeDiscovered = true;
        }
        if (this.element && typeof this.element.addEventListener === 'function') {
            for (const eventType in this.eventListeners) {
                this.element.addEventListener(eventType, this.eventListeners[eventType], { capture: true });
            }
        }
        this.isListening = true;
    }

    discoverDeclarativeActions() {
        if (!this.element || typeof this.element.querySelectorAll !== 'function') return;
        const elements = this.element.querySelectorAll('[data-input-action]');
        const keyboardDefs = {};

        elements.forEach(el => {
            const action = el.dataset.inputAction;
            const shortcut = el.dataset.inputShortcut;

            if (action && shortcut) {
                keyboardDefs[action] = shortcut;
                this.actionElements.set(action, el);
                // Automatically dispatch to the element that defined the action
                el.addEventListener('input-recognized', (e) => {
                    if (e.detail && e.detail.action === action) {
                        if (el.style) {
                            el.style.transform = 'scale(0.95)';
                            setTimeout(() => {
                                if (el.style) el.style.transform = '';
                            }, 100);
                        }
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
        if (this.element && typeof this.element.removeEventListener === 'function') {
            for (const eventType in this.eventListeners) {
                this.element.removeEventListener(eventType, this.eventListeners[eventType], { capture: true });
            }
        }
        for (const recognizer of this.recognizers) {
            if (typeof recognizer.reset === 'function') {
                recognizer.reset();
            } else if (typeof recognizer.resetSequence === 'function') {
                recognizer.resetSequence();
            }
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
        const targetEl = this.actionElements.get(action) || this.element;
        if (targetEl && typeof targetEl.dispatchEvent === 'function') {
            targetEl.dispatchEvent(event);
        }
    }
}

export { InputManager, KeyboardRecognizer, GestureRecognizer };

