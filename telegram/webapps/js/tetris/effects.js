const FRAME_MS = 1000 / 60;
const MAX_PARTICLES = 500;

export const RIPPLE_MS = 650;

export function spawnBurst(particles, x, y, rgb, count) {
    for (let index = 0; index < count; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.6 + Math.random() * 2;

        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.8,
            age: 0,
            life: 900 + Math.random() * 600,
            size: 2 + Math.random() * 2.5,
            rgb,
        });
    }

    if (particles.length > MAX_PARTICLES) {
        particles.splice(0, particles.length - MAX_PARTICLES);
    }
}

export function addRipple(ripples, x, y, impact) {
    ripples.push({
        x,
        y,
        age: 0,
        strength: Math.min(44, 14 + impact * 4),
    });
}

export function stepEffects(particles, ripples, dt) {
    const frames = dt / FRAME_MS;

    for (const particle of particles) {
        particle.age += dt;
        particle.x += particle.vx * frames;
        particle.y += particle.vy * frames;
        particle.vy += 0.02 * frames;
        particle.vx *= 0.985;
    }

    for (const ripple of ripples) {
        ripple.age += dt;
    }

    const alive = particles.filter((particle) => particle.age < particle.life);
    particles.splice(0, particles.length, ...alive);

    const liveRipples = ripples.filter((ripple) => ripple.age < RIPPLE_MS);
    ripples.splice(0, ripples.length, ...liveRipples);
}
