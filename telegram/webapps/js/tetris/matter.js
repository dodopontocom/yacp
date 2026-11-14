/**
 * Matter.js is loaded from the deferred vendor script. Resolve it lazily so a
 * missing script produces a clear error instead of breaking module evaluation.
 */
export function getMatter() {
    const Matter = window.Matter;

    if (!Matter) {
        throw new Error('Matter.js was not loaded.');
    }

    return Matter;
}
