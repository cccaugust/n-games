// entities.js

export class Entity {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.markedForDeletion = false;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    update() { }
}

export class Player extends Entity {
    constructor(x, y) {
        super(x, y, 18, '#3498db');
        this.baseSpeed = 4;
        this.speed = 4;
        this.maxHp = 100;
        this.hp = 100;
        this.level = 1;
        this.xp = 0;
        this.nextLevelXp = 100;
        this.image = null;

        // Sprite animation
        this.spriteFrames = null; // Array of { image, durationMs }
        this.spriteWidth = 32;
        this.spriteHeight = 32;
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.facingLeft = false;

        // Guard
        this.isGuarding = false;
        this.guardCooldown = 0;
        this.guardDamage = 20;

        // Buffs
        this.attackMult = 1;
        this.speedBuff = 0;
        this.magnetBuff = 0;
        this.magnetRange = 100;

        // Invincibility
        this.invincible = false;
        this.invincibleTimer = 0;

        // Weapons
        this.weapons = {
            orbit: {
                active: true,
                count: 1,
                radius: 80,
                speed: 0.05,
                angle: 0,
                damage: 25,
                size: 10
            },
            autoShoot: {
                active: true,
                level: 1,
                cooldown: 0,
                maxCooldown: 50,
                damage: 20,
                speed: 10
            }
        };
    }

    update(input, width, height) {
        // Guard handling
        if (input.guardPressed && this.guardCooldown <= 0) {
            this.isGuarding = true;
        } else {
            this.isGuarding = false;
        }

        if (this.guardCooldown > 0) this.guardCooldown--;

        // Invincibility
        if (this.invincible) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }

        // Speed buff
        if (this.speedBuff > 0) {
            this.speedBuff--;
            if (this.speedBuff <= 0) {
                this.speed = this.baseSpeed;
            }
        }

        // Magnet buff
        if (this.magnetBuff > 0) {
            this.magnetBuff--;
        }

        // Movement
        let mx = 0;
        let my = 0;

        if (input.keys['ArrowUp'] || input.keys['w']) my -= 1;
        if (input.keys['ArrowDown'] || input.keys['s']) my += 1;
        if (input.keys['ArrowLeft'] || input.keys['a']) mx -= 1;
        if (input.keys['ArrowRight'] || input.keys['d']) mx += 1;

        if (input.joystick) {
            mx += input.joystick.x || 0;
            my += input.joystick.y || 0;
        }

        const len = Math.hypot(mx, my);
        if (len > 1) {
            mx /= len;
            my /= len;
        }

        // Update facing direction
        if (mx < -0.1) this.facingLeft = true;
        else if (mx > 0.1) this.facingLeft = false;

        // Slower when guarding
        const speedMult = this.isGuarding ? 0.3 : 1;
        this.x += mx * this.speed * speedMult;
        this.y += my * this.speed * speedMult;

        // Boundaries
        this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));

        // Weapon Updates
        this.weapons.orbit.angle += this.weapons.orbit.speed;
        if (this.weapons.autoShoot.cooldown > 0) this.weapons.autoShoot.cooldown--;

        // Animation
        if (this.spriteFrames && this.spriteFrames.length > 0) {
            this.frameTimer += 16.67; // Approximate frame time
            const currentFrameData = this.spriteFrames[this.currentFrame];
            if (this.frameTimer >= currentFrameData.durationMs) {
                this.frameTimer = 0;
                this.currentFrame = (this.currentFrame + 1) % this.spriteFrames.length;
            }
        }
    }

    draw(ctx) {
        // Draw Orbit Weapon
        if (this.weapons.orbit.active) {
            for (let i = 0; i < this.weapons.orbit.count; i++) {
                const angle = this.weapons.orbit.angle + (i * (Math.PI * 2 / this.weapons.orbit.count));
                const wx = this.x + Math.cos(angle) * this.weapons.orbit.radius;
                const wy = this.y + Math.sin(angle) * this.weapons.orbit.radius;

                // Glow effect
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#f1c40f';

                ctx.beginPath();
                ctx.arc(wx, wy, this.weapons.orbit.size, 0, Math.PI * 2);
                ctx.fillStyle = '#f1c40f';
                ctx.fill();

                ctx.shadowBlur = 0;
            }
        }

        // Invincibility flash
        if (this.invincible && Math.floor(this.invincibleTimer / 3) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Draw Player Sprite
        const drawSize = 50;
        if (this.spriteFrames && this.spriteFrames.length > 0) {
            const frame = this.spriteFrames[this.currentFrame];
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            if (this.facingLeft) {
                ctx.translate(this.x, this.y);
                ctx.scale(-1, 1);
                ctx.drawImage(frame.image, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            } else {
                ctx.drawImage(frame.image, this.x - drawSize / 2, this.y - drawSize / 2, drawSize, drawSize);
            }
            ctx.restore();
        } else if (this.image) {
            ctx.save();
            if (this.facingLeft) {
                ctx.translate(this.x, this.y);
                ctx.scale(-1, 1);
                ctx.drawImage(this.image, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            } else {
                ctx.drawImage(this.image, this.x - drawSize / 2, this.y - drawSize / 2, drawSize, drawSize);
            }
            ctx.restore();
        } else {
            super.draw(ctx);
        }

        ctx.globalAlpha = 1;
    }
}

export class Enemy extends Entity {
    constructor(x, y, player, typeData) {
        super(x, y, 14, 'red');
        this.player = player;
        this.speed = Math.random() * 0.8 + 1.2;
        this.hp = 15 + (player.level * 4);
        this.damage = 5 + Math.floor(player.level / 2);
        this.xpValue = 10;

        // Appearance
        this.image = typeData.image || null;
        this.spriteFrames = typeData.spriteFrames || null;
        this.spriteWidth = typeData.spriteWidth || 32;
        this.spriteHeight = typeData.spriteHeight || 32;
        this.currentFrame = 0;
        this.frameTimer = 0;

        // Behavior
        this.behavior = typeData.behavior || 'chase';
        this.behaviorTimer = 0;
        this.behaviorState = 0;

        // For zigzag
        this.zigzagOffset = Math.random() * Math.PI * 2;

        // For orbit
        this.orbitAngle = Math.random() * Math.PI * 2;
        this.orbitRadius = 150 + Math.random() * 100;

        // For dash
        this.dashCooldown = 60 + Math.floor(Math.random() * 60);
        this.isDashing = false;
        this.dashVelX = 0;
        this.dashVelY = 0;

        // For shy
        this.shyDistance = 100 + Math.random() * 50;

        // Collision flags
        this.hitThisFrame = false;
        this.hitByWave = false;
    }

    update(canvasWidth, canvasHeight) {
        this.behaviorTimer++;

        // Animation
        if (this.spriteFrames && this.spriteFrames.length > 0) {
            this.frameTimer += 16.67;
            const currentFrameData = this.spriteFrames[this.currentFrame];
            if (this.frameTimer >= currentFrameData.durationMs) {
                this.frameTimer = 0;
                this.currentFrame = (this.currentFrame + 1) % this.spriteFrames.length;
            }
        }

        const dx = this.player.x - this.x;
        const dy = this.player.y - this.y;
        const dist = Math.hypot(dx, dy);

        switch (this.behavior) {
            case 'chase':
                // Simple chase
                if (dist > 0) {
                    this.x += (dx / dist) * this.speed;
                    this.y += (dy / dist) * this.speed;
                }
                break;

            case 'zigzag':
                // Chase with sine wave offset
                if (dist > 0) {
                    const baseAngle = Math.atan2(dy, dx);
                    const zigzag = Math.sin(this.behaviorTimer * 0.1 + this.zigzagOffset) * 0.8;
                    const angle = baseAngle + zigzag;
                    this.x += Math.cos(angle) * this.speed;
                    this.y += Math.sin(angle) * this.speed;
                }
                break;

            case 'orbit':
                // Circle around player, slowly closing in
                this.orbitAngle += 0.03;
                this.orbitRadius = Math.max(50, this.orbitRadius - 0.3);
                const targetX = this.player.x + Math.cos(this.orbitAngle) * this.orbitRadius;
                const targetY = this.player.y + Math.sin(this.orbitAngle) * this.orbitRadius;
                const toDx = targetX - this.x;
                const toDy = targetY - this.y;
                const toDist = Math.hypot(toDx, toDy);
                if (toDist > 0) {
                    this.x += (toDx / toDist) * this.speed * 1.5;
                    this.y += (toDy / toDist) * this.speed * 1.5;
                }
                break;

            case 'dash':
                // Periodically dash toward player
                this.dashCooldown--;
                if (this.isDashing) {
                    this.x += this.dashVelX;
                    this.y += this.dashVelY;
                    this.dashVelX *= 0.95;
                    this.dashVelY *= 0.95;
                    if (Math.hypot(this.dashVelX, this.dashVelY) < 0.5) {
                        this.isDashing = false;
                        this.dashCooldown = 60 + Math.floor(Math.random() * 60);
                    }
                } else if (this.dashCooldown <= 0 && dist < 300) {
                    // Start dash
                    this.isDashing = true;
                    const dashSpeed = 12;
                    this.dashVelX = (dx / dist) * dashSpeed;
                    this.dashVelY = (dy / dist) * dashSpeed;
                } else {
                    // Slow approach
                    if (dist > 0) {
                        this.x += (dx / dist) * this.speed * 0.3;
                        this.y += (dy / dist) * this.speed * 0.3;
                    }
                }
                break;

            case 'shy':
                // Approaches but retreats when too close
                if (dist < this.shyDistance) {
                    // Retreat
                    if (dist > 0) {
                        this.x -= (dx / dist) * this.speed * 0.8;
                        this.y -= (dy / dist) * this.speed * 0.8;
                    }
                } else if (dist > this.shyDistance + 50) {
                    // Approach
                    if (dist > 0) {
                        this.x += (dx / dist) * this.speed;
                        this.y += (dy / dist) * this.speed;
                    }
                }
                // Add some random movement
                this.x += (Math.random() - 0.5) * 1.5;
                this.y += (Math.random() - 0.5) * 1.5;
                break;

            default:
                // Default chase
                if (dist > 0) {
                    this.x += (dx / dist) * this.speed;
                    this.y += (dy / dist) * this.speed;
                }
        }

        // Keep in bounds (with some margin)
        this.x = Math.max(-50, Math.min(canvasWidth + 50, this.x));
        this.y = Math.max(-50, Math.min(canvasHeight + 50, this.y));
    }

    draw(ctx) {
        const drawSize = 40;
        const facingLeft = this.x < this.player.x;

        if (this.spriteFrames && this.spriteFrames.length > 0) {
            const frame = this.spriteFrames[this.currentFrame];
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            if (facingLeft) {
                ctx.translate(this.x, this.y);
                ctx.scale(-1, 1);
                ctx.drawImage(frame.image, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            } else {
                ctx.drawImage(frame.image, this.x - drawSize / 2, this.y - drawSize / 2, drawSize, drawSize);
            }
            ctx.restore();
        } else if (this.image) {
            ctx.save();
            if (facingLeft) {
                ctx.translate(this.x, this.y);
                ctx.scale(-1, 1);
                ctx.drawImage(this.image, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            } else {
                ctx.drawImage(this.image, this.x - drawSize / 2, this.y - drawSize / 2, drawSize, drawSize);
            }
            ctx.restore();
        } else {
            super.draw(ctx);
        }

        // HP bar
        const barWidth = 30;
        const barHeight = 4;
        const barX = this.x - barWidth / 2;
        const barY = this.y - drawSize / 2 - 8;
        const hpPercent = Math.max(0, this.hp / (15 + this.player.level * 4));

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = hpPercent > 0.3 ? '#2ecc71' : '#e74c3c';
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
    }
}

export class Projectile extends Entity {
    constructor(x, y, velocity, damage) {
        super(x, y, 7, '#e74c3c');
        this.velocity = velocity;
        this.damage = damage;
        this.trail = [];
    }

    update() {
        // Trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 5) this.trail.shift();

        this.x += this.velocity.x;
        this.y += this.velocity.y;

        if (this.x < -100 || this.x > 2000 || this.y < -100 || this.y > 2000) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        // Trail
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            const alpha = (i + 1) / this.trail.length * 0.5;
            const size = this.radius * (i + 1) / this.trail.length;
            ctx.beginPath();
            ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(231, 76, 60, ${alpha})`;
            ctx.fill();
        }

        // Main projectile
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#e74c3c';
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

export class Particle extends Entity {
    constructor(x, y, color, velocity, type = 'normal') {
        super(x, y, Math.random() * 4 + 2, color);
        this.velocity = velocity;
        this.life = 1.0;
        this.decay = Math.random() * 0.04 + 0.02;
        this.type = type;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.3;
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.velocity.x *= 0.98;
        this.velocity.y *= 0.98;
        this.life -= this.decay;
        this.radius *= 0.97;
        this.rotation += this.rotationSpeed;

        if (this.life <= 0) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;

        if (this.type === 'sparkle') {
            // Star shape
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const x = Math.cos(angle) * this.radius;
                const y = Math.sin(angle) * this.radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = this.color;
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        ctx.restore();
    }
}

export class ExperienceGem extends Entity {
    constructor(x, y, value) {
        super(x, y, 6, '#2ecc71');
        this.value = value;
        this.magnetized = false;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.bobTimer = 0;
    }

    update(player, magnetRange = 100) {
        const dist = Math.hypot(player.x - this.x, player.y - this.y);

        if (dist < magnetRange) {
            this.magnetized = true;
        }

        if (this.magnetized) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const speed = 14;

            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * speed;
            this.y += Math.sin(angle) * speed;

            if (dist < player.radius + 5) {
                this.markedForDeletion = true;
            }
        }

        this.bobTimer += 0.1;
    }

    draw(ctx) {
        const bob = Math.sin(this.bobTimer + this.bobOffset) * 3;

        ctx.save();
        ctx.translate(this.x, this.y + bob);
        ctx.rotate(Math.PI / 4);

        // Outer glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#2ecc71';

        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(-6, -6, 12, 12);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-6, -6, 12, 12);

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

export class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1.0;
        this.velocity = { x: (Math.random() - 0.5) * 2, y: -3 };
        this.markedForDeletion = false;
        this.scale = 1.2;
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.velocity.y += 0.1; // Gravity
        this.life -= 0.025;
        this.scale *= 0.98;
        if (this.life <= 0) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.font = `bold ${Math.floor(20 * this.scale)}px "M PLUS Rounded 1c"`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

export class PowerUpItem extends Entity {
    constructor(x, y, type) {
        super(x, y, 15, '#9b59b6');
        this.type = type;
        this.bobTimer = 0;
        this.rotation = 0;
        this.lifetime = 600; // 10 seconds
    }

    update() {
        this.bobTimer += 0.08;
        this.rotation += 0.05;
        this.lifetime--;
        if (this.lifetime <= 0) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        const bob = Math.sin(this.bobTimer) * 5;
        const pulse = 1 + Math.sin(this.bobTimer * 2) * 0.1;
        const size = this.radius * pulse;

        // Blink when about to disappear
        if (this.lifetime < 120 && Math.floor(this.lifetime / 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        ctx.save();
        ctx.translate(this.x, this.y + bob);

        // Glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
        gradient.addColorStop(0, this.getGlowColor());
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(-size * 2, -size * 2, size * 4, size * 4);

        // Background circle
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fillStyle = this.getBackgroundColor();
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Icon
        ctx.font = `bold ${Math.floor(size)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(this.getIcon(), 0, 1);

        ctx.restore();
        ctx.globalAlpha = 1;
    }

    getIcon() {
        switch (this.type) {
            case 'heal': return '♥';
            case 'speed': return '⚡';
            case 'attack': return '⚔';
            case 'magnet': return '◎';
            default: return '?';
        }
    }

    getBackgroundColor() {
        switch (this.type) {
            case 'heal': return '#e74c3c';
            case 'speed': return '#3498db';
            case 'attack': return '#e67e22';
            case 'magnet': return '#9b59b6';
            default: return '#95a5a6';
        }
    }

    getGlowColor() {
        switch (this.type) {
            case 'heal': return 'rgba(231, 76, 60, 0.4)';
            case 'speed': return 'rgba(52, 152, 219, 0.4)';
            case 'attack': return 'rgba(230, 126, 34, 0.4)';
            case 'magnet': return 'rgba(155, 89, 182, 0.4)';
            default: return 'rgba(149, 165, 166, 0.4)';
        }
    }
}

export class ShockWave {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 0;
        this.maxRadius = 120;
        this.life = 1;
        this.markedForDeletion = false;
    }

    update() {
        this.radius += 8;
        this.life = 1 - (this.radius / this.maxRadius);
        if (this.radius >= this.maxRadius) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life * 0.6;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4 + (1 - this.life) * 8;
        ctx.stroke();
        ctx.restore();
    }
}
