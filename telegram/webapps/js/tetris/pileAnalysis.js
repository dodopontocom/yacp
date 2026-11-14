import { getMatter } from './matter.js';

const SAMPLE_SPACING_RATIO = 0.4;
const EDGE_INSET_RATIO = 0.3;

/**
 * Finds a horizontal band whose occupied cells cover at least `minCoverage`.
 * A band is the unit that Tetra-Zen dissolves when the pile gets too dense.
 */
export function findClearableBand(bodies, area, cell, minCoverage) {
    if (bodies.length === 0) {
        return null;
    }

    const Matter = getMatter();
    const highest = Math.min(...bodies.map((body) => body.bounds.min.y));
    const spacing = cell * SAMPLE_SPACING_RATIO;
    const xs = [];

    for (let x = area.left + cell * EDGE_INSET_RATIO; x <= area.right - cell * EDGE_INSET_RATIO; x += spacing) {
        xs.push(x);
    }

    for (let row = 0; ; row += 1) {
        const top = area.floor - (row + 1) * cell;

        if (top + cell < highest) {
            return null;
        }

        const y = top + cell / 2;
        let covered = 0;

        for (const x of xs) {
            if (Matter.Query.point(bodies, { x, y }).length > 0) {
                covered += 1;
            }
        }

        const coverage = covered / xs.length;

        if (coverage > 0 && coverage >= minCoverage) {
            return { top, bottom: top + cell };
        }
    }
}
