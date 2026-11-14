import { getMatter } from './matter.js';

export const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export const PIECE_RGB = {
    I: '103, 232, 249',
    O: '253, 224, 71',
    T: '249, 168, 212',
    S: '134, 239, 172',
    Z: '252, 165, 165',
    J: '147, 197, 253',
    L: '253, 186, 116',
};

const SHAPES = {
    I: [[0, 0], [1, 0], [2, 0], [3, 0]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    J: [[0, 0], [0, 1], [1, 1], [2, 1]],
    L: [[2, 0], [0, 1], [1, 1], [2, 1]],
};

export function isPieceBody(body) {
    return body?.plugin?.kind === 'piece';
}

export function createPiece(type, cell, x, y) {
    const { Bodies, Body } = getMatter();
    const cells = SHAPES[type];
    const centerX = cells.reduce((sum, [gridX]) => sum + gridX, 0) / cells.length;
    const centerY = cells.reduce((sum, [, gridY]) => sum + gridY, 0) / cells.length;
    const size = cell * 0.94;

    const parts = cells.map(([gridX, gridY]) => {
        const block = Bodies.rectangle(
            x + (gridX - centerX) * cell,
            y + (gridY - centerY) * cell,
            size,
            size,
            {
                chamfer: { radius: size * 0.2 },
                friction: 0.5,
                restitution: 0.25,
                density: 0.002,
            },
        );

        block.plugin = { size };
        return block;
    });

    const body = Body.create({
        parts,
        friction: 0.5,
        restitution: 0.25,
        frictionAir: 0.012,
    });

    body.plugin = {
        kind: 'piece',
        rgb: PIECE_RGB[type],
        squash: 0,
        fadeStart: null,
    };

    Body.setAngle(body, (Math.random() - 0.5) * 0.8);
    return body;
}
