// tests/Keyboard.test.js
import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { InputManager, KeyboardRecognizer, GestureRecognizer } from '../src/index.js';

describe('KeyboardRecognizer', () => {
    afterEach(() => {
        mock.timers.reset();
    });

    it('should correctly identify a simple chord and dispatch via manager', () => {
        const definitions = { save: 'Control+s' };
        const recognizer = new KeyboardRecognizer(definitions);
        const dispatched = [];
        recognizer.manager = {
            dispatch: (action, detail) => dispatched.push({ action, detail })
        };

        recognizer.handleEvent({ type: 'keydown', key: 'Control' });
        recognizer.handleEvent({ type: 'keydown', key: 's' });
        recognizer.handleEvent({ type: 'keyup', key: 'Control' });

        assert.deepEqual(dispatched, [
            { action: 'save', detail: { type: 'keyboard', chord: 'Control+s' } }
        ]);
    });

    it('should correctly identify a sequence within timeout and expire after timeout', () => {
        mock.timers.enable({ apis: ['setTimeout'] });
        const definitions = { inbox: 'g i' };
        const recognizer = new KeyboardRecognizer(definitions);
        const dispatched = [];
        recognizer.manager = {
            dispatch: (action, detail) => dispatched.push({ action, detail })
        };

        recognizer.handleEvent({ type: 'keydown', key: 'g' });
        recognizer.handleEvent({ type: 'keydown', key: 'i' });
        assert.deepEqual(dispatched, [
            { action: 'inbox', detail: { type: 'keyboard', sequence: 'g i' } }
        ]);

        // Test sequence timeout expiration
        dispatched.length = 0;
        recognizer.handleEvent({ type: 'keydown', key: 'g' });
        mock.timers.tick(1100);
        recognizer.handleEvent({ type: 'keydown', key: 'i' });
        assert.deepEqual(dispatched, []);
    });

    it('should not pollute plain key sequences when a non-matching modifier chord is pressed', () => {
        const definitions = { inbox: 'g i', save: 'Control+s' };
        const recognizer = new KeyboardRecognizer(definitions);
        const dispatched = [];
        recognizer.manager = {
            dispatch: (action, detail) => dispatched.push({ action, detail })
        };

        // Pressing Control+g should NOT start the 'g i' sequence
        recognizer.handleEvent({ type: 'keydown', key: 'Control' });
        recognizer.handleEvent({ type: 'keydown', key: 'g' });
        recognizer.handleEvent({ type: 'keyup', key: 'Control' });
        recognizer.handleEvent({ type: 'keydown', key: 'i' });

        assert.deepEqual(dispatched, []);
    });

    it('should allow Shift modifier during key sequences (e.g. "g G") and normalize Ctrl+S chord aliases', () => {
        const definitions = { gotoBottom: 'g G', saveAs: 'Ctrl+S' };
        const recognizer = new KeyboardRecognizer(definitions);
        const dispatched = [];
        recognizer.manager = {
            dispatch: (action, detail) => dispatched.push({ action, detail })
        };

        // Sequence 'g G' where 'G' requires holding Shift
        recognizer.handleEvent({ type: 'keydown', key: 'g' });
        recognizer.handleEvent({ type: 'keyup', key: 'g' });
        recognizer.handleEvent({ type: 'keydown', key: 'Shift' });
        recognizer.handleEvent({ type: 'keydown', key: 'G' });
        recognizer.handleEvent({ type: 'keyup', key: 'G' });
        recognizer.handleEvent({ type: 'keyup', key: 'Shift' });

        // Chord 'Ctrl+S' triggered by pressing Control + s
        recognizer.handleEvent({ type: 'keydown', key: 'Control' });
        recognizer.handleEvent({ type: 'keydown', key: 's' });
        recognizer.handleEvent({ type: 'keyup', key: 'Control' });

        assert.deepEqual(dispatched, [
            { action: 'gotoBottom', detail: { type: 'keyboard', sequence: 'g G' } },
            { action: 'saveAs', detail: { type: 'keyboard', chord: 'Control+s' } }
        ]);
    });

    it('should recover from stuck modifier after missed keyup (e.g. window blur) and match suffix/single-key shortcuts', () => {
        const definitions = { inbox: '  g   i  ', help: '?' };
        const recognizer = new KeyboardRecognizer(definitions);
        const dispatched = [];
        recognizer.manager = {
            dispatch: (action, detail) => dispatched.push({ action, detail })
        };

        // Simulate Control keydown followed by window blur (no keyup), then keydown with ctrlKey: false
        recognizer.handleEvent({ type: 'keydown', key: 'Control' });
        recognizer.handleEvent({ type: 'keydown', key: 'g', ctrlKey: false });
        // Pressing '?' after 'g' should abort 'g i' and immediately fire single-key '?'
        recognizer.handleEvent({ type: 'keydown', key: '?', ctrlKey: false });

        // Repeated prefix 'g' -> 'g' -> 'i' should still match 'g i' via suffix fallback
        recognizer.handleEvent({ type: 'keydown', key: 'g' });
        recognizer.handleEvent({ type: 'keydown', key: 'g' });
        recognizer.handleEvent({ type: 'keydown', key: 'i' });

        assert.deepEqual(dispatched, [
            { action: 'help', detail: { type: 'keyboard', sequence: '?' } },
            { action: 'inbox', detail: { type: 'keyboard', sequence: 'g i' } }
        ]);
    });
});

describe('GestureRecognizer', () => {
    it('should normalize templates without mutating caller arrays and recognize a drawn Z gesture', () => {
        const zTemplate = [[0, 0], [100, 0], [0, 100], [100, 100]];
        const zCopy = JSON.parse(JSON.stringify(zTemplate));

        const recognizer = new GestureRecognizer({ undo: zTemplate });
        assert.deepEqual(zTemplate, zCopy);

        const dispatched = [];
        recognizer.manager = {
            dispatch: (action, detail) => dispatched.push({ action, detail })
        };

        // Simulate drawing a Z path with > 10 points
        const points = [];
        for (let i = 0; i <= 5; i++) points.push([i * 20, 0]);
        for (let i = 1; i <= 5; i++) points.push([100 - i * 20, i * 20]);
        for (let i = 1; i <= 5; i++) points.push([i * 20, 100]);

        recognizer.handleEvent({
            type: 'mousedown',
            button: 2,
            clientX: points[0][0],
            clientY: points[0][1],
            preventDefault: () => {}
        });
        for (let i = 1; i < points.length; i++) {
            recognizer.handleEvent({
                type: 'mousemove',
                clientX: points[i][0],
                clientY: points[i][1]
            });
        }
        recognizer.handleEvent({ type: 'mouseup' });

        assert.equal(dispatched.length, 1);
        assert.equal(dispatched[0].action, 'undo');
        assert.equal(dispatched[0].detail.type, 'gesture');
        assert.ok(dispatched[0].detail.score > 0.7);
    });

    it('should safely handle degenerate zero-length paths without dividing by zero', () => {
        const recognizer = new GestureRecognizer({});
        const resampled = recognizer.resamplePath([[10, 10], [10, 10], [10, 10]], 64);
        assert.equal(resampled.length, 64);
        assert.equal(resampled.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), true);
    });
});

describe('InputManager', () => {
    it('should discover declarative actions, dispatch to the action element, and bubble to root', () => {
        const rootListeners = {};
        const btnListeners = {};
        const btn = {
            dataset: { inputAction: 'save', inputShortcut: 'Control+s' },
            style: { transform: '' },
            addEventListener: (type, fn) => {
                btnListeners[type] = btnListeners[type] || [];
                btnListeners[type].push(fn);
            },
            dispatchEvent: (event) => {
                (btnListeners[event.type] || []).forEach(fn => fn(event));
                if (event.bubbles) {
                    (rootListeners[event.type] || []).forEach(fn => fn(event));
                }
            }
        };

        const root = {
            querySelectorAll: () => [btn],
            addEventListener: (type, fn) => {
                rootListeners[type] = rootListeners[type] || [];
                rootListeners[type].push(fn);
            },
            removeEventListener: (type, fn) => {
                rootListeners[type] = (rootListeners[type] || []).filter(f => f !== fn);
            },
            dispatchEvent: (event) => {
                (rootListeners[event.type] || []).forEach(fn => fn(event));
            }
        };

        const manager = new InputManager(root);
        manager.start();
        // Calling stop() and start() again must not duplicate recognizers
        manager.stop();
        manager.start();
        assert.equal(manager.recognizers.length, 1);

        const receivedOnRoot = [];
        root.addEventListener('input-recognized', (e) => receivedOnRoot.push(e.detail));

        manager.handleEvent({ type: 'keydown', key: 'Control' });
        manager.handleEvent({ type: 'keydown', key: 's' });

        assert.deepEqual(receivedOnRoot, [{ action: 'save', type: 'keyboard', chord: 'Control+s' }]);
        assert.equal(btn.style.transform, 'scale(0.95)');
    });
});
