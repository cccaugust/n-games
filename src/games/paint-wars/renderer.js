// ===== PAINT WARS - Three.js Renderer =====

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { ModelFactory } from '../../libs/3d/model-factory.js';

export class GameRenderer {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.canvas = null;

    // Model factory for 3D assets
    this.modelFactory = null;

    // Objects
    this.floor = null;
    this.walls = [];
    this.playerMeshes = new Map();
    this.playerModels = new Map(); // Store Model3D instances
    this.projectiles = [];
    this.inkSplats = [];
    this.effects = [];

    // Ink texture
    this.inkCanvas = null;
    this.inkContext = null;
    this.inkTexture = null;

    // Constants
    this.ARENA_SIZE = 50;
    this.WALL_HEIGHT = 3;
  }

  async init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 40, 80);

    // Create camera (top-down view)
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    this.camera.position.set(0, 35, 20);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.canvas = this.renderer.domElement;
    this.container.appendChild(this.canvas);

    // Create ink texture
    this.createInkTexture();

    // Create arena
    this.createArena();

    // Add lights
    this.createLights();

    // Initialize model factory
    this.modelFactory = new ModelFactory(THREE);

    return this;
  }

  createInkTexture() {
    // Create canvas for ink painting
    const size = 512;
    this.inkCanvas = document.createElement('canvas');
    this.inkCanvas.width = size;
    this.inkCanvas.height = size;
    this.inkContext = this.inkCanvas.getContext('2d');

    // Fill with neutral color
    this.inkContext.fillStyle = '#333333';
    this.inkContext.fillRect(0, 0, size, size);

    // Create texture
    this.inkTexture = new THREE.CanvasTexture(this.inkCanvas);
    this.inkTexture.minFilter = THREE.LinearFilter;
    this.inkTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.inkTexture.wrapT = THREE.ClampToEdgeWrapping;
  }

  createArena() {
    const size = this.ARENA_SIZE;

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(size, size);
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: this.inkTexture,
      roughness: 0.8,
      metalness: 0.1
    });
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    // Grid pattern overlay
    const gridHelper = new THREE.GridHelper(size, 25, 0x444444, 0x333333);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    // Walls around arena
    this.createWalls();

    // Obstacles (pillars, blocks)
    this.createObstacles();
  }

  createWalls() {
    const size = this.ARENA_SIZE;
    const wallHeight = this.WALL_HEIGHT;
    const wallThickness = 1;

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a4a,
      roughness: 0.7,
      metalness: 0.2
    });

    // North wall
    const northWall = new THREE.Mesh(
      new THREE.BoxGeometry(size + wallThickness * 2, wallHeight, wallThickness),
      wallMaterial
    );
    northWall.position.set(0, wallHeight / 2, -size / 2 - wallThickness / 2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    this.scene.add(northWall);
    this.walls.push(northWall);

    // South wall
    const southWall = northWall.clone();
    southWall.position.z = size / 2 + wallThickness / 2;
    this.scene.add(southWall);
    this.walls.push(southWall);

    // East wall
    const eastWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, size),
      wallMaterial
    );
    eastWall.position.set(size / 2 + wallThickness / 2, wallHeight / 2, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    this.scene.add(eastWall);
    this.walls.push(eastWall);

    // West wall
    const westWall = eastWall.clone();
    westWall.position.x = -size / 2 - wallThickness / 2;
    this.scene.add(westWall);
    this.walls.push(westWall);
  }

  createObstacles() {
    const obstacleMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a5a,
      roughness: 0.6,
      metalness: 0.3
    });

    // Center structure
    const centerPillar = new THREE.Mesh(
      new THREE.BoxGeometry(6, 2, 6),
      obstacleMaterial
    );
    centerPillar.position.set(0, 1, 0);
    centerPillar.castShadow = true;
    centerPillar.receiveShadow = true;
    this.scene.add(centerPillar);
    this.walls.push(centerPillar);

    // Corner structures
    const cornerPositions = [
      { x: -15, z: -15 },
      { x: 15, z: -15 },
      { x: -15, z: 15 },
      { x: 15, z: 15 }
    ];

    cornerPositions.forEach(pos => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2, 3, 8),
        obstacleMaterial
      );
      pillar.position.set(pos.x, 1.5, pos.z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);
      this.walls.push(pillar);
    });

    // Cross barriers
    const barrierPositions = [
      { x: -10, z: 0, rotY: 0 },
      { x: 10, z: 0, rotY: 0 },
      { x: 0, z: -10, rotY: Math.PI / 2 },
      { x: 0, z: 10, rotY: Math.PI / 2 }
    ];

    barrierPositions.forEach(pos => {
      const barrier = new THREE.Mesh(
        new THREE.BoxGeometry(8, 1.5, 1.5),
        obstacleMaterial
      );
      barrier.position.set(pos.x, 0.75, pos.z);
      barrier.rotation.y = pos.rotY;
      barrier.castShadow = true;
      barrier.receiveShadow = true;
      this.scene.add(barrier);
      this.walls.push(barrier);
    });
  }

  createLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    // Main directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffffee, 1.0);
    sunLight.position.set(20, 40, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    this.scene.add(sunLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-20, 20, -20);
    this.scene.add(fillLight);

    // Team spawn point lights
    const orangeLight = new THREE.PointLight(0xff6b35, 0.8, 15);
    orangeLight.position.set(-20, 5, 0);
    this.scene.add(orangeLight);

    const blueLight = new THREE.PointLight(0x3498db, 0.8, 15);
    blueLight.position.set(20, 5, 0);
    this.scene.add(blueLight);
  }

  addPlayer(player) {
    const color = player.team === 'orange' ? 0xff6b35 : 0x3498db;
    const playerGroup = new THREE.Group();

    // Try to use 3D model from asset library
    const modelId = player.character?.modelId || player.character?.id;
    let model3D = null;

    if (modelId && this.modelFactory) {
      try {
        // Determine variant based on team or player selection
        let variant = player.variant;
        if (!variant) {
          // Use team-appropriate variant if not specified
          variant = player.team === 'orange' ? 'orange' : 'cyan';
        }

        model3D = this.modelFactory.create(modelId, { variant });

        if (model3D && model3D.mesh) {
          // Scale and position the model
          const box = new THREE.Box3().setFromObject(model3D.mesh);
          const size = box.getSize(new THREE.Vector3());
          const maxSize = Math.max(size.x, size.y, size.z);
          const scale = 1.2 / maxSize;
          model3D.mesh.scale.setScalar(scale);

          // Center horizontally
          const center = box.getCenter(new THREE.Vector3());
          model3D.mesh.position.x = -center.x * scale;
          model3D.mesh.position.y = 0;
          model3D.mesh.position.z = -center.z * scale;

          model3D.mesh.castShadow = true;
          playerGroup.add(model3D.mesh);

          // Store model for animation updates
          this.playerModels.set(player, model3D);

          // Start idle animation
          if (model3D.animate) {
            model3D.animate('idle');
          }
        }
      } catch (error) {
        console.warn('Failed to load player model:', modelId, error);
        model3D = null;
      }
    }

    // Fallback to simple capsule if model failed
    if (!model3D || !model3D.mesh) {
      const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1, 8, 16);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.5,
        metalness: 0.2
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 1;
      body.castShadow = true;
      playerGroup.add(body);

      // Eyes
      const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
      const eyeMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.3
      });
      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(-0.2, 1.3, 0.4);
      playerGroup.add(leftEye);
      const rightEye = leftEye.clone();
      rightEye.position.x = 0.2;
      playerGroup.add(rightEye);
    }

    // Player marker (for visibility from above)
    if (player.isPlayer) {
      const markerGeometry = new THREE.ConeGeometry(0.4, 0.6, 4);
      const markerMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: color,
        emissiveIntensity: 0.5
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.y = 2.5;
      marker.rotation.x = Math.PI;
      playerGroup.add(marker);
    }

    // Set initial position
    playerGroup.position.set(player.position.x, 0, player.position.z);

    this.scene.add(playerGroup);
    this.playerMeshes.set(player, playerGroup);
  }

  updatePlayer(player) {
    const mesh = this.playerMeshes.get(player);
    if (!mesh) return;

    mesh.position.x = player.position.x;
    mesh.position.z = player.position.z;

    // Handle death visibility
    mesh.visible = !player.isDead;

    // Rotation based on aim direction
    if (player.aimDirection) {
      mesh.rotation.y = Math.atan2(player.aimDirection.x, player.aimDirection.z);
    }

    // Bobbing animation while moving
    if (player.isMoving) {
      const bob = Math.sin(Date.now() * 0.01) * 0.05;
      mesh.position.y = bob;
    } else {
      mesh.position.y = 0;
    }
  }

  addProjectile(projectile) {
    const color = projectile.team === 'orange' ? 0xff6b35 : 0x3498db;

    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(projectile.position.x, 0.5, projectile.position.z);

    this.scene.add(mesh);
    this.projectiles.push({ mesh, projectile });
  }

  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const { mesh, projectile } = this.projectiles[i];

      if (projectile.isActive) {
        mesh.position.x = projectile.position.x;
        mesh.position.z = projectile.position.z;
      } else {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  addInkSplat(x, z, radius, team) {
    // Paint on ink texture
    const size = this.inkCanvas.width;
    const cx = ((x / this.ARENA_SIZE) + 0.5) * size;
    const cy = ((z / this.ARENA_SIZE) + 0.5) * size;
    const r = (radius / this.ARENA_SIZE) * size;

    const color = team === 'orange' ? '#ff6b35' : '#3498db';

    this.inkContext.fillStyle = color;
    this.inkContext.beginPath();
    this.inkContext.arc(cx, cy, r, 0, Math.PI * 2);
    this.inkContext.fill();

    // Add some splatter effect
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = r * (0.5 + Math.random() * 0.5);
      const splatR = r * (0.2 + Math.random() * 0.3);

      this.inkContext.beginPath();
      this.inkContext.arc(
        cx + Math.cos(angle) * dist,
        cy + Math.sin(angle) * dist,
        splatR,
        0,
        Math.PI * 2
      );
      this.inkContext.fill();
    }

    this.inkTexture.needsUpdate = true;
  }

  addEffect(type, position, team) {
    const color = team === 'orange' ? 0xff6b35 : 0x3498db;

    if (type === 'hit') {
      // Hit effect
      const geometry = new THREE.RingGeometry(0.1, 0.5, 16);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(position.x, 0.1, position.z);

      this.scene.add(ring);
      this.effects.push({
        mesh: ring,
        type: 'expand',
        life: 0.3,
        maxLife: 0.3
      });
    } else if (type === 'death') {
      // Death explosion effect
      for (let i = 0; i < 10; i++) {
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 1
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(position.x, 1, position.z);

        const velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          Math.random() * 5,
          (Math.random() - 0.5) * 10
        );

        this.scene.add(sphere);
        this.effects.push({
          mesh: sphere,
          type: 'explode',
          velocity: velocity,
          life: 0.5,
          maxLife: 0.5
        });
      }
    }
  }

  updateEffects(deltaTime) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.life -= deltaTime;

      if (effect.life <= 0) {
        this.scene.remove(effect.mesh);
        effect.mesh.geometry.dispose();
        effect.mesh.material.dispose();
        this.effects.splice(i, 1);
        continue;
      }

      const progress = 1 - (effect.life / effect.maxLife);

      if (effect.type === 'expand') {
        effect.mesh.scale.setScalar(1 + progress * 2);
        effect.mesh.material.opacity = 1 - progress;
      } else if (effect.type === 'explode') {
        effect.mesh.position.add(effect.velocity.clone().multiplyScalar(deltaTime));
        effect.velocity.y -= 15 * deltaTime; // Gravity
        effect.mesh.material.opacity = 1 - progress;
        effect.mesh.scale.setScalar(1 - progress * 0.5);
      }
    }
  }

  followPlayer(player) {
    if (!player) return;

    // Smoothly follow player
    const targetX = player.position.x * 0.3;
    const targetZ = player.position.z * 0.3 + 20;

    this.camera.position.x += (targetX - this.camera.position.x) * 0.05;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.05;

    this.camera.lookAt(player.position.x * 0.5, 0, player.position.z * 0.5);
  }

  // Set camera position immediately to player (for game start)
  setCameraToPlayer(player) {
    if (!player) return;

    const targetX = player.position.x * 0.3;
    const targetZ = player.position.z * 0.3 + 20;

    this.camera.position.x = targetX;
    this.camera.position.z = targetZ;
    this.camera.lookAt(player.position.x * 0.5, 0, player.position.z * 0.5);
  }

  getInkTexture() {
    return this.inkCanvas;
  }

  render() {
    this.updateEffects(1 / 60);
    this.updateProjectiles();

    // Update all player meshes
    this.playerMeshes.forEach((mesh, player) => {
      this.updatePlayer(player);
    });

    // Update 3D model animations
    this.playerModels.forEach((model, player) => {
      if (model && model.update) {
        model.update(1 / 60);
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  dispose() {
    // Clean up Three.js resources
    this.playerMeshes.forEach((mesh, player) => {
      this.scene.remove(mesh);
    });
    this.playerMeshes.clear();

    // Dispose 3D models
    this.playerModels.forEach((model, player) => {
      if (model && model.dispose) {
        model.dispose();
      }
    });
    this.playerModels.clear();

    this.projectiles.forEach(({ mesh }) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.projectiles = [];

    this.effects.forEach(effect => {
      this.scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
    });
    this.effects = [];

    if (this.renderer) {
      this.renderer.dispose();
      this.container.removeChild(this.canvas);
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}
