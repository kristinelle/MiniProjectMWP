import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { collisionBounds, defaultSettings } from './locations.js';

/**
 * TourControls
 * 
 * Manages look-around and movement controls.
 * Uses OrbitControls for mouse interaction (drag to look, wheel to zoom).
 * Translates camera position and look-at target together using WASD keys or Arrows 
 * to provide a smooth horizontal walking/sliding experience.
 */
export class TourControls {
  /**
   * @param {THREE.Camera} camera - The active perspective camera
   * @param {HTMLElement} domElement - The WebGL renderer canvas element
   * @param {Array<THREE.Object3D>} collidableObjects - Optional collidable meshes
   */
  constructor(camera, domElement, collidableObjects = []) {
    this.camera = camera;
    this.domElement = domElement;
    this.collidableObjects = collidableObjects;
    
    this.moveSpeed = defaultSettings.movementSpeed;
    this.playerHeight = defaultSettings.playerHeight;
    
    // Movement status flags
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    
    this.enabled = false;
    this.orbitControls = null;

    this.init();
  }

  init() {
    this.setupOrbitControls();
    this.setupKeyboardControls();
  }

  /**
   * Configures OrbitControls for look and zoom behavior
   */
  setupOrbitControls() {
    this.orbitControls = new OrbitControls(this.camera, this.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.screenSpacePanning = false; // Vertical panning disabled
    
    // Clamp viewing angles to stay in human perspective bounds
    this.orbitControls.minPolarAngle = Math.PI / 3;     // Don't look directly down
    this.orbitControls.maxPolarAngle = Math.PI / 2.05;  // Don't dip under the ground plane
    
    // Set standard zoom boundaries
    this.orbitControls.minDistance = 3;
    this.orbitControls.maxDistance = 55;
    
    // Position target (focus point) in front of camera
    this.orbitControls.target.set(
      defaultSettings.startLookAt.x,
      defaultSettings.startLookAt.y,
      defaultSettings.startLookAt.z
    );
    this.orbitControls.update();
  }

  /**
   * Binds key events for WASD and Arrow key navigation
   */
  setupKeyboardControls() {
    const onKeyDown = (event) => {
      if (!this.enabled) return;
      
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = true;
          break;
      }
    };

    const onKeyUp = (event) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = false;
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    
    this.cleanupListeners = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }

  /**
   * Activates or deactivates controls
   * @param {boolean} isEnabled - Toggle state
   */
  setEnabled(isEnabled) {
    this.enabled = isEnabled;
    if (this.orbitControls) {
      this.orbitControls.enabled = isEnabled;
    }
    
    if (!isEnabled) {
      // Clear movement state when disabled
      this.moveForward = false;
      this.moveBackward = false;
      this.moveLeft = false;
      this.moveRight = false;
    }
  }

  /**
   * Helper method (kept for main.js interface compatibility)
   */
  lock() {
    // Under the OrbitControls scheme, lock is not required.
    // We simply enable controls.
    this.setEnabled(true);
  }

  /**
   * Updates camera and target position inside requestAnimationFrame.
   * 
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   */
  update(deltaTime) {
    if (!this.enabled || !this.orbitControls) return;

    // Check if any move key is active
    if (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) {
      // 1. Calculate movement vectors relative to camera looking angle
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0; // Restrict motion to the ground plane (X-Z)
      forward.normalize();

      // Right vector is perpendicular to forward vector
      const right = new THREE.Vector3();
      right.crossVectors(forward, this.camera.up).normalize();

      // Combine directions
      const direction = new THREE.Vector3();
      if (this.moveForward) direction.add(forward);
      if (this.moveBackward) direction.add(forward.clone().negate());
      if (this.moveLeft) direction.add(right.clone().negate());
      if (this.moveRight) direction.add(right);
      
      direction.normalize();

      // Determine step distance
      const step = this.moveSpeed * deltaTime;
      const displacement = direction.multiplyScalar(step);

      // Record pre-displacement coordinates for boundary fallback
      const oldCamPos = this.camera.position.clone();
      const oldTargetPos = this.orbitControls.target.clone();

      // Translate camera and target together to slide/walk the view
      this.camera.position.add(displacement);
      this.orbitControls.target.add(displacement);

      // 2. Map boundary clamping (prevent walk-off)
      let clamped = false;
      if (this.camera.position.x < collisionBounds.minX) {
        this.camera.position.x = collisionBounds.minX;
        clamped = true;
      }
      if (this.camera.position.x > collisionBounds.maxX) {
        this.camera.position.x = collisionBounds.maxX;
        clamped = true;
      }
      if (this.camera.position.z < collisionBounds.minZ) {
        this.camera.position.z = collisionBounds.minZ;
        clamped = true;
      }
      if (this.camera.position.z > collisionBounds.maxZ) {
        this.camera.position.z = collisionBounds.maxZ;
        clamped = true;
      }

      // If boundary was clamped, offset target by actual camera distance traveled
      if (clamped) {
        const actualDisplacement = this.camera.position.clone().sub(oldCamPos);
        this.orbitControls.target.copy(oldTargetPos).add(actualDisplacement);
      }
    }

    // Update controls damping
    this.orbitControls.update();
  }

  destroy() {
    if (this.cleanupListeners) this.cleanupListeners();
    if (this.orbitControls) this.orbitControls.dispose();
  }
}
