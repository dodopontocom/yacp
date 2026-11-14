import { TUNING } from './tuning.js';
import { createPiece, isPieceBody, PIECE_TYPES } from './pieces.js';
import { addRipple, spawnBurst, stepEffects } from './effects.js';
import { findClearableBand } from './pileAnalysis.js';
import { DISSOLVE_CHIME } from './marimba.js';
import { drawBackground, drawEffects, drawPiece } from './renderer.js';
import { getMatter } from './matter.js';

const WALL_THICKNESS = 60;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function createBoundaries(width, height, floorY = height) {
    const Matter = getMatter();
    const wallOptions = { isStatic: true, friction: 0.2, restitution: 0.2 };

    const floor = Matter.Bodies.rectangle(
        width / 2,
        floorY + WALL_THICKNESS / 2,
        width + WALL_THICKNESS * 2,
        WALL_THICKNESS,
        { ...wallOptions, friction: 0.8 },
    );
    const left = Matter.Bodies.rectangle(
        -WALL_THICKNESS / 2,
        -height / 2,
        WALL_THICKNESS,
        height * 4,
        wallOptions,
    );
    const right = Matter.Bodies.rectangle(
        width + WALL_THICKNESS / 2,
        -height / 2,
        WALL_THICKNESS,
        height * 4,
        wallOptions,
    );

    return [floor, left, right];
}

function passThrough(body) {
    const filter = { group: 0, category: 0, mask: 0 };

    body.collisionFilter = { ...filter };

    for (const part of body.parts) {
        part.collisionFilter = { ...filter };
    }
}

export class TetraZenWorld {
    constructor({
        canvas,
        audio,
        mode = 'zen',
        onStats,
        onDissolve,
        onDragStart,
        onDragEnd,
        getBottomInset,
    }) {
        const Matter = getMatter();
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('2D canvas is not available in this browser.');
        }

        this.Matter = Matter;
        this.canvas = canvas;
        this.ctx = ctx;
        this.audio = audio;
        this.onStats = onStats;
        this.onDissolve = onDissolve;
        this.onDragStart = onDragStart;
        this.onDragEnd = onDragEnd;
        this.getBottomInset = getBottomInset;
        this.mode = mode;

        this.engine = Matter.Engine.create({
            gravity: { x: 0, y: 1, scale: 0.001 },
        });

        this.mouse = Matter.Mouse.create(canvas);
        this.mouseConstraint = Matter.MouseConstraint.create(this.engine, {
            mouse: this.mouse,
            constraint: {
                stiffness: 0.2,
                damping: 0.1,
                render: { visible: false },
            },
        });
        Matter.Composite.add(this.engine.world, this.mouseConstraint);

        Matter.Events.on(this.mouseConstraint, 'startdrag', () => this.onDragStart?.());
        Matter.Events.on(this.mouseConstraint, 'enddrag', () => this.onDragEnd?.());

        this.width = 0;
        this.height = 0;
        this.floorY = 0;
        this.bottomInset = 0;
        this.dpr = 1;
        this.cell = 30;
        this.walls = [];
        this.pieces = [];
        this.dissolving = [];
        this.particles = [];
        this.ripples = [];
        this.rotations = new Map();
        this.bag = [];
        this.pointer = null;
        this.score = 0;
        this.roundOver = false;
        this.time = 0;
        this.accumulator = 0;
        this.lastFrameAt = 0;
        this.frameId = 0;
        this.lastStatsAt = Number.NEGATIVE_INFINITY;
        this.spawnTimer = 0;
        this.densityTimer = 0;
        this.dissolveCooldown = 0;
        this.dangerMs = 0;
        this.slowMoStart = null;
        this.zeroGRemaining = 0;
        this.shiftRemaining = 0;
        this.shiftDirection = 1;
        this.breezeRemaining = 0;
        this.breezeCooldown = randomBetween(TUNING.breezeMinIntervalMs, TUNING.breezeMaxIntervalMs);
        this.breezeDirection = 1;
        this.tilt = null;
        this.gravityX = 0;
        this.gravityY = 1;
        this.running = false;
        this.destroyed = false;
    }

    start() {
        if (this.running || this.destroyed) {
            return;
        }

        this.resize();
        window.addEventListener('resize', this.resize);
        this.canvas.addEventListener('pointerdown', this.handlePointerDown);
        this.canvas.addEventListener('pointerup', this.handlePointerUp);
        this.canvas.addEventListener('pointercancel', this.handlePointerCancel);
        this.Matter.Events.on(this.engine, 'collisionStart', this.handleCollision);

        this.spawnPiece();
        this.lastFrameAt = performance.now();
        this.accumulator = 0;
        this.running = true;
        this.frameId = requestAnimationFrame(this.frame);
    }

    pause() {
        if (!this.running) {
            return;
        }

        this.running = false;
        cancelAnimationFrame(this.frameId);
        this.pointer = null;
        this.mouse.button = -1;
        this.mouseConstraint.body = null;
        this.mouseConstraint.constraint.bodyB = null;
        this.mouseConstraint.constraint.pointB = null;
        this.Matter.Mouse.clearSourceEvents(this.mouse);
    }

    resume() {
        if (this.running || this.destroyed) {
            return;
        }

        this.lastFrameAt = performance.now();
        this.accumulator = 0;
        this.running = true;
        this.frameId = requestAnimationFrame(this.frame);
    }

    destroy() {
        if (this.destroyed) {
            return;
        }

        this.pause();
        this.destroyed = true;
        window.removeEventListener('resize', this.resize);
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
        this.canvas.removeEventListener('pointerup', this.handlePointerUp);
        this.canvas.removeEventListener('pointercancel', this.handlePointerCancel);
        this.Matter.Events.off(this.engine, 'collisionStart', this.handleCollision);
        this.Matter.Events.off(this.mouseConstraint);

        for (const eventName of ['mousemove', 'mousedown', 'mouseup', 'wheel', 'touchmove', 'touchstart', 'touchend']) {
            this.canvas.removeEventListener(eventName, this.mouse[eventName === 'wheel' ? 'mousewheel' : eventName]);
        }

        this.Matter.Composite.remove(this.engine.world, this.mouseConstraint);
        this.Matter.Composite.clear(this.engine.world, false, true);
        this.Matter.Engine.clear(this.engine);
    }

    setMode(mode) {
        this.mode = mode;
        this.reset();
    }

    reset() {
        for (const body of [...this.pieces, ...this.dissolving]) {
            this.Matter.Composite.remove(this.engine.world, body);
        }

        this.pointer = null;
        this.mouse.button = -1;
        this.mouseConstraint.body = null;
        this.mouseConstraint.constraint.bodyB = null;
        this.mouseConstraint.constraint.pointB = null;

        this.pieces = [];
        this.dissolving = [];
        this.particles = [];
        this.ripples = [];
        this.rotations.clear();
        this.score = 0;
        this.roundOver = false;
        this.dangerMs = 0;
        this.dissolveCooldown = 0;
        this.slowMoStart = null;
        this.zeroGRemaining = 0;
        this.shiftRemaining = 0;
        this.spawnTimer = 0;
        this.spawnPiece();
        this.emitStats(true);
    }

    dropNext() {
        if (this.roundOver) {
            return;
        }

        this.spawnPiece(true);
        this.spawnTimer = 0;
    }

    floatZeroG() {
        if (this.zeroGRemaining > 0) {
            return;
        }

        this.zeroGRemaining = TUNING.zeroGMs;
        this.emitStats(true);
    }

    shiftGravity() {
        this.shiftDirection = this.shiftDirection === 1 ? -1 : 1;
        this.shiftRemaining = TUNING.gravityShiftMs;
        this.emitStats(true);
    }

    setTilt(value) {
        this.tilt = value === null ? null : clamp(value, -1, 1) * TUNING.tiltMaxGravity;
    }

    resize = () => {
        if (this.destroyed) {
            return;
        }

        const rect = this.canvas.getBoundingClientRect();

        if (rect.width < 1 || rect.height < 1) {
            return;
        }

        const previousWidth = this.width;

        this.width = rect.width;
        this.height = rect.height;
        this.dpr = Math.min(window.devicePixelRatio || 1, 3);
        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        this.canvas.dataset.pixelRatio = String(this.dpr);
        this.cell = clamp(Math.min(this.width / 12, this.height / 15), 20, 46);
        this.bottomInset = Math.max(0, Number(this.getBottomInset?.()) || 0);
        this.floorY = Math.max(1, this.height - this.bottomInset);

        // Matter maps pointer coordinates using this ratio. Without it, drags
        // are offset by the device pixel ratio on high-DPI screens.
        this.mouse.pixelRatio = this.dpr;

        for (const wall of this.walls) {
            this.Matter.Composite.remove(this.engine.world, wall);
        }

        this.walls = createBoundaries(this.width, this.height, this.floorY);
        this.Matter.Composite.add(this.engine.world, this.walls);

        if (previousWidth > 0 && previousWidth !== this.width) {
            this.reset();
        }
    };

    frame = (now) => {
        if (!this.running) {
            return;
        }

        const elapsed = Math.min(now - this.lastFrameAt, 100);
        this.lastFrameAt = now;
        this.accumulator = Math.min(
            this.accumulator + elapsed,
            TUNING.stepMs * TUNING.maxCatchUpSteps,
        );

        while (this.accumulator >= TUNING.stepMs) {
            this.step(TUNING.stepMs);
            this.accumulator -= TUNING.stepMs;
        }

        this.render();
        this.emitStats();
        this.frameId = requestAnimationFrame(this.frame);
    };

    step(dt) {
        this.time += dt;
        this.updateTimers(dt);
        this.updateGravity();
        this.updateBreeze(dt);
        this.engine.timing.timeScale = this.physicsTimeScale();
        this.Matter.Engine.update(this.engine, dt);
        this.updateRotations(dt);
        this.removeFadedPieces();

        for (const piece of this.pieces) {
            piece.plugin.squash *= TUNING.squashDecay;
        }

        stepEffects(this.particles, this.ripples, dt);
    }

    updateTimers(dt) {
        this.zeroGRemaining = Math.max(0, this.zeroGRemaining - dt);
        this.shiftRemaining = Math.max(0, this.shiftRemaining - dt);
        this.dissolveCooldown = Math.max(0, this.dissolveCooldown - dt);
        this.spawnTimer += dt;

        if (!this.roundOver && this.spawnTimer >= TUNING.spawnIntervalMs) {
            this.spawnTimer = 0;
            this.spawnPiece();
        }

        this.densityTimer += dt;

        if (this.densityTimer >= TUNING.densityCheckMs) {
            this.densityTimer = 0;
            this.evaluatePile();
        }
    }

    updateGravity() {
        const sway = Math.sin(this.time / 1700) * TUNING.ambientSway
            + Math.sin(this.time / 530) * TUNING.ambientSway * 0.25;
        const base = this.tilt ?? sway;
        const shift = this.shiftRemaining > 0
            ? this.shiftDirection * TUNING.gravityShiftStrength
            : 0;
        const targetX = clamp(base + shift, -1, 1);
        const targetY = this.zeroGRemaining > 0 ? 0 : 1;

        this.gravityX += (targetX - this.gravityX) * TUNING.gravityEase;
        this.gravityY += (targetY - this.gravityY) * TUNING.gravityEase;
        this.engine.gravity.x = this.gravityX;
        this.engine.gravity.y = this.gravityY;
    }

    updateBreeze(dt) {
        if (this.breezeRemaining > 0) {
            this.breezeRemaining -= dt;

            for (const piece of this.pieces) {
                this.Matter.Body.applyForce(piece, piece.position, {
                    x: this.breezeDirection * TUNING.breezeStrength * piece.mass * 0.001,
                    y: 0,
                });
            }

            return;
        }

        this.breezeCooldown -= dt;

        if (this.breezeCooldown <= 0) {
            this.breezeRemaining = TUNING.breezeMs;
            this.breezeDirection = Math.random() < 0.5 ? -1 : 1;
            this.breezeCooldown = randomBetween(
                TUNING.breezeMinIntervalMs,
                TUNING.breezeMaxIntervalMs,
            );
        }
    }

    physicsTimeScale() {
        if (this.slowMoStart === null) {
            return 1;
        }

        const elapsed = this.time - this.slowMoStart;

        if (elapsed < TUNING.slowMoHoldMs) {
            return TUNING.slowMoScale;
        }

        const progress = clamp(
            (elapsed - TUNING.slowMoHoldMs) / TUNING.slowMoRecoverMs,
            0,
            1,
        );

        if (progress >= 1) {
            this.slowMoStart = null;
            return 1;
        }

        const eased = progress * progress * (3 - 2 * progress);
        return TUNING.slowMoScale + (1 - TUNING.slowMoScale) * eased;
    }

    evaluatePile() {
        if (this.roundOver || this.pieces.length === 0) {
            this.dangerMs = 0;
            return;
        }

        const highest = Math.min(...this.pieces.map((piece) => piece.bounds.min.y));
        this.dangerMs = highest < this.cell * TUNING.dangerLineCells
            ? this.dangerMs + TUNING.densityCheckMs
            : 0;

        if (this.mode === 'attack' && this.dangerMs >= TUNING.attackDangerMs) {
            this.roundOver = true;
            this.emitStats(true);
            return;
        }

        if (this.dissolveCooldown > 0) {
            return;
        }

        const area = { left: 0, right: this.width, floor: this.floorY };
        const dense = findClearableBand(this.pieces, area, this.cell, TUNING.denseCoverage);
        const band = dense
            ?? (this.dangerMs >= TUNING.zenDangerMs
                ? findClearableBand(this.pieces, area, this.cell, 0)
                : null);

        if (band) {
            this.dissolveBand(band);
        }
    }

    dissolveBand(band) {
        const margin = this.cell * 0.3;
        const victims = this.pieces.filter(
            (piece) => piece.position.y >= band.top - margin
                && piece.position.y <= band.bottom + margin,
        );

        if (victims.length === 0) {
            return;
        }

        const victimSet = new Set(victims);
        this.pieces = this.pieces.filter((piece) => !victimSet.has(piece));

        for (const piece of victims) {
            this.rotations.delete(piece);
            this.beginDissolve(piece);
        }

        this.dissolveCooldown = TUNING.dissolveCooldownMs;
        this.dangerMs = 0;
        this.slowMoStart = this.time;
        this.audio.chime(DISSOLVE_CHIME);

        if (this.mode === 'attack') {
            this.score += victims.length * TUNING.pointsPerPiece;
        }

        this.onDissolve?.(victims.length);
    }

    beginDissolve(piece) {
        piece.plugin.fadeStart = this.time;
        passThrough(piece);
        this.dissolving.push(piece);

        for (const block of piece.parts.slice(1)) {
            spawnBurst(
                this.particles,
                block.position.x,
                block.position.y,
                piece.plugin.rgb,
                TUNING.burstPerBlock,
            );
        }
    }

    removeFadedPieces() {
        const remaining = [];

        for (const piece of this.dissolving) {
            const fadeStart = piece.plugin.fadeStart ?? this.time;

            if (this.time - fadeStart >= TUNING.dissolveFadeMs) {
                this.Matter.Composite.remove(this.engine.world, piece);
            } else {
                remaining.push(piece);
            }
        }

        this.dissolving = remaining;
    }

    updateRotations(dt) {
        for (const [piece, rotation] of this.rotations) {
            rotation.age += dt;
            const remaining = rotation.target - piece.angle;

            if (
                Math.abs(remaining) < TUNING.rotateEpsilon
                || rotation.age > TUNING.rotateTimeoutMs
            ) {
                this.Matter.Body.setAngularVelocity(piece, 0);
                this.rotations.delete(piece);
                continue;
            }

            const speed = clamp(
                remaining * TUNING.rotateGain,
                -TUNING.rotateMaxSpeed,
                TUNING.rotateMaxSpeed,
            );
            this.Matter.Body.setAngularVelocity(piece, speed);
        }
    }

    spawnPiece(kick = false) {
        const type = this.nextPieceType();
        const x = this.width / 2 + randomBetween(-0.15, 0.15) * this.width;
        const piece = createPiece(type, this.cell, x, -this.cell * 2);

        this.Matter.Body.setVelocity(piece, {
            x: randomBetween(-0.4, 0.4),
            y: kick ? TUNING.dropKick : 0.5,
        });
        this.Matter.Composite.add(this.engine.world, piece);
        this.pieces.push(piece);
    }

    nextPieceType() {
        if (this.bag.length === 0) {
            this.bag = [...PIECE_TYPES].sort(() => Math.random() - 0.5);
        }

        return this.bag.pop();
    }

    emitStats(force = false) {
        const now = performance.now();

        if (!force && now - this.lastStatsAt < TUNING.statsIntervalMs) {
            return;
        }

        this.lastStatsAt = now;
        this.onStats?.({
            score: this.score,
            zeroG: this.zeroGRemaining > 0,
            gravityShifting: this.shiftRemaining > 0,
            roundOver: this.roundOver,
        });
    }

    rotatePiece(piece) {
        const base = this.rotations.get(piece)?.target ?? piece.angle;
        this.rotations.set(piece, { target: base + Math.PI / 2, age: 0 });
    }

    localPoint(event) {
        const rect = this.canvas.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    handlePointerDown = (event) => {
        this.audio.resume();

        try {
            this.canvas.setPointerCapture?.(event.pointerId);
        } catch {
            /* pointer capture is best-effort */
        }

        const point = this.localPoint(event);
        const piece = this.Matter.Query.point(this.pieces, point).find(isPieceBody) ?? null;

        this.pointer = {
            x: point.x,
            y: point.y,
            time: performance.now(),
            piece,
        };
    };

    handlePointerUp = (event) => {
        const track = this.pointer;
        this.pointer = null;

        try {
            this.canvas.releasePointerCapture?.(event.pointerId);
        } catch {
            /* pointer capture is best-effort */
        }

        if (!track) {
            return;
        }

        const point = this.localPoint(event);
        const dx = point.x - track.x;
        const dy = point.y - track.y;
        const elapsed = performance.now() - track.time;

        if (Math.hypot(dx, dy) <= TUNING.tapMaxPx && elapsed <= TUNING.tapMaxMs) {
            if (track.piece && this.pieces.includes(track.piece)) {
                this.rotatePiece(track.piece);
            }

            return;
        }

        const isSwipeDown = dy >= TUNING.swipeMinPx
            && Math.abs(dx) <= dy * 0.6
            && elapsed <= TUNING.swipeMaxMs;

        if (isSwipeDown && !track.piece) {
            this.dropNext();
        }
    };

    handlePointerCancel = (event) => {
        this.pointer = null;

        try {
            this.canvas.releasePointerCapture?.(event.pointerId);
        } catch {
            /* pointer capture is best-effort */
        }
    };

    handleCollision = (event) => {
        for (const pair of event.pairs) {
            const { bodyA, bodyB } = pair;
            const impact = this.Matter.Vector.magnitude(
                this.Matter.Vector.sub(bodyA.velocity, bodyB.velocity),
            );

            if (impact < TUNING.minImpact) {
                continue;
            }

            const contact = pair.collision.supports[0] ?? bodyA.position;
            this.audio.playImpact(impact);
            addRipple(this.ripples, contact.x, contact.y, impact);

            const squash = Math.min(
                TUNING.maxSquash,
                impact * TUNING.squashPerImpact,
            );

            for (const body of [bodyA, bodyB]) {
                if (isPieceBody(body)) {
                    body.plugin.squash = Math.max(body.plugin.squash, squash);
                }
            }
        }
    };

    render() {
        const { ctx } = this;

        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        drawBackground(ctx, this.width, this.height, this.floorY);

        for (const piece of this.pieces) {
            drawPiece(ctx, piece, 1, this.dpr);
        }

        for (const piece of this.dissolving) {
            const fadeStart = piece.plugin.fadeStart ?? this.time;
            const alpha = clamp(
                1 - (this.time - fadeStart) / TUNING.dissolveFadeMs,
                0,
                1,
            );
            drawPiece(ctx, piece, alpha, this.dpr);
        }

        drawEffects(ctx, this.particles, this.ripples);
    }
}
