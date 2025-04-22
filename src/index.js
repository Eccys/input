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
        for (const eventType in this.eventListeners) {
            this.element.addEventListener(eventType, this.eventListeners[eventType], { capture: true });
        }
        this.isListening = true;
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

// Example Usage (will be removed later)
import KeyboardRecognizer from './recognizers/Keyboard.js';
import GestureRecognizer from './recognizers/Gesture.js';

// --- Gesture Definitions (Templates) ---
const z_gesture = [[0,0], [100,0], [0,100], [100,100]]; // A simple 'Z' shape
const circle_gesture = [];
for(let i = 0; i <= 360; i += 10) {
    const rad = i * (Math.PI / 180);
    circle_gesture.push([100 * Math.cos(rad), 100 * Math.sin(rad)]);
}

// --- Initialization ---
const manager = new InputManager(document.body);

const keyboard = new KeyboardRecognizer({
    'inbox': 'g i',
    'save': 'Control+s',
});

const gesture = new GestureRecognizer({
    'undo': z_gesture,
    'open_menu': circle_gesture,
});

manager.addRecognizer(keyboard);
manager.addRecognizer(gesture);
manager.start();

console.log('Declarative Input Framework initialized with keyboard and gesture support.');
