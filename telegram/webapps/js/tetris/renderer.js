import { RIPPLE_MS } from './effects.js';

const BACKGROUND = '#0f1115';

export function drawBackground(ctx, width, height, floorY = height) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(
        width / 2,
        height * 0.35,
        0,
        width / 2,
        height * 0.35,
        Math.max(width, height) * 0.6,
    );

    glow.addColorStop(0, 'rgba(148, 163, 184, 0.07)');
    glow.addColorStop(1, 'rgba(148, 163, 184, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // A very quiet grid gives the pile a sense of place without competing with
    // the neon pieces.
    const grid = Math.max(32, Math.round(Math.min(width, height) / 18));
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.028)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = grid; x < width; x += grid) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }

    for (let y = grid; y < height; y += grid) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }

    ctx.stroke();

    const floor = ctx.createLinearGradient(0, 0, width, 0);
    floor.addColorStop(0, 'rgba(103, 232, 249, 0)');
    floor.addColorStop(0.5, 'rgba(103, 232, 249, 0.22)');
    floor.addColorStop(1, 'rgba(103, 232, 249, 0)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, floorY - 2, width, 2);
}

export function drawPiece(ctx, piece, alpha, dpr) {
    const { rgb, squash } = piece.plugin;
    const cos = Math.cos(piece.angle);
    const sin = Math.sin(piece.angle);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(piece.position.x, piece.position.y);
    ctx.rotate(piece.angle);
    ctx.scale(1 + squash, 1 - squash);

    for (const block of piece.parts.slice(1)) {
        const dx = block.position.x - piece.position.x;
        const dy = block.position.y - piece.position.y;

        ctx.save();
        ctx.translate(dx * cos + dy * sin, -dx * sin + dy * cos);
        ctx.rotate(block.angle - piece.angle);
        drawBlock(ctx, block.plugin.size, rgb, dpr);
        ctx.restore();
    }

    ctx.restore();
}

function drawBlock(ctx, size, rgb, dpr) {
    const half = size / 2;

    roundedRect(ctx, -half, -half, size, size, size * 0.2);

    const fill = ctx.createLinearGradient(0, -half, 0, half);
    fill.addColorStop(0, `rgba(${rgb}, 0.5)`);
    fill.addColorStop(1, `rgba(${rgb}, 0.14)`);
    ctx.fillStyle = fill;
    ctx.shadowColor = `rgba(${rgb}, 0.45)`;
    ctx.shadowBlur = 10 * dpr;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = `rgba(${rgb}, 0.8)`;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-half * 0.6, -half * 0.55);
    ctx.lineTo(half * 0.2, -half * 0.55);
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();
}

export function drawEffects(ctx, particles, ripples) {
    ctx.globalAlpha = 1;

    for (const ripple of ripples) {
        const progress = ripple.age / RIPPLE_MS;

        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, 6 + progress * ripple.strength, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * (1 - progress)})`;
        ctx.stroke();
    }

    ctx.globalCompositeOperation = 'lighter';

    for (const particle of particles) {
        const life = 1 - particle.age / particle.life;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * (0.5 + life * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${particle.rgb}, ${life * 0.9})`;
        ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
}

function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
}
