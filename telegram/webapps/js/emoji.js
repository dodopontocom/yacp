const EMOJI_OVERSCAN = 1.55;

// TGS files are Telegram's gzipped Lottie animations. They are only loaded
// inside Telegram, so the browser fallback keeps the original geometric scene.
const EMOJI_SPECS = [
    { name: 'gem', src: new URL('../image/emoji/gem.tgs', import.meta.url).href },
    { name: 'fire', src: new URL('../image/emoji/fire.tgs', import.meta.url).href },
    { name: 'bolt', src: new URL('../image/emoji/bolt.tgs', import.meta.url).href },
    { name: 'whale', src: new URL('../image/emoji/whale.tgs', import.meta.url).href },
    { name: 'crown', src: new URL('../image/emoji/crown.tgs', import.meta.url).href },
    { name: 'party', src: new URL('../image/emoji/party.tgs', import.meta.url).href },
];

const animationDataCache = new Map();

function loadAnimationData(src) {
    if (!animationDataCache.has(src)) {
        const request = fetch(src, { cache: 'force-cache' })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to load ${src}: ${response.status}`);
                }

                return response.arrayBuffer();
            })
            .then((buffer) => {
                const json = window.pako.inflate(new Uint8Array(buffer), { to: 'string' });
                return JSON.parse(json);
            })
            .catch((error) => {
                animationDataCache.delete(src);
                throw error;
            });

        animationDataCache.set(src, request);
    }

    return animationDataCache.get(src);
}

/**
 * DOM overlay for the animated emoji bodies.
 *
 * Matter.js still owns the collision shape and keeps the palette circle as a
 * fallback. When a TGS animation finishes loading, the fallback circle is hidden
 * and the Lottie canvas is positioned on top of the body every frame.
 */
export function createEmojiLayer(stage, { enabled = false } = {}) {
    if (!enabled || !window.lottie || !window.pako) {
        return null;
    }

    const reducedMotion = window
        .matchMedia?.('(prefers-reduced-motion: reduce)')
        ?.matches ?? false;
    const layer = document.createElement('div');
    layer.className = 'emoji-layer';
    layer.setAttribute('aria-hidden', 'true');
    stage.appendChild(layer);

    const items = [];
    let nextSpec = 0;
    let paused = false;
    let destroyed = false;

    function syncItem(item) {
        if (item.failed) {
            return;
        }

        const half = item.size / 2;
        const { x, y } = item.body.position;
        const xOffset = x - half;
        const yOffset = y - half;

        item.element.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0) rotate(${item.body.angle}rad)`;
    }

    function attach(body) {
        if (destroyed) {
            return;
        }

        const spec = EMOJI_SPECS[nextSpec % EMOJI_SPECS.length];
        nextSpec += 1;

        const radius = Math.max(8, body.circleRadius || 24);
        const size = radius * 2 * EMOJI_OVERSCAN;
        const element = document.createElement('div');

        element.className = 'emoji-body';
        element.dataset.emoji = spec.name;
        element.setAttribute('aria-hidden', 'true');
        element.style.width = `${size}px`;
        element.style.height = `${size}px`;
        layer.appendChild(element);

        const item = {
            body,
            element,
            size,
            animation: null,
            failed: false,
        };

        items.push(item);
        syncItem(item);

        loadAnimationData(spec.src)
            .then((animationData) => {
                if (destroyed || !element.isConnected) {
                    return;
                }

                let animation;

                try {
                    animation = window.lottie.loadAnimation({
                        container: element,
                        renderer: 'canvas',
                        loop: true,
                        autoplay: !paused,
                        animationData,
                        rendererSettings: {
                            clearCanvas: true,
                            preserveAspectRatio: 'xMidYMid meet',
                        },
                    });
                } catch {
                    item.failed = true;
                    element.remove();
                    return;
                }

                item.animation = animation;

                const reveal = () => {
                    if (destroyed || item.failed) {
                        return;
                    }

                    if (reducedMotion) {
                        animation.goToAndStop(0, true);
                    } else if (paused) {
                        animation.pause();
                    }

                    // The Lottie canvas is now ready; remove the geometry
                    // fallback from the Matter renderer.
                    body.render.visible = false;
                    element.classList.add('is-ready');
                    syncItem(item);
                };

                animation.addEventListener('DOMLoaded', reveal);
                animation.addEventListener('data_failed', () => {
                    item.failed = true;
                    body.render.visible = true;
                    animation.destroy();
                    item.animation = null;
                    element.remove();
                });
            })
            .catch(() => {
                // Keep the palette circle if the asset cannot be decoded.
            });
    }

    function sync() {
        if (destroyed) {
            return;
        }

        for (const item of items) {
            syncItem(item);
        }
    }

    function pause() {
        if (destroyed || paused) {
            return;
        }

        paused = true;
        for (const item of items) {
            item.animation?.pause();
        }
    }

    function resume() {
        if (destroyed || !paused) {
            return;
        }

        paused = false;

        if (reducedMotion) {
            return;
        }

        for (const item of items) {
            item.animation?.play();
        }
    }

    function destroy() {
        if (destroyed) {
            return;
        }

        destroyed = true;

        for (const item of items) {
            item.animation?.destroy();
            item.element.remove();
        }

        items.length = 0;
        layer.remove();
    }

    return {
        attach,
        sync,
        pause,
        resume,
        destroy,
    };
}
