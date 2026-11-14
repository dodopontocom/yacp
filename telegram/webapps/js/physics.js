const TEXTURE_URL = new URL('../image/ada-160.png', import.meta.url).href;
const MAX_PIXEL_RATIO = 2;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function pixelRatio() {
    return Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
}

function readPalette() {
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue('--tg-theme-button-color').trim();
    const dark = document.documentElement.dataset.theme === 'dark';

    return (dark
        ? [accent || '#5aa9e6', '#7bd88f', '#ffd166', '#c792ea', '#ff8a80']
        : [accent || '#2f8fd8', '#4f9d69', '#c98a2e', '#8e6bbf', '#c25757']
    ).filter(Boolean);
}

/**
 * Creates one Matter.js scene. The returned object owns every listener and
 * animation frame it starts, so callers can destroy or recreate it safely.
 */
export function createSimulation(stage, { onDragStart, onDragEnd } = {}) {
    const Matter = window.Matter;
    if (!Matter) {
        throw new Error('Matter.js was not loaded.');
    }

    const {
        Engine,
        Render,
        Runner,
        Bodies,
        Body,
        Composite,
        Composites,
        Common,
        Mouse,
        MouseConstraint,
        Events,
        Sleeping,
    } = Matter;

    let width = Math.max(1, stage.clientWidth);
    let height = Math.max(1, stage.clientHeight);
    let destroyed = false;
    let running = false;
    let palette = readPalette();
    let walls = [];
    let adaBodies = [];
    let freeBodies = [];
    let resizeTimer = 0;
    let lastWake = 0;
    let mouse = null;
    let mouseConstraint = null;

    const engine = Engine.create({
        enableSleeping: true,
        positionIterations: 4,
        velocityIterations: 3,
    });
    const world = engine.world;

    engine.gravity.x = 0;
    engine.gravity.y = 1;

    const render = Render.create({
        element: stage,
        engine,
        options: {
            width,
            height,
            pixelRatio: pixelRatio(),
            wireframes: false,
            background: 'transparent',
            showSleeping: false,
            showVelocity: false,
            showAngleIndicator: false,
            showDebug: false,
            showStats: false,
        },
    });

    const runner = Runner.create();

    render.canvas.setAttribute('aria-hidden', 'true');
    render.canvas.style.touchAction = 'none';

    const gravity = { x: 0, y: 1 };
    const targetGravity = { x: 0, y: 1 };

    Events.on(engine, 'beforeUpdate', () => {
        // Smooth the accelerometer input so the bodies do not jitter.
        gravity.x += (targetGravity.x - gravity.x) * 0.12;
        gravity.y += (targetGravity.y - gravity.y) * 0.12;
        engine.gravity.x = gravity.x;
        engine.gravity.y = gravity.y;
    });

    function addWalls(nextWidth, nextHeight) {
        for (const wall of walls) {
            Composite.remove(world, wall);
        }

        const thickness = 80;
        const options = {
            isStatic: true,
            friction: 0.6,
            restitution: 0.15,
            render: { visible: false },
        };

        walls = [
            Bodies.rectangle(
                nextWidth / 2,
                -thickness / 2,
                nextWidth + thickness * 2,
                thickness,
                { ...options },
            ),
            Bodies.rectangle(
                nextWidth / 2,
                nextHeight + thickness / 2,
                nextWidth + thickness * 2,
                thickness,
                { ...options },
            ),
            Bodies.rectangle(
                -thickness / 2,
                nextHeight / 2,
                thickness,
                nextHeight + thickness * 2,
                { ...options },
            ),
            Bodies.rectangle(
                nextWidth + thickness / 2,
                nextHeight / 2,
                thickness,
                nextHeight + thickness * 2,
                { ...options },
            ),
        ];

        Composite.add(world, walls);
    }

    function wakeBodies() {
        for (const body of Composite.allBodies(world)) {
            if (!body.isStatic) {
                Sleeping.set(body, false);
            }
        }
    }

    function setGravity(x, y) {
        const gx = Number(x) || 0;
        const gy = Number(y) || 0;
        const magnitude = Math.hypot(gx, gy);

        // Telegram reports acceleration with the Y axis pointing up, while the
        // canvas points down. Flip Y so an upright phone pulls bodies down.
        // When the device lies flat, X/Y are near zero (Z dominates), so keep
        // the default downward gravity instead of letting bodies float.
        const next = magnitude < 1.2
            ? { x: 0, y: 1 }
            : {
                x: clamp(gx / 9.81, -1.6, 1.6),
                y: clamp(-gy / 9.81, -1.6, 1.6),
            };

        const changed = Math.abs(next.x - targetGravity.x) > 0.08
            || Math.abs(next.y - targetGravity.y) > 0.08;

        targetGravity.x = next.x;
        targetGravity.y = next.y;

        const now = Date.now();
        if (changed && now - lastWake > 250) {
            lastWake = now;
            wakeBodies();
        }
    }

    function resetGravity() {
        targetGravity.x = 0;
        targetGravity.y = 1;
        wakeBodies();
    }

    function addBodies() {
        const columns = Common.clamp(Math.floor((width - 24) / 82), 3, 7);
        const rows = Common.clamp(Math.ceil(24 / columns), 3, 5);
        const cell = Math.max(46, (Math.min(width, 560) - 24) / columns);

        const stack = Composites.stack(
            24,
            Math.max(24, height * 0.05),
            columns,
            rows,
            6,
            6,
            (x, y) => {
                const isAda = Common.random() < 0.62;

                if (isAda) {
                    const radius = Common.clamp(cell * 0.27, 16, 34);
                    const body = Bodies.circle(x, y, radius, {
                        restitution: 0.45,
                        friction: 0.35,
                        frictionAir: 0.012,
                        render: {
                            fillStyle: palette[adaBodies.length % palette.length],
                        },
                    });

                    adaBodies.push(body);
                    return body;
                }

                const bodyWidth = cell * Common.random(0.42, 0.82);
                const bodyHeight = cell * Common.random(0.28, 0.5);
                const body = Bodies.rectangle(x, y, bodyWidth, bodyHeight, {
                    restitution: 0.3,
                    friction: 0.45,
                    frictionAir: 0.014,
                    angle: Common.random(-0.25, 0.25),
                    chamfer: { radius: Math.min(5, bodyHeight / 4) },
                    render: {
                        fillStyle: palette[freeBodies.length % palette.length],
                    },
                });

                freeBodies.push(body);
                return body;
            },
        );

        Composite.add(world, stack);
    }

    function loadAdaTexture() {
        const texture = new Image();
        texture.decoding = 'async';

        texture.onload = () => {
            if (destroyed) {
                return;
            }

            const maxSide = Math.max(texture.naturalWidth, texture.naturalHeight) || 1;

            for (const body of adaBodies) {
                const scale = (body.circleRadius * 2) / maxSide;
                body.render.sprite = {
                    ...body.render.sprite,
                    texture: TEXTURE_URL,
                    xScale: scale,
                    yScale: scale,
                    // Matter anchors sprites at their top-left corner; 0.5
                    // centers the texture on the circular body.
                    xOffset: 0.5,
                    yOffset: 0.5,
                };
            }
        };

        // Without the texture the circles keep their palette color.
        texture.onerror = () => {};
        texture.src = TEXTURE_URL;
    }

    function resize() {
        if (destroyed) {
            return;
        }

        const nextWidth = Math.max(1, stage.clientWidth);
        const nextHeight = Math.max(1, stage.clientHeight);
        const ratio = pixelRatio();

        if (nextWidth === width
            && nextHeight === height
            && ratio === render.options.pixelRatio) {
            return;
        }

        width = nextWidth;
        height = nextHeight;

        if (ratio !== render.options.pixelRatio) {
            render.options.pixelRatio = ratio;
            Render.setPixelRatio(render, ratio);
            if (mouse) {
                mouse.pixelRatio = ratio;
            }
        }

        Render.setSize(render, width, height);
        render.canvas.style.width = '100%';
        render.canvas.style.height = '100%';

        addWalls(width, height);

        for (const body of Composite.allBodies(world)) {
            if (body.isStatic) {
                continue;
            }

            const outside = body.position.x < 0
                || body.position.x > width
                || body.position.y < 0
                || body.position.y > height;

            if (outside) {
                Body.setPosition(body, {
                    x: clamp(body.position.x, 24, Math.max(24, width - 24)),
                    y: clamp(body.position.y, 24, Math.max(24, height - 24)),
                });
                Body.setVelocity(body, { x: 0, y: 0 });
                Sleeping.set(body, false);
            }
        }
    }

    function pause() {
        if (!running || destroyed) {
            return;
        }

        // If the app is minimized mid-drag, drop the constraint so the body
        // does not keep following a stale pointer when the app resumes.
        if (mouseConstraint) {
            mouseConstraint.body = null;
            mouseConstraint.constraint.bodyB = null;
            mouseConstraint.constraint.pointB = null;
        }

        if (mouse) {
            mouse.button = -1;
        }

        Render.stop(render);
        Runner.stop(runner);
        running = false;
    }

    function resume() {
        if (running || destroyed) {
            return;
        }

        Render.run(render);
        Runner.run(runner, engine);
        running = true;
    }

    function refreshTheme() {
        palette = readPalette();

        for (let index = 0; index < freeBodies.length; index += 1) {
            freeBodies[index].render.fillStyle = palette[index % palette.length];
        }

        for (let index = 0; index < adaBodies.length; index += 1) {
            if (!adaBodies[index].render.sprite) {
                adaBodies[index].render.fillStyle = palette[index % palette.length];
            }
        }
    }

    function destroy() {
        if (destroyed) {
            return;
        }

        destroyed = true;
        observer?.disconnect();
        window.clearTimeout(resizeTimer);

        if (running) {
            Render.stop(render);
            Runner.stop(runner);
            running = false;
        }

        Events.off(engine);
        if (mouseConstraint) {
            Events.off(mouseConstraint);
        }

        Composite.clear(world, false, true);
        Engine.clear(engine);

        if (render.canvas?.parentNode) {
            render.canvas.parentNode.removeChild(render.canvas);
        }

        render.textures = {};
        walls = [];
        adaBodies = [];
        freeBodies = [];
    }

    addWalls(width, height);
    addBodies();
    loadAdaTexture();

    mouse = Mouse.create(render.canvas);
    mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: {
            stiffness: 0.2,
            render: { visible: false },
        },
    });
    Composite.add(world, mouseConstraint);
    render.mouse = mouse;

    Events.on(mouseConstraint, 'startdrag', () => onDragStart?.());
    Events.on(mouseConstraint, 'enddrag', () => onDragEnd?.());

    const observer = typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(resize, 120);
        })
        : null;

    observer?.observe(stage);

    Render.run(render);
    Runner.run(runner, engine);
    running = true;

    return {
        destroy,
        pause,
        resume,
        resize,
        refreshTheme,
        setGravity,
        resetGravity,
        isRunning: () => running,
    };
}
