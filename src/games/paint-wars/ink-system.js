// ===== PAINT WARS - Ink System =====

export class InkSystem {
  constructor(renderer) {
    this.renderer = renderer;
    this.GRID_SIZE = 100; // Resolution of ink tracking
    this.ARENA_SIZE = 50;

    // Ink grid: 0 = neutral, 1 = orange, 2 = blue
    this.inkGrid = new Array(this.GRID_SIZE * this.GRID_SIZE).fill(0);

    // Pending ink updates (for batching)
    this.pendingInk = [];

    // Scores
    this.orangeCount = 0;
    this.blueCount = 0;
  }

  // Convert world position to grid index
  worldToGrid(x, z) {
    const gridX = Math.floor(((x / this.ARENA_SIZE) + 0.5) * this.GRID_SIZE);
    const gridZ = Math.floor(((z / this.ARENA_SIZE) + 0.5) * this.GRID_SIZE);

    return {
      x: Math.max(0, Math.min(this.GRID_SIZE - 1, gridX)),
      z: Math.max(0, Math.min(this.GRID_SIZE - 1, gridZ))
    };
  }

  // Paint ink at a position
  paint(x, z, radius, team) {
    const teamValue = team === 'orange' ? 1 : 2;
    const gridRadius = Math.ceil((radius / this.ARENA_SIZE) * this.GRID_SIZE);
    const center = this.worldToGrid(x, z);

    let painted = 0;

    // Paint circular area
    for (let dz = -gridRadius; dz <= gridRadius; dz++) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= gridRadius) {
          const gx = center.x + dx;
          const gz = center.z + dz;

          if (gx >= 0 && gx < this.GRID_SIZE && gz >= 0 && gz < this.GRID_SIZE) {
            const index = gz * this.GRID_SIZE + gx;
            const oldValue = this.inkGrid[index];

            if (oldValue !== teamValue) {
              // Update counts
              if (oldValue === 1) this.orangeCount--;
              else if (oldValue === 2) this.blueCount--;

              this.inkGrid[index] = teamValue;

              if (teamValue === 1) this.orangeCount++;
              else if (teamValue === 2) this.blueCount++;

              painted++;
            }
          }
        }
      }
    }

    // Update renderer
    if (painted > 0) {
      this.renderer.addInkSplat(x, z, radius, team);
    }

    return painted;
  }

  // Get ink team at a position
  getInkAt(x, z) {
    const grid = this.worldToGrid(x, z);
    const index = grid.z * this.GRID_SIZE + grid.x;
    const value = this.inkGrid[index];

    if (value === 1) return 'orange';
    if (value === 2) return 'blue';
    return 'neutral';
  }

  // Check if position is on friendly ink
  isOnFriendlyInk(x, z, team) {
    return this.getInkAt(x, z) === team;
  }

  // Check if position is on enemy ink
  isOnEnemyInk(x, z, team) {
    const ink = this.getInkAt(x, z);
    return ink !== 'neutral' && ink !== team;
  }

  // Get speed modifier for position
  getSpeedModifier(x, z, team) {
    const ink = this.getInkAt(x, z);

    if (ink === team) {
      return 1.3; // Speed boost on own ink
    } else if (ink !== 'neutral') {
      return 0.7; // Speed penalty on enemy ink
    }

    return 1.0; // Normal speed on neutral
  }

  // Get ink recovery rate modifier
  getInkRecoveryModifier(x, z, team) {
    if (this.isOnFriendlyInk(x, z, team)) {
      return 3.0; // 3x recovery on own ink
    }
    return 1.0;
  }

  // Get team scores (percentage of painted area)
  getTeamScores() {
    return {
      orange: this.orangeCount,
      blue: this.blueCount,
      total: this.GRID_SIZE * this.GRID_SIZE
    };
  }

  // Draw minimap
  drawMinimap(ctx, width, height) {
    const cellWidth = width / this.GRID_SIZE;
    const cellHeight = height / this.GRID_SIZE;

    // Use image data for faster rendering
    const imageData = ctx.createImageData(this.GRID_SIZE, this.GRID_SIZE);

    for (let i = 0; i < this.inkGrid.length; i++) {
      const value = this.inkGrid[i];
      const idx = i * 4;

      if (value === 1) {
        // Orange
        imageData.data[idx] = 255;
        imageData.data[idx + 1] = 107;
        imageData.data[idx + 2] = 53;
        imageData.data[idx + 3] = 200;
      } else if (value === 2) {
        // Blue
        imageData.data[idx] = 52;
        imageData.data[idx + 1] = 152;
        imageData.data[idx + 2] = 219;
        imageData.data[idx + 3] = 200;
      } else {
        // Neutral
        imageData.data[idx] = 40;
        imageData.data[idx + 1] = 40;
        imageData.data[idx + 2] = 60;
        imageData.data[idx + 3] = 200;
      }
    }

    // Create temporary canvas for scaling
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.GRID_SIZE;
    tempCanvas.height = this.GRID_SIZE;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);

    // Draw scaled
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, width, height);
  }

  // Draw result map
  drawResultMap(ctx, width, height) {
    // Draw ink coverage
    this.drawMinimap(ctx, width, height);

    // Add arena border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    // Draw spawn areas
    const spawnSize = width * 0.15;

    // Orange spawn
    ctx.fillStyle = 'rgba(255, 107, 53, 0.5)';
    ctx.fillRect(0, height / 2 - spawnSize / 2, spawnSize, spawnSize);

    // Blue spawn
    ctx.fillStyle = 'rgba(52, 152, 219, 0.5)';
    ctx.fillRect(width - spawnSize, height / 2 - spawnSize / 2, spawnSize, spawnSize);
  }

  update(deltaTime) {
    // Process any pending ink updates
    // (Currently immediate, but could be batched for performance)
  }

  reset() {
    this.inkGrid.fill(0);
    this.orangeCount = 0;
    this.blueCount = 0;
  }
}
