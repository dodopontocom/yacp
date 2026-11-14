import { createTelegramBridge } from './telegram.js';
import { createSimulation } from './physics.js';

const stage = document.querySelector('#stage');
const toggleButton = document.querySelector('#toggle');
const tiltButton = document.querySelector('#tilt');
const statusElement = document.querySelector('#status');

const bridge = createTelegramBridge();

let simulation = null;
let busy = false;
let tiltEnabled = false;
let tiltRunning = false;
let tiltRequest = 0;

function setStatus(message) {
    statusElement.textContent = message;
}

function bodiesLabel() {
    return bridge.hasSDK ? 'as ADAs e os emojis' : 'as ADAs';
}

function idleStatus() {
    return bridge.hasAccelerometer()
        ? `Arraste ${bodiesLabel()} com o dedo. Toque em Inclinar para usar o acelerômetro.`
        : `Arraste ${bodiesLabel()} com o dedo para interagir.`;
}

function handleAccelerometer(event) {
    simulation?.setGravity(event.x, event.y);
}

async function startTiltTracking() {
    if (!simulation) {
        return false;
    }

    if (tiltRunning) {
        return true;
    }

    const request = ++tiltRequest;
    tiltRunning = true;
    tiltButton.disabled = true;

    const started = await bridge.startAccelerometer(handleAccelerometer);

    if (request !== tiltRequest) {
        return false;
    }

    tiltButton.disabled = false;

    if (!started) {
        tiltEnabled = false;
        tiltRunning = false;
        tiltButton.setAttribute('aria-pressed', 'false');
        setStatus('Acelerômetro indisponível neste cliente.');
        bridge.haptic('notification', 'warning');
        return false;
    }

    tiltButton.setAttribute('aria-pressed', 'true');
    setStatus('Gravidade controlada pelo movimento do aparelho.');
    bridge.haptic('selection');
    return true;
}

function stopTiltTracking() {
    tiltRequest += 1;
    bridge.stopAccelerometer();
    simulation?.resetGravity();
    tiltRunning = false;
    tiltButton.disabled = false;
    tiltButton.setAttribute('aria-pressed', 'false');
}

function toggleTilt() {
    if (!simulation || !bridge.hasAccelerometer()) {
        return;
    }

    if (tiltEnabled) {
        tiltEnabled = false;
        stopTiltTracking();
        setStatus('Gravidade padrão.');
        bridge.haptic('selection');
        return;
    }

    tiltEnabled = true;
    void startTiltTracking();
}

function startSimulation() {
    if (busy) {
        return;
    }

    if (!window.Matter) {
        setStatus('Falha ao carregar a engine de física.');
        return;
    }

    busy = true;
    bridge.setMainButtonEnabled(false);

    try {
        stopTiltTracking();
        bridge.enableVerticalSwipes();
        simulation?.destroy();
        simulation = null;

        simulation = createSimulation(stage, {
            emoji: bridge.hasSDK,
            onDragStart: () => bridge.disableVerticalSwipes(),
            onDragEnd: () => bridge.enableVerticalSwipes(),
        });

        if (tiltEnabled) {
            void startTiltTracking();
        }

        toggleButton.textContent = 'Reiniciar';
        bridge.setMainButton('Reiniciar', true);

        setStatus(tiltEnabled
            ? `Arraste ${bodiesLabel()} e incline o aparelho para mudar a gravidade.`
            : idleStatus());

        bridge.haptic('impact', 'light');
    } catch (error) {
        console.error('[webapp] failed to start simulation', error);
        setStatus('Não foi possível iniciar a simulação.');
        bridge.haptic('notification', 'error');
    } finally {
        busy = false;
        bridge.setMainButtonEnabled(true);
    }
}

function pauseSimulation() {
    simulation?.pause();
    stopTiltTracking();
    bridge.enableVerticalSwipes();
}

function resumeSimulation() {
    simulation?.resume();

    if (tiltEnabled) {
        void startTiltTracking();
    }
}

function boot() {
    bridge.applyTheme();

    bridge.on('themeChanged', () => {
        bridge.applyTheme();
        simulation?.refreshTheme();
    });

    bridge.on('viewportChanged', (event) => {
        if (event?.isStateStable !== false) {
            simulation?.resize();
        }
    });

    bridge.on('safeAreaChanged', () => simulation?.resize());
    bridge.on('contentSafeAreaChanged', () => simulation?.resize());
    bridge.on('activated', resumeSimulation);
    bridge.on('deactivated', pauseSimulation);

    window.matchMedia?.('(prefers-color-scheme: dark)')
        ?.addEventListener?.('change', () => {
            bridge.applyTheme();
            simulation?.refreshTheme();
        });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            pauseSimulation();
        } else {
            resumeSimulation();
        }
    });

    window.addEventListener('orientationchange', () => simulation?.resize());

    tiltButton.hidden = !bridge.hasAccelerometer();
    tiltButton.addEventListener('click', toggleTilt);
    toggleButton.addEventListener('click', startSimulation);

    const mainButtonReady = bridge.bindMainButton(startSimulation)
        && bridge.setMainButton('Soltar as ADAs', true);

    toggleButton.hidden = mainButtonReady;

    if (bridge.hasSDK) {
        window.requestAnimationFrame(() => bridge.ready());
    } else {
        bridge.ready();
    }

    if (!window.Matter) {
        setStatus('Falha ao carregar a engine de física.');
        bridge.setMainButton('Indisponível', false);
        toggleButton.hidden = false;
        toggleButton.disabled = true;
        tiltButton.hidden = true;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
    boot();
}
