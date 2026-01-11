// ===== PAINT WARS - Game Entities =====

// Callbacks for stats (set by game.js to avoid circular dependencies)
let statsCallbacks = {
  addPaintPoints: () => {},
  addKill: () => {},
  addDeath: () => {},
  addAssist: () => {}
};

export function setStatsCallbacks(callbacks) {
  statsCallbacks = { ...statsCallbacks, ...callbacks };
}

// ===== Base Player Class =====
export class Player {
  constructor(options) {
    this.team = options.team;
    this.character = options.character;
    this.weapon = options.weapon;
    this.subWeapon = options.subWeapon;
    this.isPlayer = options.isPlayer || false;

    // Position and movement
    this.position = {
      x: options.position.x || 0,
      z: options.position.z || 0
    };
    this.velocity = { x: 0, z: 0 };
    this.aimDirection = { x: 0, z: 1 };
    this.isMoving = false;

    // Stats
    this.baseSpeed = 8;
    this.health = 100;
    this.maxHealth = 100;
    this.ink = 100;
    this.maxInk = 100;
    this.specialGauge = 0;

    // State
    this.isDead = false;
    this.respawnTimer = 0;
    this.isInvulnerable = false;
    this.invulnerableTimer = 0;

    // Weapon state
    this.fireTimer = 0;
    this.isCharging = false;
    this.chargeTime = 0;
    this.subWeaponCooldown = 0;
    this.slideCooldown = 0;

    // Projectiles
    this.projectiles = [];

    // Combat
    this.lastDamageSource = null;
    this.damageAssists = new Set();
  }

  update(deltaTime, input, allPlayers, inkSystem, renderer) {
    if (this.isDead) {
      this.updateRespawn(deltaTime);
      return;
    }

    this.updateInvulnerability(deltaTime);
    this.updateMovement(deltaTime, input, inkSystem);
    this.updateAim(input, renderer);
    this.updateWeapon(deltaTime, input, inkSystem, renderer);
    this.updateProjectiles(deltaTime, allPlayers, inkSystem, renderer);
    this.updateSubWeapon(deltaTime, input, inkSystem, renderer);
    this.updateInk(deltaTime, inkSystem);
    this.updateCooldowns(deltaTime);
  }

  updateMovement(deltaTime, input, inkSystem) {
    // Get movement input
    let moveX = input.moveX || 0;
    let moveZ = input.moveZ || 0;

    // Normalize diagonal movement
    const magnitude = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (magnitude > 1) {
      moveX /= magnitude;
      moveZ /= magnitude;
    }

    // Apply speed modifiers
    let speed = this.baseSpeed;
    speed *= inkSystem.getSpeedModifier(this.position.x, this.position.z, this.team);
    speed *= this.weapon.moveSpeedMod || 1;

    // Slide (for dual weapons)
    if (input.slide && this.weapon.canSlide && this.slideCooldown <= 0) {
      speed *= 2.5;
      this.slideCooldown = 3;
    }

    // Update velocity
    this.velocity.x = moveX * speed;
    this.velocity.z = moveZ * speed;

    // Update position
    const newX = this.position.x + this.velocity.x * deltaTime;
    const newZ = this.position.z + this.velocity.z * deltaTime;

    // Boundary check
    const arenaSize = 24;
    this.position.x = Math.max(-arenaSize, Math.min(arenaSize, newX));
    this.position.z = Math.max(-arenaSize, Math.min(arenaSize, newZ));

    // Check collision with obstacles
    this.checkObstacleCollision();

    this.isMoving = magnitude > 0.1;
  }

  checkObstacleCollision() {
    const playerRadius = 0.5;

    // Center obstacle
    const centerDist = Math.sqrt(
      this.position.x * this.position.x +
      this.position.z * this.position.z
    );
    if (centerDist < 3 + playerRadius) {
      const angle = Math.atan2(this.position.z, this.position.x);
      this.position.x = Math.cos(angle) * (3 + playerRadius);
      this.position.z = Math.sin(angle) * (3 + playerRadius);
    }

    // Corner pillars
    const cornerPositions = [
      { x: -15, z: -15 },
      { x: 15, z: -15 },
      { x: -15, z: 15 },
      { x: 15, z: 15 }
    ];

    cornerPositions.forEach(corner => {
      const dx = this.position.x - corner.x;
      const dz = this.position.z - corner.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 2 + playerRadius) {
        const angle = Math.atan2(dz, dx);
        this.position.x = corner.x + Math.cos(angle) * (2 + playerRadius);
        this.position.z = corner.z + Math.sin(angle) * (2 + playerRadius);
      }
    });

    // Barrier walls
    const barriers = [
      { x: -10, z: 0, width: 8, depth: 1.5, rotY: 0 },
      { x: 10, z: 0, width: 8, depth: 1.5, rotY: 0 },
      { x: 0, z: -10, width: 1.5, depth: 8, rotY: 0 },
      { x: 0, z: 10, width: 1.5, depth: 8, rotY: 0 }
    ];

    barriers.forEach(barrier => {
      const halfW = barrier.width / 2 + playerRadius;
      const halfD = barrier.depth / 2 + playerRadius;

      if (Math.abs(this.position.x - barrier.x) < halfW &&
          Math.abs(this.position.z - barrier.z) < halfD) {
        // Push out of collision
        const overlapX = halfW - Math.abs(this.position.x - barrier.x);
        const overlapZ = halfD - Math.abs(this.position.z - barrier.z);

        if (overlapX < overlapZ) {
          this.position.x += (this.position.x > barrier.x ? 1 : -1) * overlapX;
        } else {
          this.position.z += (this.position.z > barrier.z ? 1 : -1) * overlapZ;
        }
      }
    });
  }

  updateAim(input, renderer) {
    if (input.aimX !== undefined && input.aimZ !== undefined) {
      if (Math.abs(input.aimX) > 0.1 || Math.abs(input.aimZ) > 0.1) {
        // For mobile joystick or normalized input
        this.aimDirection.x = input.aimX;
        this.aimDirection.z = input.aimZ;
      } else if (renderer && renderer.camera) {
        // For mouse input - ray cast from camera
        // Simplified: use mouse position relative to center
        this.aimDirection.x = input.aimX;
        this.aimDirection.z = input.aimZ || 0.5;
      }

      // Normalize
      const mag = Math.sqrt(
        this.aimDirection.x * this.aimDirection.x +
        this.aimDirection.z * this.aimDirection.z
      );
      if (mag > 0) {
        this.aimDirection.x /= mag;
        this.aimDirection.z /= mag;
      }
    }
  }

  updateWeapon(deltaTime, input, inkSystem, renderer) {
    this.fireTimer -= deltaTime;

    if (!input.fire) {
      if (this.isCharging && this.chargeTime > 0) {
        // Release charged shot
        this.fireChargedShot(inkSystem, renderer);
      }
      this.isCharging = false;
      this.chargeTime = 0;
      return;
    }

    if (this.ink <= 0) return;

    // Weapon-specific firing
    switch (this.weapon.type) {
      case 'shooter':
        this.fireShooter(deltaTime, inkSystem, renderer);
        break;
      case 'roller':
        this.useRoller(deltaTime, inkSystem, renderer);
        break;
      case 'charger':
        this.chargeCharger(deltaTime, inkSystem, renderer);
        break;
      case 'blaster':
        this.fireBlaster(deltaTime, inkSystem, renderer);
        break;
      case 'dual':
        this.fireDual(deltaTime, inkSystem, renderer);
        break;
    }
  }

  fireShooter(deltaTime, inkSystem, renderer) {
    if (this.fireTimer > 0) return;

    const inkCost = 2;
    if (this.ink < inkCost) return;

    this.ink -= inkCost;
    this.fireTimer = 0.1;

    // Create projectile
    const projectile = {
      position: { x: this.position.x, z: this.position.z },
      velocity: {
        x: this.aimDirection.x * 30,
        z: this.aimDirection.z * 30
      },
      team: this.team,
      damage: 20,
      radius: 1.5,
      lifetime: 0.5,
      owner: this,
      isActive: true
    };

    this.projectiles.push(projectile);
    renderer.addProjectile(projectile);

    // Paint at spawn position
    inkSystem.paint(this.position.x, this.position.z, 0.8, this.team);
  }

  useRoller(deltaTime, inkSystem, renderer) {
    const inkCost = 5 * deltaTime;
    if (this.ink < inkCost) return;

    this.ink -= inkCost;

    // Paint wide area while moving
    if (this.isMoving) {
      const painted = inkSystem.paint(this.position.x, this.position.z, 2.5, this.team);
      if (this.isPlayer && painted > 0) {
        statsCallbacks.addPaintPoints(painted);
      }
    }

    // Melee damage to nearby enemies is handled in checkCollisions
  }

  chargeCharger(deltaTime, inkSystem, renderer) {
    this.isCharging = true;
    this.chargeTime += deltaTime;

    // Show laser sight (could add to renderer)
    // Max charge is 1.5 seconds
    this.chargeTime = Math.min(this.chargeTime, 1.5);
  }

  fireChargedShot(inkSystem, renderer) {
    if (this.chargeTime < 0.3) return; // Minimum charge

    const inkCost = 25 * (this.chargeTime / 1.5);
    if (this.ink < inkCost) return;

    this.ink -= inkCost;

    const power = this.chargeTime / 1.5;
    const projectile = {
      position: { x: this.position.x, z: this.position.z },
      velocity: {
        x: this.aimDirection.x * 50,
        z: this.aimDirection.z * 50
      },
      team: this.team,
      damage: 40 + power * 60, // 40-100 damage
      radius: 0.5 + power,
      lifetime: 1.0,
      owner: this,
      isActive: true,
      isPiercing: power > 0.8
    };

    this.projectiles.push(projectile);
    renderer.addProjectile(projectile);

    // Paint line
    for (let t = 0; t < 1; t += 0.1) {
      const px = this.position.x + this.aimDirection.x * t * 20;
      const pz = this.position.z + this.aimDirection.z * t * 20;
      inkSystem.paint(px, pz, 0.5, this.team);
    }
  }

  fireBlaster(deltaTime, inkSystem, renderer) {
    if (this.fireTimer > 0) return;

    const inkCost = 8;
    if (this.ink < inkCost) return;

    this.ink -= inkCost;
    this.fireTimer = 0.5;

    const projectile = {
      position: { x: this.position.x, z: this.position.z },
      velocity: {
        x: this.aimDirection.x * 25,
        z: this.aimDirection.z * 25
      },
      team: this.team,
      damage: 50,
      radius: 2.5,
      lifetime: 0.4,
      owner: this,
      isActive: true,
      isExplosive: true
    };

    this.projectiles.push(projectile);
    renderer.addProjectile(projectile);
  }

  fireDual(deltaTime, inkSystem, renderer) {
    if (this.fireTimer > 0) return;

    const inkCost = 1.5;
    if (this.ink < inkCost) return;

    this.ink -= inkCost;
    this.fireTimer = 0.06; // Very fast fire rate

    // Alternate between left and right
    const offset = (Math.floor(Date.now() / 60) % 2 === 0) ? 0.3 : -0.3;

    const projectile = {
      position: {
        x: this.position.x - this.aimDirection.z * offset,
        z: this.position.z + this.aimDirection.x * offset
      },
      velocity: {
        x: this.aimDirection.x * 28,
        z: this.aimDirection.z * 28
      },
      team: this.team,
      damage: 15,
      radius: 1.2,
      lifetime: 0.35,
      owner: this,
      isActive: true
    };

    this.projectiles.push(projectile);
    renderer.addProjectile(projectile);
  }

  updateProjectiles(deltaTime, allPlayers, inkSystem, renderer) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      if (!proj.isActive) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Update position
      proj.position.x += proj.velocity.x * deltaTime;
      proj.position.z += proj.velocity.z * deltaTime;

      // Update lifetime
      proj.lifetime -= deltaTime;
      if (proj.lifetime <= 0) {
        if (proj.isExplosive) {
          this.explodeProjectile(proj, inkSystem, renderer);
        }
        proj.isActive = false;
        continue;
      }

      // Paint trail
      inkSystem.paint(proj.position.x, proj.position.z, proj.radius * 0.5, proj.team);

      // Check wall collision
      if (Math.abs(proj.position.x) > 24 || Math.abs(proj.position.z) > 24) {
        if (proj.isExplosive) {
          this.explodeProjectile(proj, inkSystem, renderer);
        }
        proj.isActive = false;
        continue;
      }

      // Check obstacle collision
      if (this.checkProjectileObstacle(proj)) {
        if (proj.isExplosive) {
          this.explodeProjectile(proj, inkSystem, renderer);
        }
        proj.isActive = false;
        continue;
      }

      // Check hit on players
      allPlayers.forEach(target => {
        if (target === this || target.team === this.team || target.isDead || target.isInvulnerable) return;

        const dx = proj.position.x - target.position.x;
        const dz = proj.position.z - target.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 1) {
          this.hitPlayer(target, proj.damage, renderer);
          if (!proj.isPiercing) {
            proj.isActive = false;
          }
        }
      });
    }
  }

  checkProjectileObstacle(proj) {
    // Center obstacle
    const centerDist = Math.sqrt(proj.position.x ** 2 + proj.position.z ** 2);
    if (centerDist < 3) return true;

    // Corner pillars
    const corners = [
      { x: -15, z: -15 }, { x: 15, z: -15 },
      { x: -15, z: 15 }, { x: 15, z: 15 }
    ];
    for (const corner of corners) {
      const dist = Math.sqrt(
        (proj.position.x - corner.x) ** 2 +
        (proj.position.z - corner.z) ** 2
      );
      if (dist < 2) return true;
    }

    // Barriers
    const barriers = [
      { x: -10, z: 0, w: 4, h: 0.75 },
      { x: 10, z: 0, w: 4, h: 0.75 },
      { x: 0, z: -10, w: 0.75, h: 4 },
      { x: 0, z: 10, w: 0.75, h: 4 }
    ];
    for (const b of barriers) {
      if (Math.abs(proj.position.x - b.x) < b.w &&
          Math.abs(proj.position.z - b.z) < b.h) {
        return true;
      }
    }

    return false;
  }

  explodeProjectile(proj, inkSystem, renderer) {
    // Paint large area
    inkSystem.paint(proj.position.x, proj.position.z, proj.radius, this.team);
    if (this.isPlayer) {
      statsCallbacks.addPaintPoints(Math.floor(proj.radius * 5));
    }

    // Add explosion effect
    renderer.addEffect('hit', proj.position, this.team);
  }

  hitPlayer(target, damage, renderer) {
    target.takeDamage(damage, this, renderer);
  }

  takeDamage(damage, source, renderer) {
    if (this.isDead || this.isInvulnerable) return;

    this.health -= damage;
    this.lastDamageSource = source;

    if (source && source !== this) {
      this.damageAssists.add(source);
    }

    if (this.health <= 0) {
      this.die(renderer);
    }
  }

  die(renderer) {
    this.isDead = true;
    this.respawnTimer = 3;

    // Grant kill to last damage source
    if (this.lastDamageSource) {
      if (this.lastDamageSource.isPlayer) {
        statsCallbacks.addKill();
      }
    }

    // Grant assists
    this.damageAssists.forEach(assister => {
      if (assister !== this.lastDamageSource && assister.isPlayer) {
        statsCallbacks.addAssist();
      }
    });

    if (this.isPlayer) {
      statsCallbacks.addDeath();
    }

    // Add death effect
    renderer.addEffect('death', this.position, this.team);

    // Clear combat state
    this.damageAssists.clear();
    this.lastDamageSource = null;
  }

  updateRespawn(deltaTime) {
    this.respawnTimer -= deltaTime;

    if (this.respawnTimer <= 0) {
      this.respawn();
    }
  }

  respawn() {
    this.isDead = false;
    this.health = this.maxHealth;
    this.ink = this.maxInk;
    this.isInvulnerable = true;
    this.invulnerableTimer = 2;

    // Spawn at team base
    const spawnX = this.team === 'orange' ? -20 : 20;
    const spawnZ = (Math.random() - 0.5) * 10;
    this.position.x = spawnX;
    this.position.z = spawnZ;
  }

  updateInvulnerability(deltaTime) {
    if (this.isInvulnerable) {
      this.invulnerableTimer -= deltaTime;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
      }
    }
  }

  updateSubWeapon(deltaTime, input, inkSystem, renderer) {
    if (!input.subWeapon || this.subWeaponCooldown > 0) return;

    this.useSubWeapon(inkSystem, renderer);
  }

  useSubWeapon(inkSystem, renderer) {
    switch (this.subWeapon.type) {
      case 'bomb':
        this.throwBomb(inkSystem, renderer);
        break;
      case 'shield':
        this.deployShield();
        break;
      case 'sensor':
        this.deploySensor();
        break;
    }

    this.subWeaponCooldown = this.subWeapon.cooldown;
  }

  throwBomb(inkSystem, renderer) {
    // Bomb projectile
    const bomb = {
      position: { x: this.position.x, z: this.position.z },
      velocity: {
        x: this.aimDirection.x * 15,
        z: this.aimDirection.z * 15
      },
      team: this.team,
      damage: 60,
      radius: 3,
      lifetime: 1.5,
      owner: this,
      isActive: true,
      isExplosive: true,
      isBomb: true
    };

    this.projectiles.push(bomb);
    renderer.addProjectile(bomb);
  }

  deployShield() {
    this.isInvulnerable = true;
    this.invulnerableTimer = 3;
  }

  deploySensor() {
    // Mark enemies on minimap - handled in game.js
  }

  updateInk(deltaTime, inkSystem) {
    // Natural ink recovery
    let recoveryRate = 10; // 10% per second

    // Boost on friendly ink
    recoveryRate *= inkSystem.getInkRecoveryModifier(
      this.position.x, this.position.z, this.team
    );

    this.ink = Math.min(this.maxInk, this.ink + recoveryRate * deltaTime);
  }

  updateCooldowns(deltaTime) {
    if (this.subWeaponCooldown > 0) {
      this.subWeaponCooldown -= deltaTime;
    }
    if (this.slideCooldown > 0) {
      this.slideCooldown -= deltaTime;
    }
  }

  getSubWeaponCooldown() {
    return Math.max(0, this.subWeaponCooldown);
  }

  addSpecialGauge(amount) {
    this.specialGauge = Math.min(100, this.specialGauge + amount);
  }
}

// ===== CPU Player Class =====
export class CPUPlayer extends Player {
  constructor(options) {
    super(options);
    this.difficulty = options.difficulty || 'normal';

    // AI state
    this.aiState = 'roam';
    this.targetPosition = null;
    this.targetEnemy = null;
    this.stateTimer = 0;

    // AI parameters based on difficulty
    this.setDifficultyParams();
  }

  setDifficultyParams() {
    switch (this.difficulty) {
      case 'easy':
        this.accuracy = 0.5;
        this.reactionTime = 0.8;
        this.aggressiveness = 0.3;
        this.paintPriority = 0.7;
        break;
      case 'normal':
        this.accuracy = 0.7;
        this.reactionTime = 0.5;
        this.aggressiveness = 0.5;
        this.paintPriority = 0.5;
        break;
      case 'hard':
        this.accuracy = 0.9;
        this.reactionTime = 0.2;
        this.aggressiveness = 0.7;
        this.paintPriority = 0.3;
        break;
    }
  }

  update(deltaTime, allPlayers, inkSystem, renderer) {
    if (this.isDead) {
      this.updateRespawn(deltaTime);
      return;
    }

    this.updateInvulnerability(deltaTime);
    this.updateAI(deltaTime, allPlayers, inkSystem);

    const input = this.generateInput(allPlayers);
    this.updateMovement(deltaTime, input, inkSystem);
    this.updateWeapon(deltaTime, input, inkSystem, renderer);
    this.updateProjectiles(deltaTime, allPlayers, inkSystem, renderer);
    this.updateInk(deltaTime, inkSystem);
    this.updateCooldowns(deltaTime);
  }

  updateAI(deltaTime, allPlayers, inkSystem) {
    this.stateTimer -= deltaTime;

    // Find nearest enemy
    this.findNearestEnemy(allPlayers);

    // State machine
    switch (this.aiState) {
      case 'roam':
        if (this.stateTimer <= 0) {
          this.pickNewRoamTarget(inkSystem);
          this.stateTimer = 2 + Math.random() * 2;
        }

        // Check if should engage enemy
        if (this.targetEnemy && Math.random() < this.aggressiveness) {
          this.aiState = 'engage';
          this.stateTimer = 3;
        }
        break;

      case 'engage':
        if (!this.targetEnemy || this.targetEnemy.isDead) {
          this.aiState = 'roam';
          this.stateTimer = 0;
        } else if (this.stateTimer <= 0 || this.health < 30) {
          this.aiState = 'retreat';
          this.stateTimer = 2;
        }
        break;

      case 'retreat':
        if (this.stateTimer <= 0 || this.health > 70) {
          this.aiState = 'roam';
          this.stateTimer = 0;
        }
        break;
    }
  }

  findNearestEnemy(allPlayers) {
    let nearestDist = Infinity;
    this.targetEnemy = null;

    allPlayers.forEach(p => {
      if (p.team !== this.team && !p.isDead) {
        const dx = p.position.x - this.position.x;
        const dz = p.position.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < nearestDist && dist < 20) {
          nearestDist = dist;
          this.targetEnemy = p;
        }
      }
    });
  }

  pickNewRoamTarget(inkSystem) {
    // Prioritize unpainted or enemy areas
    const candidates = [];

    for (let i = 0; i < 10; i++) {
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;

      const ink = inkSystem.getInkAt(x, z);
      let priority = 1;

      if (ink === 'neutral') {
        priority = 3;
      } else if (ink !== this.team) {
        priority = 2;
      }

      candidates.push({ x, z, priority });
    }

    // Sort by priority and pick random from top
    candidates.sort((a, b) => b.priority - a.priority);
    const top = candidates.slice(0, 3);
    const chosen = top[Math.floor(Math.random() * top.length)];

    this.targetPosition = { x: chosen.x, z: chosen.z };
  }

  generateInput(allPlayers) {
    const input = {
      moveX: 0,
      moveZ: 0,
      aimX: 0,
      aimZ: 1,
      fire: false,
      subWeapon: false,
      special: false,
      slide: false
    };

    switch (this.aiState) {
      case 'roam':
        if (this.targetPosition) {
          const dx = this.targetPosition.x - this.position.x;
          const dz = this.targetPosition.z - this.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist > 2) {
            input.moveX = dx / dist;
            input.moveZ = dz / dist;
            input.aimX = dx / dist;
            input.aimZ = dz / dist;
          }
        }

        // Paint while moving
        input.fire = this.weapon.type === 'roller' || Math.random() < 0.3;
        break;

      case 'engage':
        if (this.targetEnemy) {
          const dx = this.targetEnemy.position.x - this.position.x;
          const dz = this.targetEnemy.position.z - this.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          // Aim at enemy with some inaccuracy
          const inaccuracy = (1 - this.accuracy) * (Math.random() - 0.5) * 0.5;
          input.aimX = dx / dist + inaccuracy;
          input.aimZ = dz / dist + inaccuracy;

          // Move towards or strafe
          if (dist > this.weapon.optimalRange || 10) {
            input.moveX = dx / dist;
            input.moveZ = dz / dist;
          } else {
            // Strafe
            input.moveX = dz / dist * (Math.random() > 0.5 ? 1 : -1);
            input.moveZ = -dx / dist * (Math.random() > 0.5 ? 1 : -1);
          }

          input.fire = dist < this.weapon.range || 15;

          // Use sub weapon occasionally
          if (dist < 10 && Math.random() < 0.01 && this.subWeaponCooldown <= 0) {
            input.subWeapon = true;
          }
        }
        break;

      case 'retreat':
        // Move towards own base
        const baseX = this.team === 'orange' ? -20 : 20;
        const dx = baseX - this.position.x;
        const dz = -this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        input.moveX = dx / dist;
        input.moveZ = dz / dist;

        // Shoot behind while retreating
        if (this.targetEnemy) {
          const edx = this.targetEnemy.position.x - this.position.x;
          const edz = this.targetEnemy.position.z - this.position.z;
          const edist = Math.sqrt(edx * edx + edz * edz);
          input.aimX = edx / edist;
          input.aimZ = edz / edist;
          input.fire = edist < 15;
        }
        break;
    }

    return input;
  }

  updateAim(input, renderer) {
    // Override to use generated aim direction
    this.aimDirection.x = input.aimX || 0;
    this.aimDirection.z = input.aimZ || 1;

    const mag = Math.sqrt(
      this.aimDirection.x ** 2 + this.aimDirection.z ** 2
    );
    if (mag > 0) {
      this.aimDirection.x /= mag;
      this.aimDirection.z /= mag;
    }
  }
}
