// ===== Entity Base Class =====
export class Entity {
  constructor(x, y, size = 32) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.markedForDeletion = false;
  }

  update(dt) {}
  draw(ctx) {}
}

// ===== Player Class =====
export class Player extends Entity {
  constructor(x, y, tileSize, spriteData = null) {
    super(x, y, tileSize);
    this.tileX = x;
    this.tileY = y;
    this.targetX = x;
    this.targetY = y;
    this.tileSize = tileSize;
    this.spriteData = spriteData;

    // Stats
    this.bombCount = 1;
    this.maxBombs = 1;
    this.fireRange = 1;
    this.speed = 1;
    this.hasPenetrate = false;
    this.hasKick = false;

    // State
    this.isMoving = false;
    this.moveProgress = 0;
    this.direction = 'down';
    this.invincible = false;
    this.invincibleTimer = 0;
    this.animFrame = 0;
    this.animTimer = 0;
    this.placedBombs = [];
  }

  move(dx, dy, canMove) {
    if (this.isMoving) return false;

    const newX = this.tileX + dx;
    const newY = this.tileY + dy;

    // Update direction
    if (dx > 0) this.direction = 'right';
    else if (dx < 0) this.direction = 'left';
    else if (dy > 0) this.direction = 'down';
    else if (dy < 0) this.direction = 'up';

    if (canMove(newX, newY)) {
      this.targetX = newX;
      this.targetY = newY;
      this.isMoving = true;
      this.moveProgress = 0;
      return true;
    }
    return false;
  }

  update(dt) {
    // Movement animation
    if (this.isMoving) {
      const moveSpeed = 0.15 * this.speed;
      this.moveProgress += moveSpeed;

      if (this.moveProgress >= 1) {
        this.tileX = this.targetX;
        this.tileY = this.targetY;
        this.isMoving = false;
        this.moveProgress = 0;
      }

      // Animation frame
      this.animTimer += dt;
      if (this.animTimer > 100) {
        this.animFrame = (this.animFrame + 1) % 2;
        this.animTimer = 0;
      }
    }

    // Interpolate position
    const progress = this.moveProgress;
    this.x = this.tileX + (this.targetX - this.tileX) * progress;
    this.y = this.tileY + (this.targetY - this.tileY) * progress;

    // Invincibility
    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }
  }

  draw(ctx, offsetX = 0, offsetY = 0) {
    const px = offsetX + this.x * this.tileSize;
    const py = offsetY + this.y * this.tileSize;

    // Blink when invincible
    if (this.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
      return;
    }

    ctx.save();

    if (this.spriteData && this.spriteData.frames && this.spriteData.frames.length > 0) {
      // Draw sprite
      const frame = this.spriteData.frames[this.animFrame % this.spriteData.frames.length];
      if (frame.imageData) {
        ctx.drawImage(frame.imageData, px, py, this.tileSize, this.tileSize);
      }
    } else {
      // Default player (white bomber)
      const centerX = px + this.tileSize / 2;
      const centerY = py + this.tileSize / 2;

      // Body
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 4, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 8, 8, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      const eyeOffset = this.direction === 'left' ? -3 : this.direction === 'right' ? 3 : 0;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(centerX - 3 + eyeOffset, centerY - 10, 2, 0, Math.PI * 2);
      ctx.arc(centerX + 3 + eyeOffset, centerY - 10, 2, 0, Math.PI * 2);
      ctx.fill();

      // Antenna
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 16);
      ctx.lineTo(centerX, centerY - 22);
      ctx.stroke();
      ctx.fillStyle = '#ff6b35';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 23, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  makeInvincible(duration = 2000) {
    this.invincible = true;
    this.invincibleTimer = duration;
  }
}

// ===== Enemy Class =====
export class Enemy extends Entity {
  constructor(x, y, tileSize, enemyData = null) {
    super(x, y, tileSize);
    this.tileX = x;
    this.tileY = y;
    this.targetX = x;
    this.targetY = y;
    this.tileSize = tileSize;

    // Enemy data
    this.data = enemyData || {
      name: 'スライム',
      speed: 1,
      pattern: 'random',
      wallPass: false,
      bombPass: false,
      color: '#4ade80'
    };

    this.spriteData = enemyData?.spriteData || null;

    // State
    this.isMoving = false;
    this.moveProgress = 0;
    this.direction = 'down';
    this.moveTimer = 0;
    this.moveDelay = 500 / this.data.speed;
    this.animFrame = 0;
    this.animTimer = 0;
    this.lastDir = null;
  }

  update(dt, canMove, playerPos = null) {
    // Movement animation
    if (this.isMoving) {
      const moveSpeed = 0.1 * this.data.speed;
      this.moveProgress += moveSpeed;

      if (this.moveProgress >= 1) {
        this.tileX = this.targetX;
        this.tileY = this.targetY;
        this.isMoving = false;
        this.moveProgress = 0;
      }

      // Animation
      this.animTimer += dt;
      if (this.animTimer > 150) {
        this.animFrame = (this.animFrame + 1) % 2;
        this.animTimer = 0;
      }
    } else {
      // Decide next move
      this.moveTimer += dt;
      if (this.moveTimer >= this.moveDelay) {
        this.moveTimer = 0;
        this.decideMove(canMove, playerPos);
      }
    }

    // Interpolate position
    const progress = this.moveProgress;
    this.x = this.tileX + (this.targetX - this.tileX) * progress;
    this.y = this.tileY + (this.targetY - this.tileY) * progress;
  }

  decideMove(canMove, playerPos) {
    const dirs = [
      { dx: 0, dy: -1, name: 'up' },
      { dx: 0, dy: 1, name: 'down' },
      { dx: -1, dy: 0, name: 'left' },
      { dx: 1, dy: 0, name: 'right' }
    ];

    let chosenDir = null;

    switch (this.data.pattern) {
      case 'chase':
        // Move towards player
        if (playerPos) {
          const dx = playerPos.x - this.tileX;
          const dy = playerPos.y - this.tileY;

          // Prioritize axis with larger distance
          const candidates = [];
          if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) candidates.push(dirs[3]); // right
            else candidates.push(dirs[2]); // left
            if (dy > 0) candidates.push(dirs[1]); // down
            else candidates.push(dirs[0]); // up
          } else {
            if (dy > 0) candidates.push(dirs[1]);
            else candidates.push(dirs[0]);
            if (dx > 0) candidates.push(dirs[3]);
            else candidates.push(dirs[2]);
          }

          for (const dir of candidates) {
            if (canMove(this.tileX + dir.dx, this.tileY + dir.dy, this.data.wallPass, this.data.bombPass)) {
              chosenDir = dir;
              break;
            }
          }
        }
        break;

      case 'patrol':
        // Keep going in same direction until blocked
        if (this.lastDir) {
          const dir = dirs.find(d => d.name === this.lastDir);
          if (dir && canMove(this.tileX + dir.dx, this.tileY + dir.dy, this.data.wallPass, this.data.bombPass)) {
            chosenDir = dir;
          }
        }
        break;

      case 'smart':
        // Chase but avoid bombs
        if (playerPos) {
          const dx = playerPos.x - this.tileX;
          const dy = playerPos.y - this.tileY;

          const candidates = dirs
            .map(dir => ({
              ...dir,
              dist: Math.abs(playerPos.x - (this.tileX + dir.dx)) + Math.abs(playerPos.y - (this.tileY + dir.dy))
            }))
            .filter(dir => canMove(this.tileX + dir.dx, this.tileY + dir.dy, this.data.wallPass, false))
            .sort((a, b) => a.dist - b.dist);

          if (candidates.length > 0) {
            chosenDir = candidates[0];
          }
        }
        break;

      default: // random
        const validDirs = dirs.filter(dir =>
          canMove(this.tileX + dir.dx, this.tileY + dir.dy, this.data.wallPass, this.data.bombPass)
        );
        if (validDirs.length > 0) {
          chosenDir = validDirs[Math.floor(Math.random() * validDirs.length)];
        }
    }

    // Fallback to random
    if (!chosenDir) {
      const validDirs = dirs.filter(dir =>
        canMove(this.tileX + dir.dx, this.tileY + dir.dy, this.data.wallPass, this.data.bombPass)
      );
      if (validDirs.length > 0) {
        chosenDir = validDirs[Math.floor(Math.random() * validDirs.length)];
      }
    }

    if (chosenDir) {
      this.targetX = this.tileX + chosenDir.dx;
      this.targetY = this.tileY + chosenDir.dy;
      this.direction = chosenDir.name;
      this.lastDir = chosenDir.name;
      this.isMoving = true;
      this.moveProgress = 0;
    }
  }

  draw(ctx, offsetX = 0, offsetY = 0) {
    const px = offsetX + this.x * this.tileSize;
    const py = offsetY + this.y * this.tileSize;

    ctx.save();

    if (this.spriteData && this.spriteData.frames && this.spriteData.frames.length > 0) {
      const frame = this.spriteData.frames[this.animFrame % this.spriteData.frames.length];
      if (frame.imageData) {
        ctx.drawImage(frame.imageData, px, py, this.tileSize, this.tileSize);
      }
    } else {
      // Default slime enemy
      const centerX = px + this.tileSize / 2;
      const centerY = py + this.tileSize / 2;
      const bounce = Math.sin(Date.now() / 200) * 2;

      // Body
      ctx.fillStyle = this.data.color || '#4ade80';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 4 + bounce, 12, 10 - bounce / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(centerX - 4, centerY - 2 + bounce, 4, 3, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(centerX - 4, centerY + 2 + bounce, 2, 0, Math.PI * 2);
      ctx.arc(centerX + 4, centerY + 2 + bounce, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ===== Bomb Class =====
export class Bomb extends Entity {
  constructor(x, y, tileSize, range = 1, ownerId = null, penetrate = false) {
    super(x, y, tileSize);
    this.tileX = x;
    this.tileY = y;
    this.tileSize = tileSize;
    this.range = range;
    this.ownerId = ownerId;
    this.penetrate = penetrate;

    this.timer = 3000; // 3 seconds fuse
    this.animTimer = 0;
    this.scale = 1;
    this.isKicked = false;
    this.kickDir = null;
    this.kickProgress = 0;
  }

  update(dt, canKickTo) {
    this.timer -= dt;

    // Pulsing animation
    this.animTimer += dt;
    this.scale = 1 + Math.sin(this.animTimer / 150) * 0.1;

    // Kick movement
    if (this.isKicked && this.kickDir) {
      const kickSpeed = 0.2;
      this.kickProgress += kickSpeed;

      if (this.kickProgress >= 1) {
        const newX = this.tileX + this.kickDir.dx;
        const newY = this.tileY + this.kickDir.dy;

        if (canKickTo && canKickTo(newX, newY)) {
          this.tileX = newX;
          this.tileY = newY;
          this.kickProgress = 0;
        } else {
          this.isKicked = false;
          this.kickDir = null;
          this.kickProgress = 0;
        }
      }
    }

    if (this.timer <= 0) {
      this.markedForDeletion = true;
    }
  }

  kick(dx, dy) {
    this.isKicked = true;
    this.kickDir = { dx, dy };
    this.kickProgress = 0;
  }

  draw(ctx, offsetX = 0, offsetY = 0) {
    const px = offsetX + this.tileX * this.tileSize + this.tileSize / 2;
    const py = offsetY + this.tileY * this.tileSize + this.tileSize / 2;

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(this.scale, this.scale);

    // Bomb body
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
    gradient.addColorStop(0, '#4a4a4a');
    gradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 2, 12, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(-4, -2, 4, 3, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Fuse
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.quadraticCurveTo(4, -14, 6, -12);
    ctx.stroke();

    // Spark
    const sparkIntensity = (Math.sin(this.animTimer / 50) + 1) / 2;
    ctx.fillStyle = `rgba(255, ${150 + sparkIntensity * 105}, 0, ${0.8 + sparkIntensity * 0.2})`;
    ctx.beginPath();
    ctx.arc(6, -12, 3 + sparkIntensity * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ===== Explosion Class =====
export class Explosion extends Entity {
  constructor(x, y, tileSize, cells = []) {
    super(x, y, tileSize);
    this.tileSize = tileSize;
    this.cells = cells; // [{x, y, dir}]
    this.timer = 500; // Duration
    this.animTimer = 0;
  }

  update(dt) {
    this.timer -= dt;
    this.animTimer += dt;

    if (this.timer <= 0) {
      this.markedForDeletion = true;
    }
  }

  draw(ctx, offsetX = 0, offsetY = 0) {
    const progress = 1 - (this.timer / 500);
    const alpha = progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2;
    const scale = progress < 0.3 ? progress / 0.3 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    for (const cell of this.cells) {
      const px = offsetX + cell.x * this.tileSize + this.tileSize / 2;
      const py = offsetY + cell.y * this.tileSize + this.tileSize / 2;

      // Explosion gradient
      const gradient = ctx.createRadialGradient(px, py, 0, px, py, this.tileSize / 2 * scale);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, '#ffdd00');
      gradient.addColorStop(0.6, '#ff6600');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px, py, this.tileSize / 2 * scale * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  getCells() {
    return this.cells;
  }
}

// ===== Item Class =====
export class Item extends Entity {
  constructor(x, y, tileSize, type) {
    super(x, y, tileSize);
    this.tileX = x;
    this.tileY = y;
    this.tileSize = tileSize;
    this.type = type;
    this.animTimer = 0;
    // ドロップ直後は爆発で破壊されないように無敵時間を設定
    this.invincibleTimer = 600; // 600ms (爆発の持続時間500ms + バッファ)
  }

  update(dt) {
    this.animTimer += dt;
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
    }
  }

  isInvincible() {
    return this.invincibleTimer > 0;
  }

  draw(ctx, offsetX = 0, offsetY = 0) {
    const px = offsetX + this.tileX * this.tileSize;
    const py = offsetY + this.tileY * this.tileSize;
    const bounce = Math.sin(this.animTimer / 200) * 2;

    ctx.save();

    // Background glow
    const glowAlpha = 0.3 + Math.sin(this.animTimer / 300) * 0.1;
    ctx.fillStyle = `rgba(255, 255, 255, ${glowAlpha})`;
    ctx.beginPath();
    ctx.arc(px + this.tileSize / 2, py + this.tileSize / 2, this.tileSize / 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Item icon
    ctx.font = `${this.tileSize * 0.6}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const icons = {
      'bomb_up': '💣',
      'fire_up': '🔥',
      'speed_up': '👟',
      'penetrate': '💥',
      'kick': '👢',
      'life': '❤️'
    };

    ctx.fillText(icons[this.type] || '?', px + this.tileSize / 2, py + this.tileSize / 2 + bounce);

    ctx.restore();
  }
}

// ===== Particle Class =====
export class Particle extends Entity {
  constructor(x, y, color, velocity, type = 'normal') {
    super(x, y, Math.random() * 4 + 2);
    this.color = color;
    this.velocity = velocity;
    this.life = 1.0;
    this.decay = Math.random() * 0.04 + 0.02;
    this.type = type;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.3;
  }

  update(dt) {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.velocity.x *= 0.98;
    this.velocity.y *= 0.98;
    this.velocity.y += 0.1; // Gravity
    this.life -= this.decay;
    this.size *= 0.97;
    this.rotation += this.rotationSpeed;

    if (this.life <= 0) {
      this.markedForDeletion = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.type === 'sparkle') {
      // Star shape
      ctx.fillStyle = this.color;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const x = Math.cos(angle) * this.size;
        const y = Math.sin(angle) * this.size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      // Circle
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ===== Exit Door Class =====
export class ExitDoor extends Entity {
  constructor(x, y, tileSize) {
    super(x, y, tileSize);
    this.tileX = x;
    this.tileY = y;
    this.tileSize = tileSize;
    this.isOpen = false;
    this.animTimer = 0;
  }

  open() {
    this.isOpen = true;
  }

  update(dt) {
    if (this.isOpen) {
      this.animTimer += dt;
    }
  }

  draw(ctx, offsetX = 0, offsetY = 0) {
    const px = offsetX + this.tileX * this.tileSize;
    const py = offsetY + this.tileY * this.tileSize;

    ctx.save();

    if (this.isOpen) {
      // Glowing door
      const glow = Math.sin(this.animTimer / 200) * 0.2 + 0.8;

      // Door frame
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(px + 4, py + 2, this.tileSize - 8, this.tileSize - 2);

      // Door opening (portal effect)
      const gradient = ctx.createRadialGradient(
        px + this.tileSize / 2, py + this.tileSize / 2, 0,
        px + this.tileSize / 2, py + this.tileSize / 2, this.tileSize / 2
      );
      gradient.addColorStop(0, `rgba(100, 200, 255, ${glow})`);
      gradient.addColorStop(0.5, `rgba(50, 150, 255, ${glow * 0.7})`);
      gradient.addColorStop(1, 'rgba(0, 50, 150, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(px + 6, py + 4, this.tileSize - 12, this.tileSize - 6);
    } else {
      // Closed door (hidden under block)
      ctx.fillStyle = '#5a3d2b';
      ctx.fillRect(px + 4, py + 2, this.tileSize - 8, this.tileSize - 2);
    }

    ctx.restore();
  }
}
