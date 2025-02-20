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
}

export default InputManager;
