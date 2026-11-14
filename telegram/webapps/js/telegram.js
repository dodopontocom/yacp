/**
 * Thin wrapper around the Telegram Mini Apps SDK.
 *
 * The SDK is loaded from telegram.org before this module runs. Everything is
 * guarded so the same page can be opened in a regular browser for development.
 */

export function createTelegramBridge() {
    const tg = window.Telegram?.WebApp;
    // The SDK script can also be loaded outside Telegram. In that case
    // platform is "unknown"; treat it as a browser fallback.
    const isTelegram = Boolean(tg)
        && typeof tg.platform === 'string'
        && tg.platform !== 'unknown';
    const hasSDK = isTelegram;

    let mainButtonHandler = null;
    let accelerometerHandler = null;
    let accelerometerGeneration = 0;
    let swipesDisabled = false;

    function isVersionAtLeast(version) {
        if (!isTelegram) {
            return false;
        }

        try {
            return Boolean(tg?.isVersionAtLeast?.(version));
        } catch {
            return false;
        }
    }

    function on(event, handler) {
        if (!isTelegram || !tg?.onEvent) {
            return () => {};
        }

        tg.onEvent(event, handler);

        return () => {
            try {
                tg.offEvent?.(event, handler);
            } catch {
                /* ignore unsupported offEvent */
            }
        };
    }

    function applyTheme() {
        const root = document.documentElement;
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        const scheme = (isTelegram && tg?.colorScheme)
            || (prefersDark ? 'dark' : 'light');
        const theme = isTelegram ? (tg?.themeParams || {}) : {};

        root.dataset.theme = scheme;

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.content = theme.bg_color || (scheme === 'dark' ? '#17212b' : '#ffffff');
        }

        if (!isTelegram) {
            return;
        }

        // setHeaderColor / setBackgroundColor are 6.1+, setBottomBarColor is
        // 7.10+. Older clients simply keep their native colors.
        try {
            if (theme.bg_color && isVersionAtLeast('6.1')) {
                tg.setHeaderColor?.(theme.bg_color);
                tg.setBackgroundColor?.(theme.bg_color);
            }

            if (isVersionAtLeast('7.10')) {
                const bar = theme.bottom_bar_bg_color
                    || theme.secondary_bg_color
                    || theme.bg_color;

                if (bar) {
                    tg.setBottomBarColor?.(bar);
                }
            }
        } catch {
            /* Some clients reject colors slightly before a theme settles. */
        }
    }

    /**
     * Tells Telegram the essential UI is ready and asks for the full height.
     * Call once, after the first paint.
     */
    function ready() {
        if (!isTelegram) {
            return;
        }

        try {
            tg?.ready?.();
            tg?.expand?.();
        } catch {
            /* no-op outside Telegram */
        }
    }

    function haptic(type = 'impact', style = 'light') {
        if (!isTelegram) {
            return;
        }

        const feedback = tg?.HapticFeedback;
        if (!feedback) {
            return;
        }

        try {
            if (type === 'notification') {
                feedback.notificationOccurred?.(style);
            } else if (type === 'selection') {
                feedback.selectionChanged?.();
            } else {
                feedback.impactOccurred?.(style);
            }
        } catch {
            /* haptics are best-effort */
        }
    }

    function bindMainButton(handler) {
        const button = tg?.MainButton;
        if (!isTelegram || !button || !isVersionAtLeast('6.1')) {
            return false;
        }

        if (mainButtonHandler && button.offClick) {
            button.offClick(mainButtonHandler);
        }

        mainButtonHandler = handler;
        button.onClick(handler);
        return true;
    }

    function setMainButton(text, visible = true) {
        const button = tg?.MainButton;
        if (!isTelegram || !button) {
            return false;
        }

        try {
            if (text) {
                button.setText(text);
            }

            if (visible) {
                button.show();
            } else {
                button.hide();
            }

            return true;
        } catch {
            return false;
        }
    }

    function setMainButtonEnabled(enabled) {
        const button = tg?.MainButton;
        if (!isTelegram || !button) {
            return;
        }

        try {
            if (enabled) {
                button.enable?.();
            } else {
                button.disable?.();
            }
        } catch {
            /* ignore */
        }
    }

    // Useful while a body is being dragged, so Telegram does not minimize the
    // Mini App when the finger moves vertically.
    function disableVerticalSwipes() {
        if (!isTelegram || swipesDisabled || !isVersionAtLeast('7.7') || !tg?.disableVerticalSwipes) {
            return;
        }

        try {
            tg.disableVerticalSwipes();
            swipesDisabled = true;
        } catch {
            /* ignore */
        }
    }

    function enableVerticalSwipes() {
        if (!isTelegram || !swipesDisabled || !tg?.enableVerticalSwipes) {
            return;
        }

        try {
            tg.enableVerticalSwipes();
            swipesDisabled = false;
        } catch {
            /* ignore */
        }
    }

    function hasAccelerometer() {
        return isTelegram
            && Boolean(tg?.Accelerometer)
            && isVersionAtLeast('8.0');
    }

    function startAccelerometer(handler) {
        if (!hasAccelerometer()) {
            return Promise.resolve(false);
        }

        if (accelerometerHandler) {
            stopAccelerometer();
        }

        const generation = ++accelerometerGeneration;
        // The official SDK emits the event without arguments; the current
        // values live on Telegram.WebApp.Accelerometer.
        const listener = () => {
            const accelerometer = tg?.Accelerometer;
            if (!accelerometer) {
                return;
            }

            const x = Number(accelerometer.x);
            const y = Number(accelerometer.y);
            const z = Number(accelerometer.z);

            if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
                handler({ x, y, z });
            }
        };

        accelerometerHandler = listener;

        try {
            tg.onEvent('accelerometerChanged', listener);
        } catch {
            if (accelerometerHandler === listener) {
                accelerometerHandler = null;
            }
            return Promise.resolve(false);
        }

        return new Promise((resolve) => {
            let settled = false;

            const finish = (started) => {
                if (settled) {
                    return;
                }

                settled = true;

                const active = Boolean(started)
                    && generation === accelerometerGeneration
                    && accelerometerHandler === listener;

                if (!active) {
                    if (accelerometerHandler === listener) {
                        try {
                            tg.offEvent?.('accelerometerChanged', listener);
                        } catch {
                            /* ignore */
                        }
                        accelerometerHandler = null;
                    }

                    // Do not stop a newer subscription that may have started
                    // while this one was still pending.
                    if (generation === accelerometerGeneration) {
                        try {
                            tg.Accelerometer.stop?.();
                        } catch {
                            /* ignore */
                        }
                    }
                }

                resolve(active);
            };

            try {
                // refresh_rate is in milliseconds, 20-1000.
                tg.Accelerometer.start({ refresh_rate: 50 }, finish);
            } catch {
                finish(false);
            }
        });
    }

    function stopAccelerometer() {
        if (!isTelegram) {
            return;
        }

        accelerometerGeneration += 1;

        if (accelerometerHandler) {
            try {
                tg.offEvent?.('accelerometerChanged', accelerometerHandler);
            } catch {
                /* ignore */
            }
            accelerometerHandler = null;
        }

        try {
            tg?.Accelerometer?.stop?.();
        } catch {
            /* ignore */
        }
    }

    /**
     * Only available for Mini Apps launched from a keyboard button, and it
     * closes the app. Kept for explicit actions; never used by the simulation.
     */
    function sendData(payload) {
        if (!isTelegram || !tg?.sendData) {
            return false;
        }

        const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const bytes = typeof TextEncoder === 'function'
            ? new TextEncoder().encode(data).length
            : data.length;

        if (bytes > 4096) {
            throw new Error('Telegram sendData limit is 4096 bytes.');
        }

        tg.sendData(data);
        return true;
    }

    return {
        hasSDK,
        tg,
        isVersionAtLeast,
        on,
        applyTheme,
        ready,
        haptic,
        bindMainButton,
        setMainButton,
        setMainButtonEnabled,
        disableVerticalSwipes,
        enableVerticalSwipes,
        hasAccelerometer,
        startAccelerometer,
        stopAccelerometer,
        sendData,
    };
}
