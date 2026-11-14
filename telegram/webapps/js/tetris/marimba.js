const SCALE_HZ = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
export const DISSOLVE_CHIME = [783.99, 880, 1046.5, 1318.51];

const NOTE_GAP_MS = 70;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function createMarimbaSynth() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    let context = null;
    let output = null;
    let muted = false;
    let lastNoteAt = 0;

    function strike(frequency, volume, delaySeconds) {
        if (!context || !output || context.state !== 'running') {
            return;
        }

        const start = context.currentTime + delaySeconds;
        const body = context.createOscillator();
        body.type = 'sine';
        body.frequency.value = frequency;

        const bodyGain = context.createGain();
        bodyGain.gain.setValueAtTime(0.0001, start);
        bodyGain.gain.exponentialRampToValueAtTime(volume, start + 0.005);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);
        body.connect(bodyGain).connect(output);

        const overtone = context.createOscillator();
        overtone.type = 'sine';
        overtone.frequency.value = frequency * 4;

        const overtoneGain = context.createGain();
        overtoneGain.gain.setValueAtTime(0.0001, start);
        overtoneGain.gain.exponentialRampToValueAtTime(volume * 0.25, start + 0.003);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
        overtone.connect(overtoneGain).connect(output);

        body.start(start);
        overtone.start(start);
        body.stop(start + 1.2);
        overtone.stop(start + 0.3);
    }

    return {
        resume() {
            if (!AudioContextClass) {
                return;
            }

            if (!context) {
                context = new AudioContextClass();
                output = context.createGain();
                output.gain.value = 0.6;
                output.connect(context.destination);
            }

            void context.resume();
        },
        setMuted(value) {
            muted = value;
        },
        playImpact(impact) {
            if (muted) {
                return;
            }

            const now = performance.now();
            if (now - lastNoteAt < NOTE_GAP_MS) {
                return;
            }

            lastNoteAt = now;
            const index = clamp(Math.round(impact * 0.6 + Math.random() * 1.5), 0, SCALE_HZ.length - 1);
            strike(SCALE_HZ[index], clamp(impact * 0.025, 0.03, 0.2), 0);
        },
        chime(notes) {
            if (muted) {
                return;
            }

            notes.forEach((frequency, index) => strike(frequency, 0.12, index * 0.12));
        },
    };
}
