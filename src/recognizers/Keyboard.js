// src/recognizers/Keyboard.js

const SEQUENCE_TIMEOUT = 1000; // ms

const MODIFIER_ALIASES = {
    ctrl: 'Control',
    control: 'Control',
    alt: 'Alt',
    option: 'Alt',
    shift: 'Shift',
    meta: 'Meta',
    cmd: 'Meta',
    command: 'Meta'
};

class KeyboardRecognizer {
    constructor(definitions = {}) {
        this.definitions = definitions; // e.g., { 'inbox': 'g i', 'save': 'Control+s' }
        this.manager = null;

        this.sequence = [];
        this.sequenceTimer = null;
        this.activeModifiers = new Set();
    }

    handleEvent(event) {
        if (!event || !['keydown', 'keyup'].includes(event.type)) return;

        const normalizedKey = MODIFIER_ALIASES[String(event.key || '').toLowerCase()] || event.key;

        if (event.type === 'keydown') {
            if (this.isModifier(normalizedKey)) {
                this.activeModifiers.add(normalizedKey);
            } else {
                this.evaluate(event.key);
            }
        } else { // keyup
            if (this.isModifier(normalizedKey)) {
                this.activeModifiers.delete(normalizedKey);
            }
        }
    }

    normalizeChordString(chordStr) {
        if (typeof chordStr !== 'string' || !chordStr.includes('+')) return null;
        const parts = chordStr.split('+').map(p => p.trim()).filter(Boolean);
        if (parts.length < 2) return null;

        const modifiers = [];
        let mainKey = parts[parts.length - 1];
        for (let i = 0; i < parts.length - 1; i++) {
            const mod = MODIFIER_ALIASES[parts[i].toLowerCase()] || parts[i];
            if (!modifiers.includes(mod)) {
                modifiers.push(mod);
            }
        }
        modifiers.sort();
        const normalizedMain = mainKey.length === 1 ? mainKey.toLowerCase() : mainKey;
        return [...modifiers, normalizedMain].join('+');
    }

    evaluate(key) {
        // Check for chords (e.g., Control+s or Ctrl+S)
        const chord = this.buildChord(key);
        const normalizedChord = this.normalizeChordString(chord);

        for (const action in this.definitions) {
            const def = this.definitions[action];
            if (def === chord || (normalizedChord && this.normalizeChordString(def) === normalizedChord)) {
                if (this.manager && typeof this.manager.dispatch === 'function') {
                    this.manager.dispatch(action, { type: 'keyboard', chord });
                }
                this.resetSequence();
                return;
            }
        }

        // If any non-Shift chord modifier (Control, Alt, Meta) is held and no chord matched,
        // do not treat the modified keypress as part of a plain key sequence.
        // Shift is allowed so sequences containing uppercase/shifted keys (e.g., 'g G' or '? ?') work.
        if (this.hasChordModifier()) {
            this.resetSequence();
            return;
        }

        // Handle sequences (e.g., g i, g G)
        this.sequence.push(key);
        const sequenceStr = this.sequence.join(' ');
        
        for (const action in this.definitions) {
            if (this.definitions[action] === sequenceStr) {
                if (this.manager && typeof this.manager.dispatch === 'function') {
                    this.manager.dispatch(action, { type: 'keyboard', sequence: sequenceStr });
                }
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
        const normalizedKey = (this.hasChordModifier() && typeof key === 'string' && key.length === 1)
            ? key.toLowerCase()
            : key;
        return [...sortedModifiers, normalizedKey].join('+');
    }

    hasChordModifier() {
        return (
            this.activeModifiers.has('Control') ||
            this.activeModifiers.has('Alt') ||
            this.activeModifiers.has('Meta')
        );
    }

    isModifier(key) {
        return ['Control', 'Alt', 'Shift', 'Meta'].includes(key);
    }

    resetSequence() {
        clearTimeout(this.sequenceTimer);
        this.sequence = [];
        this.sequenceTimer = null;
    }

    reset() {
        this.resetSequence();
        this.activeModifiers.clear();
    }

    startSequenceTimer() {
        clearTimeout(this.sequenceTimer);
        this.sequenceTimer = setTimeout(() => this.resetSequence(), SEQUENCE_TIMEOUT);
    }
}

export default KeyboardRecognizer;


