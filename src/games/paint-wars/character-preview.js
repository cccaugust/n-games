// ===== PAINT WARS - Character Preview =====
// キャラクター選択画面の3Dプレビュー

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { ModelFactory } from '../../libs/3d/model-factory.js';

export class CharacterPreview {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.modelFactory = null;
    this.currentModel = null;
    this.animationId = null;
    this.rotationSpeed = 0.01;
    this.isAnimating = false;
  }

  async init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Create camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 1.5, 4);
    this.camera.lookAt(0, 0.8, 0);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // Clear container and add canvas
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Add lights
    this.createLights();

    // Add floor
    this.createFloor();

    // Initialize model factory
    this.modelFactory = new ModelFactory(THREE);

    // Handle resize
    window.addEventListener('resize', () => this.handleResize());

    // Start animation loop
    this.startAnimation();

    return this;
  }

  createLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    // Main light
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(3, 5, 3);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 512;
    mainLight.shadow.mapSize.height = 512;
    this.scene.add(mainLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-3, 3, -3);
    this.scene.add(fillLight);

    // Rim light
    const rimLight = new THREE.DirectionalLight(0xff6b35, 0.3);
    rimLight.position.set(0, 2, -4);
    this.scene.add(rimLight);
  }

  createFloor() {
    const floorGeometry = new THREE.CircleGeometry(2, 32);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a4a,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  setCharacter(modelId, variant = 'default') {
    // Remove current model
    if (this.currentModel) {
      this.scene.remove(this.currentModel.mesh);
      if (this.currentModel.dispose) {
        this.currentModel.dispose();
      }
      this.currentModel = null;
    }

    // Create new model
    try {
      this.currentModel = this.modelFactory.create(modelId, { variant });
      if (this.currentModel && this.currentModel.mesh) {
        // Center the model
        const box = new THREE.Box3().setFromObject(this.currentModel.mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Scale to fit
        const maxSize = Math.max(size.x, size.y, size.z);
        const scale = 1.5 / maxSize;
        this.currentModel.mesh.scale.setScalar(scale);

        // Position at center
        this.currentModel.mesh.position.x = -center.x * scale;
        this.currentModel.mesh.position.y = 0;
        this.currentModel.mesh.position.z = -center.z * scale;

        this.currentModel.mesh.castShadow = true;
        this.scene.add(this.currentModel.mesh);

        // Start idle animation if available
        if (this.currentModel.animate) {
          this.currentModel.animate('idle');
        }
      }
    } catch (error) {
      console.warn('Failed to load character model:', modelId, error);
      this.createFallbackModel(variant);
    }
  }

  createFallbackModel(variant) {
    // Create a simple capsule as fallback
    const geometry = new THREE.CapsuleGeometry(0.3, 0.6, 8, 16);
    const color = this.getVariantColor(variant);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.6;
    mesh.castShadow = true;

    this.currentModel = { mesh, dispose: () => {
      geometry.dispose();
      material.dispose();
    }};
    this.scene.add(mesh);
  }

  getVariantColor(variant) {
    const colorMap = {
      'orange': 0xff6b35,
      'cyan': 0x00bcd4,
      'purple': 0x9c27b0,
      'pink': 0xe91e63,
      'lime': 0x8bc34a,
      'yellow': 0xffeb3b,
      'blue': 0x2196f3,
      'red': 0xf44336,
      'green': 0x4caf50,
      'gold': 0xffd700
    };
    return colorMap[variant] || 0x888888;
  }

  startAnimation() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.animate();
  }

  stopAnimation() {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  animate() {
    if (!this.isAnimating) return;

    this.animationId = requestAnimationFrame(() => this.animate());

    // Rotate model
    if (this.currentModel && this.currentModel.mesh) {
      this.currentModel.mesh.rotation.y += this.rotationSpeed;

      // Update model animation
      if (this.currentModel.update) {
        this.currentModel.update(1 / 60);
      }
    }

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    if (!this.container || !this.renderer) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    this.stopAnimation();

    if (this.currentModel) {
      this.scene.remove(this.currentModel.mesh);
      if (this.currentModel.dispose) {
        this.currentModel.dispose();
      }
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.container.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement);
      }
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.modelFactory = null;
  }
}
