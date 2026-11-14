/**
 * Tiny cache-safe entry point.
 *
 * Telegram WebViews can keep a very old index.html cached while fetching the
 * new stylesheet. When that happens the old "Soltar as ADAs" markup is paired
 * with the new CSS and the real app module would fail on missing #game.
 *
 * This loader detects that mismatch and reloads with a cache-busting query.
 * It also compares version.json so a stale HTML shell can discover a newer
 * deployment without waiting for the WebView cache to expire.
 */
const CACHE_VERSION = '20261114-3';
const shell = document.querySelector('#game');

function loadApp() {
    import(`./tetris-app.js?v=${CACHE_VERSION}`).catch((error) => {
        console.error('[tetra-zen] failed to load app module', error);

        const hint = document.querySelector('#hint span');
        if (hint) {
            hint.textContent = 'Falha ao carregar o jogo. Recarregue o Mini App.';
        }
    });
}

function reloadWithVersion(version) {
    const url = new URL(window.location.href);
    url.searchParams.set('v', version);
    window.location.replace(url.toString());
}

if (!shell) {
    const url = new URL(window.location.href);

    if (url.searchParams.get('v') !== CACHE_VERSION) {
        reloadWithVersion(CACHE_VERSION);
    } else {
        document.body.innerHTML = '<p style="color:#f4f4f5;font:16px system-ui;padding:24px;text-align:center">'
            + 'O Telegram manteve uma versão antiga do Mini App em cache. '
            + 'Feche e abra novamente.</p>';
    }
} else {
    const currentUrl = new URL(window.location.href);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1500);

    fetch(`./version.json?ts=${Date.now()}`, {
        cache: 'no-store',
        signal: controller.signal,
    })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
            const latest = typeof data?.version === 'string' ? data.version : null;
            const alreadyTargeted = latest && currentUrl.searchParams.get('v') === latest;

            if (latest && latest !== CACHE_VERSION && !alreadyTargeted) {
                reloadWithVersion(latest);
                return;
            }

            loadApp();
        })
        .catch(loadApp)
        .finally(() => window.clearTimeout(timeout));
}
