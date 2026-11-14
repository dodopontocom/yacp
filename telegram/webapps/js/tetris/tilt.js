const TILT_DEGREES_FOR_FULL_GRAVITY = 40;
const TELEGRAM_FULL_GRAVITY = 6.5;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/**
 * Prefers Telegram's accelerometer inside the Mini App and falls back to the
 * browser DeviceOrientation API on mobile browsers.
 */
export function createTiltController({ bridge, onChange }) {
    const platform = bridge.tg?.platform;
    const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
    const isMobilePlatform = platform === 'android' || platform === 'ios';
    const hasTelegramTilt = bridge.hasAccelerometer() && isMobilePlatform;
    const hasDeviceTilt = 'DeviceOrientationEvent' in window && coarsePointer;
    const supported = hasTelegramTilt || hasDeviceTilt;

    let wanted = false;
    let active = false;
    let mode = null;
    let generation = 0;
    let orientationHandler = null;

    function emit(value) {
        onChange(value);
    }

    function stop() {
        generation += 1;

        if (orientationHandler) {
            window.removeEventListener('deviceorientation', orientationHandler);
            orientationHandler = null;
        }

        bridge.stopAccelerometer();
        mode = null;
        active = false;
        emit(null);
    }

    async function start() {
        if (!supported || active) {
            return active;
        }

        const request = ++generation;

        if (hasTelegramTilt) {
            const started = await bridge.startAccelerometer(({ x }) => {
                if (!active || request !== generation) {
                    return;
                }

                emit(clamp(x / TELEGRAM_FULL_GRAVITY, -1, 1));
            });

            if (request !== generation) {
                return false;
            }

            if (started) {
                mode = 'telegram';
                active = true;
                return true;
            }
        }

        if (!hasDeviceTilt) {
            return false;
        }

        const requestPermission = window.DeviceOrientationEvent?.requestPermission;

        if (typeof requestPermission === 'function') {
            try {
                const result = await requestPermission();

                if (request !== generation) {
                    return false;
                }

                if (result !== 'granted') {
                    return false;
                }
            } catch {
                return false;
            }
        }

        orientationHandler = (event) => {
            if (!active || event.gamma === null) {
                return;
            }

            emit(clamp(event.gamma / TILT_DEGREES_FOR_FULL_GRAVITY, -1, 1));
        };

        window.addEventListener('deviceorientation', orientationHandler);
        mode = 'device';
        active = true;
        return true;
    }

    async function enable() {
        wanted = true;
        const started = await start();

        if (!started && wanted) {
            wanted = false;
            emit(null);
        }

        return started;
    }

    function disable() {
        wanted = false;
        stop();
    }

    async function toggle() {
        if (wanted || active) {
            disable();
            return false;
        }

        return enable();
    }

    function pause() {
        if (!wanted || !active) {
            return;
        }

        stop();
    }

    function resume() {
        if (wanted && !active) {
            void start();
        }
    }

    return {
        supported,
        get enabled() {
            return wanted && active;
        },
        get wanted() {
            return wanted;
        },
        get mode() {
            return mode;
        },
        enable,
        disable,
        toggle,
        pause,
        resume,
    };
}
