// src/recognizers/Keyboard.js

const SEQUENCE_TIMEOUT = 1000; // ms

class KeyboardRecognizer {
    constructor(definitions) {
        this.definitions = definitions; // e.g., { 'inbox': 'g i', 'save': 'Control+s' }
        this.manager = null;

        this.sequence = [];
        this.sequenceTimer = null;
        this.activeModifiers = new Set();
    }

    handleEvent(event) {
        if (!['keydown', 'keyup'].includes(event.type)) return;

        if (event.type === 'keydown') {
            if (this.isModifier(event.key)) {
                this.activeModifiers.add(event.key);
            } else {
                this.evaluate(event.key);
            }
        } else { // keyup
            if (this.isModifier(event.key)) {
                this.activeModifiers.delete(event.key);
            }
        }
    }

    evaluate(key) {
        // Check for chords (e.g., Ctrl+S)
        const chord = this.buildChord(key);
        for (const action in this.definitions) {
            if (this.definitions[action] === chord) {
                console.log(`Action triggered: ${action}`); // Placeholder for dispatcher
                this.resetSequence();
                return;
            }
        }

        // Handle sequences (e.g., g i)
        this.sequence.push(key);
        const sequenceStr = this.sequence.join(' ');
        
        for (const action in this.definitions) {
            if (this.definitions[action] === sequenceStr) {
                console.log(`Action triggered: ${action}`); // Placeholder
                this.resetSequence();
                return;
            } else if (this.definitions[action].startsWith(sequenceStr + ' ')) {
                // Potential sequence in progress, reset timer
                this.startSequenceTimer();
                return;
            }
        }

        // If no match or potential match, reset
        this.resetSequence();
        // Start a new sequence with the current key if it's part of any definition
        for (const action in this.definitions) {
            if (this.definitions[action].startsWith(key + ' ')) {
                this.sequence = [key];
                this.startSequenceTimer();
                break;
            }
        }
    }

    buildChord(key) {
        const sortedModifiers = Array.from(this.activeModifiers).sort();
        return [...sortedModifiers, key].join('+');
    }

    isModifier(key) {
        return ['Control', 'Alt', 'Shift', 'Meta'].includes(key);
    }

    resetSequence() {
        clearTimeout(this.sequenceTimer);
        this.sequence = [];
        this.sequenceTimer = null;
    }

    startSequenceTimer() {
        clearTimeout(this.sequenceTimer);
        this.sequenceTimer = setTimeout(() => this.resetSequence(), SEQUENCE_TIMEOUT);
    }
}

export default KeyboardRecognizer;
