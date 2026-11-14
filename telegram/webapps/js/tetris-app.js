import { createTelegramBridge } from './telegram-bridge.js?v=20261114-3';
import { TetraZenWorld } from './tetris/world.js?v=20261114-3';
import { createMarimbaSynth } from './tetris/marimba.js?v=20261114-3';
import { createTiltController } from './tetris/tilt.js?v=20261114-3';

const HINT_MS = 6000;
const TOAST_MS = 2400;

const canvas = document.querySelector('#game');
const modeButton = document.querySelector('#mode');
const modeIcon = document.querySelector('#mode-icon-use');
const modeLabel = document.querySelector('#mode-label');
const soundButton = document.querySelector('#sound');
const soundIcon = document.querySelector('#sound-icon-use');
const tiltButton = document.querySelector('#tilt');
const scoreWrap = document.querySelector('#score-wrap');
const scoreValue = document.querySelector('#score');
const hint = document.querySelector('#hint');
const gravityButton = document.querySelector('#gravity');
const zeroGButton = document.querySelector('#zero-g');
const resetButton = document.querySelector('#reset');
const dropButton = document.querySelector('#drop');
const roundOver = document.querySelector('#round-over');
const finalScore = document.querySelector('#final-score');
const bestScore = document.querySelector('#best-score');
const playAgain = document.querySelector('#play-again');
const toast = document.querySelector('#toast');

const bridge = createTelegramBridge();
const synth = createMarimbaSynth();

let world = null;
let mode = 'zen';
let muted = false;
let best = 0;
let paused = false;
let hintTimer = 0;
let toastTimer = 0;
let tiltController = null;

let stats = {
    score: 0,
    zeroG: false,
    gravityShifting: false,
    roundOver: false,
};

function ensureAudio() {
    synth.resume();
}

function getBottomInset() {
    const toolbar = document.querySelector('.toolbar');

    if (!toolbar) {
        return 0;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();

    return Math.max(0, canvasRect.bottom - toolbarRect.top + 12);
}

function hideHint() {
    hint.classList.add('is-hidden');
    window.clearTimeout(hintTimer);
}

function scheduleHint() {
    hintTimer = window.setTimeout(hideHint, HINT_MS);
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
        toast.classList.remove('is-visible');
    }, TOAST_MS);
}

function setModeUi() {
    const attack = mode === 'attack';

    modeButton.classList.toggle('is-active', attack);
    modeButton.setAttribute('aria-pressed', String(attack));
    modeButton.setAttribute(
        'aria-label',
        attack ? 'Score Attack ativo. Alternar para Modo Zen.' : 'Modo Zen ativo. Alternar para Score Attack.',
    );
    modeButton.title = modeButton.getAttribute('aria-label');
    modeLabel.textContent = attack ? 'Score Attack' : 'Modo Zen';
    modeIcon.setAttribute('href', attack ? '#icon-trophy' : '#icon-leaf');
    scoreWrap.hidden = !attack;

    if (attack) {
        scoreValue.textContent = String(stats.score);
    }
}

function setSoundUi() {
    soundButton.classList.toggle('is-active', !muted);
    soundButton.setAttribute('aria-pressed', String(!muted));
    soundButton.setAttribute('aria-label', muted ? 'Som desligado. Ligar som.' : 'Som ligado. Desligar som.');
    soundButton.title = soundButton.getAttribute('aria-label');
    soundIcon.setAttribute('href', muted ? '#icon-volume-x' : '#icon-volume-2');
}

function setTiltUi() {
    if (!tiltController) {
        tiltButton.hidden = true;
        return;
    }

    const enabled = tiltController.enabled;
    const pending = tiltController.wanted && !enabled;

    tiltButton.hidden = !tiltController.supported;
    tiltButton.classList.toggle('is-active', enabled);
    tiltButton.setAttribute('aria-pressed', String(enabled));
    tiltButton.setAttribute(
        'aria-label',
        pending ? 'Ativando inclinação.' : enabled ? 'Inclinação ativa. Desligar.' : 'Ativar inclinação.',
    );
    tiltButton.title = tiltButton.getAttribute('aria-label');
    tiltButton.disabled = pending;
}

function updateStats(next) {
    const wasOver = stats.roundOver;
    stats = next;

    best = Math.max(best, stats.score);

    if (mode === 'attack') {
        scoreValue.textContent = String(stats.score);
    }

    gravityButton.classList.toggle('is-active', stats.gravityShifting);
    gravityButton.setAttribute('aria-pressed', String(stats.gravityShifting));
    zeroGButton.classList.toggle('is-active', stats.zeroG);
    zeroGButton.setAttribute('aria-pressed', String(stats.zeroG));
    zeroGButton.disabled = stats.zeroG;

    if (stats.roundOver && !wasOver) {
        showRoundOver();
    } else if (!stats.roundOver && wasOver) {
        hideRoundOver();
    }
}

function showRoundOver() {
    finalScore.textContent = String(stats.score);
    bestScore.textContent = String(best);
    roundOver.hidden = false;
    bridge.haptic('notification', 'warning');
    bridge.setMainButton('Jogar de novo', true);
    hideHint();
    playAgain.focus({ preventScroll: true });
}

function hideRoundOver() {
    roundOver.hidden = true;
    bridge.setMainButton('Soltar peça', true);
}

function resetGame() {
    ensureAudio();
    hideRoundOver();
    world?.reset();
    bridge.haptic('selection');
}

function dropPiece() {
    if (stats.roundOver) {
        return;
    }

    ensureAudio();
    world?.dropNext();
    bridge.haptic('impact', 'light');
}

function handlePrimary() {
    if (stats.roundOver) {
        resetGame();
    } else {
        dropPiece();
    }
}

function toggleMode() {
    ensureAudio();
    mode = mode === 'zen' ? 'attack' : 'zen';
    hideRoundOver();
    world?.setMode(mode);
    setModeUi();
    bridge.haptic('selection');
}

function toggleSound() {
    muted = !muted;
    synth.setMuted(muted);
    setSoundUi();
    bridge.haptic('selection');
}

async function toggleTilt() {
    if (!tiltController) {
        return;
    }

    const wasEnabled = tiltController.enabled;
    tiltButton.disabled = true;
    const enabled = await tiltController.toggle();
    tiltButton.disabled = false;
    setTiltUi();

    if (!wasEnabled && !enabled) {
        showToast('Acelerômetro indisponível neste cliente.');
        bridge.haptic('notification', 'warning');
        return;
    }

    bridge.haptic('selection');
}

function pauseGame() {
    if (paused) {
        return;
    }

    paused = true;
    world?.pause();
    tiltController?.pause();
    bridge.enableVerticalSwipes();
}

function resumeGame() {
    if (!paused) {
        return;
    }

    paused = false;
    world?.resume();
    tiltController?.resume();
}

function boot() {
    document.documentElement.dataset.theme = 'dark';

    bridge.setChromeColors({
        header: '#0f1115',
        background: '#0f1115',
        bottom: '#0f1115',
    });

    setModeUi();
    setSoundUi();
    scheduleHint();

    modeButton.addEventListener('click', toggleMode);
    soundButton.addEventListener('click', toggleSound);
    tiltButton.addEventListener('click', () => void toggleTilt());
    gravityButton.addEventListener('click', () => {
        ensureAudio();
        world?.shiftGravity();
        bridge.haptic('selection');
        hideHint();
    });
    zeroGButton.addEventListener('click', () => {
        ensureAudio();
        world?.floatZeroG();
        bridge.haptic('selection');
        hideHint();
    });
    resetButton.addEventListener('click', resetGame);
    dropButton.addEventListener('click', dropPiece);
    playAgain.addEventListener('click', resetGame);

    canvas.addEventListener('pointerdown', () => {
        bridge.disableVerticalSwipes();
        hideHint();
    });
    window.addEventListener('pointerup', () => bridge.enableVerticalSwipes());
    window.addEventListener('pointercancel', () => bridge.enableVerticalSwipes());

    bridge.on('viewportChanged', (event) => {
        if (event?.isStateStable !== false) {
            window.requestAnimationFrame(() => world?.resize());
        }
    });
    bridge.on('safeAreaChanged', () => window.requestAnimationFrame(() => world?.resize()));
    bridge.on('contentSafeAreaChanged', () => window.requestAnimationFrame(() => world?.resize()));
    bridge.on('activated', resumeGame);
    bridge.on('deactivated', pauseGame);
    bridge.on('themeChanged', () => {
        bridge.setChromeColors({
            header: '#0f1115',
            background: '#0f1115',
            bottom: '#0f1115',
        });
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            pauseGame();
        } else {
            resumeGame();
        }
    });

    window.addEventListener('orientationchange', () => {
        window.setTimeout(() => world?.resize(), 160);
    });

    const mainButtonReady = bridge.bindMainButton(handlePrimary);

    if (mainButtonReady) {
        bridge.setMainButtonParams({
            color: '#67e8f9',
            text_color: '#0f1115',
            is_active: true,
        });
        bridge.setMainButton('Soltar peça', true);
        dropButton.hidden = true;
    }

    if (!window.Matter) {
        showToast('Falha ao carregar a engine de física.');
        dropButton.disabled = true;
        bridge.setMainButton('Indisponível', false);
        return;
    }

    try {
        world = new TetraZenWorld({
            canvas,
            audio: synth,
            mode,
            onStats: updateStats,
            onDissolve: () => bridge.haptic('notification', 'success'),
            onDragStart: () => bridge.disableVerticalSwipes(),
            onDragEnd: () => bridge.enableVerticalSwipes(),
            getBottomInset,
        });

        world.start();
    } catch (error) {
        console.error('[tetra-zen] failed to start', error);
        showToast('Não foi possível iniciar o jogo.');
        dropButton.disabled = true;
        bridge.setMainButton('Indisponível', false);
        return;
    }

    tiltController = createTiltController({
        bridge,
        onChange: (value) => world?.setTilt(value),
    });

    if (new URLSearchParams(window.location.search).has('debug')) {
        window.__tetraZen = {
            bridge,
            synth,
            get world() {
                return world;
            },
            get stats() {
                return stats;
            },
        };
    }

    setTiltUi();
    setModeUi();

    if (bridge.hasSDK) {
        window.requestAnimationFrame(() => bridge.ready());
    } else {
        bridge.ready();
    }

    window.addEventListener('pagehide', (event) => {
        if (!event.persisted) {
            world?.destroy();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
    boot();
}
