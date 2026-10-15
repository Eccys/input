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
        this.definitions = this.normalizeDefinitions(definitions); // e.g., { 'inbox': 'g i', 'save': 'Control+s' }
        this.manager = null;

        this.sequence = [];
        this.sequenceTimer = null;
        this.activeModifiers = new Set();
    }

    normalizeDefinitions(definitions) {
        const normalized = {};
        if (!definitions || typeof definitions !== 'object') return normalized;
        for (const action in definitions) {
            const raw = definitions[action];
            if (typeof raw === 'string') {
                normalized[action] = raw.includes('+')
                    ? raw.trim()
                    : raw.trim().split(/\s+/).join(' ');
            }
        }
        return normalized;
    }

    syncEventModifiers(event, normalizedKey) {
        const flagMap = [
            ['ctrlKey', 'Control'],
            ['altKey', 'Alt'],
            ['shiftKey', 'Shift'],
            ['metaKey', 'Meta']
        ];
        for (const [prop, modName] of flagMap) {
            if (typeof event[prop] === 'boolean' && normalizedKey !== modName) {
                if (event[prop]) {
                    this.activeModifiers.add(modName);
                } else {
                    this.activeModifiers.delete(modName);
                }
            }
        }
    }

    handleEvent(event) {
        if (!event || !['keydown', 'keyup'].includes(event.type)) return;

        const normalizedKey = MODIFIER_ALIASES[String(event.key || '').toLowerCase()] || event.key;
        this.syncEventModifiers(event, normalizedKey);

        if (event.type === 'keydown') {
            if (this.isModifier(normalizedKey)) {
                this.activeModifiers.add(normalizedKey);
            } else if (typeof event.key === 'string' && event.key.length > 0) {
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

    matchOrAdvanceSequence() {
        const sequenceStr = this.sequence.join(' ');
        for (const action in this.definitions) {
            const def = this.definitions[action];
            if (def === sequenceStr) {
                if (this.manager && typeof this.manager.dispatch === 'function') {
                    this.manager.dispatch(action, { type: 'keyboard', sequence: sequenceStr });
                }
                this.resetSequence();
                return true;
            }
        }
        for (const action in this.definitions) {
            if (this.definitions[action].startsWith(sequenceStr + ' ')) {
                this.startSequenceTimer();
                return true;
            }
        }
        return false;
    }

    evaluate(key) {
        // Check for chords (e.g., Control+s or Ctrl+S)
        const chord = this.buildChord(key);
        const normalizedChord = this.normalizeChordString(chord);

        if (chord.includes('+')) {
            for (const action in this.definitions) {
                const def = this.definitions[action];
                if (!def.includes('+')) continue;
                if (def === chord || (normalizedChord && this.normalizeChordString(def) === normalizedChord)) {
                    if (this.manager && typeof this.manager.dispatch === 'function') {
                        this.manager.dispatch(action, { type: 'keyboard', chord });
                    }
                    this.resetSequence();
                    return;
                }
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
        if (this.matchOrAdvanceSequence()) {
            return;
        }

        // Try longest suffix of the current sequence (e.g. 'a a b' -> 'a b', or 'g ?' -> '?')
        while (this.sequence.length > 1) {
            this.sequence.shift();
            if (this.matchOrAdvanceSequence()) {
                return;
            }
        }

        this.resetSequence();
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


