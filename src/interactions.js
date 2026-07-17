import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { hotspots } from './locations.js';

/**
 * TourInteractions
 * 
 * Manages raycasting, object highlights, interactive beacons, and lighting toggles.
 * Removed programmatic double doors. Click transitions smoothly pan the camera using OrbitControls.
 */
export class TourInteractions {
  /**
   * @param {THREE.Scene} scene - The active scene
   * @param {THREE.Camera} camera - The active camera
   * @param {TourControls} controls - The controls manager instance
   */
  constructor(scene, camera, controls) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Registry for interactive objects
    this.interactiveObjects = [];
    this.hoveredObject = null;
    this.originalEmissive = new Map(); // Store original emissive colors

    // Hotspot beacons references
    this.beacons = [];
    
    // Light toggle state
    this.lightOn = true;
    this.campusSpotLight = null;
    this.lampBulbMesh = null;

    this.init();
  }

  init() {
    this.createBeacons();
    this.createProgrammaticLightPost();
    this.setupListeners();
  }

  /**
   * Generates floating 3D beacons at hotspot coordinates
   */
  createBeacons() {
    hotspots.forEach((spot) => {
      // Skip light switch coordinates for floating beacons, as it has a custom post mesh
      if (spot.id === "light_switch") return;

      const group = new THREE.Group();
      group.position.set(spot.position.x, spot.position.y + 0.5, spot.position.z);
      group.name = `beacon_${spot.id}`;

      // Outer gold ring
      const ringGeo = new THREE.TorusGeometry(0.3, 0.05, 8, 24);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xF1A400, // UTM Gold
        emissive: 0xF1A400,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.8
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.castShadow = true;
      group.add(ring);

      // Inner pulse diamond (Octahedron)
      const coreGeo = new THREE.OctahedronGeometry(0.18);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x8A1538, // UTM Maroon
        emissive: 0x8A1538,
        emissiveIntensity: 0.3,
        roughness: 0.2,
        metalness: 0.5
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 0;
      core.castShadow = true;
      group.add(core);

      // Save custom identification metadata on child meshes for Raycasting
      ring.userData = { type: 'hotspot', id: spot.id, parentGroup: group };
      core.userData = { type: 'hotspot', id: spot.id, parentGroup: group };

      this.scene.add(group);
      this.beacons.push(group);
      
      // Register both for raycasting
      this.interactiveObjects.push(ring, core);
    });
  }

  /**
   * Programmatically builds a lamp post with a spotlight.
   * Provides the interactive light switch toggle object.
   */
  createProgrammaticLightPost() {
    const postX = 6;
    const postZ = 6;

    // Post Group
    const lightGroup = new THREE.Group();
    lightGroup.position.set(postX, 0, postZ);

    // 1. Metal Pole
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 4.5);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2.25;
    pole.castShadow = true;
    pole.receiveShadow = true;
    lightGroup.add(pole);

    // 2. Lamp Bulb (Glowing sphere)
    const bulbGeo = new THREE.SphereGeometry(0.3, 16, 16);
    this.lampBulbMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfffaed,
      emissiveIntensity: 1.5,
      roughness: 0.1
    });
    this.lampBulbMesh = new THREE.Mesh(bulbGeo, this.lampBulbMaterial);
    this.lampBulbMesh.position.set(0, 4.5, 0.3);
    lightGroup.add(this.lampBulbMesh);

    // 3. Switch Box (Clickable target)
    const boxGeo = new THREE.BoxGeometry(0.25, 0.4, 0.2);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0xF1A400, // Gold switch box
      roughness: 0.2,
      metalness: 0.8
    });
    const switchBox = new THREE.Mesh(boxGeo, boxMat);
    switchBox.position.set(0, 1.2, 0.12);
    switchBox.castShadow = true;
    switchBox.name = "light_switch_trigger";
    switchBox.userData = { type: 'light_switch' };
    lightGroup.add(switchBox);

    this.scene.add(lightGroup);
    this.interactiveObjects.push(switchBox, this.lampBulbMesh);

    // 4. Spotlight pointing downwards to light up the path
    this.campusSpotLight = new THREE.SpotLight(0xfffaed, 5, 18, Math.PI / 3, 0.5, 1);
    this.campusSpotLight.position.set(postX, 4.5, postZ + 0.3);
    this.campusSpotLight.target.position.set(postX, 0, postZ + 2);
    this.campusSpotLight.castShadow = true;
    this.campusSpotLight.shadow.mapSize.width = 512;
    this.campusSpotLight.shadow.mapSize.height = 512;
    
    this.scene.add(this.campusSpotLight);
    this.scene.add(this.campusSpotLight.target);
  }

  /**
   * Registers mouse listeners for raycast triggers
   */
  setupListeners() {
    const onMouseMove = (event) => {
      // Calculate mouse position in normalized device coordinates (-1 to +1)
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.checkHover();
    };

    const onClick = (event) => {
      // Raycast click
      if (this.controls.enabled) {
        this.checkClick();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);

    this.cleanupListeners = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
    };
  }

  /**
   * Checks if the pointer is hovering over any interactive elements
   */
  checkHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // We search all interactive elements, and also check child meshes of sub-hierarchies
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    if (intersects.length > 0) {
      // Find the first valid interactive mesh
      let hitMesh = intersects[0].object;
      
      // Bubble up if custom interactive info is stored on parent
      while (hitMesh && !hitMesh.userData.type && hitMesh.parent) {
        hitMesh = hitMesh.parent;
      }

      if (hitMesh && hitMesh.userData.type) {
        if (this.hoveredObject !== hitMesh) {
          this.resetHover();
          this.hoveredObject = hitMesh;

          // Apply gold emissive highlight
          if (hitMesh.material && hitMesh.material.emissive) {
            this.originalEmissive.set(hitMesh.uuid, {
              color: hitMesh.material.emissive.clone(),
              intensity: hitMesh.material.emissiveIntensity
            });
            hitMesh.material.emissive.setHex(0xF1A400); // Highlight Gold
            hitMesh.material.emissiveIntensity = 1.0;
          }

          // Update HUD hovered object text
          const hoverText = document.getElementById('hovered-object-name');
          if (hoverText) {
            let name = hitMesh.name || hitMesh.userData.type;
            if (hitMesh.userData.id) {
              const spot = hotspots.find(s => s.id === hitMesh.userData.id);
              if (spot) name = spot.name;
            }
            hoverText.textContent = name;
          }
        }
        return;
      }
    }

    this.resetHover();
  }

  resetHover() {
    if (this.hoveredObject) {
      if (this.hoveredObject.material && this.hoveredObject.material.emissive) {
        const orig = this.originalEmissive.get(this.hoveredObject.uuid);
        if (orig) {
          this.hoveredObject.material.emissive.copy(orig.color);
          this.hoveredObject.material.emissiveIntensity = orig.intensity;
        }
      }
      this.hoveredObject = null;
      
      const hoverText = document.getElementById('hovered-object-name');
      if (hoverText) hoverText.textContent = "None";
    }
  }

  /**
   * Evaluates click intersections and triggers actions
   */
  checkClick() {
    // Only check clicks if mouse is not clicking on HTML elements (HUD overlays, panels)
    // Three.js Raycaster checks WebGL scene elements
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    if (intersects.length > 0) {
      let hitMesh = intersects[0].object;
      
      // Bubble up if needed
      while (hitMesh && !hitMesh.userData.type && hitMesh.parent) {
        hitMesh = hitMesh.parent;
      }

      if (hitMesh && hitMesh.userData.type) {
        const data = hitMesh.userData;
        
        // Log clicked mesh name to console to assist user debugging/development
        console.log(`[Inspector] Clicked Mesh - Name: "${hitMesh.name}", ID: "${data.id}", Type: "${data.type}"`, hitMesh);
        
        const clickText = document.getElementById('clicked-object-name');
        if (clickText) clickText.textContent = hitMesh.name || data.type;

        // Perform specific animations or alerts
        if (data.type === 'hotspot') {
          this.triggerHotspot(data.id);
        } else if (data.type === 'light_switch') {
          this.toggleLight();
        }
      }
    }
  }

  /**
   * Displays details popup for clicked location hotspot
   * 
   * @param {string} id - The hotspot identifier
   */
  triggerHotspot(id) {
    const spot = hotspots.find(s => s.id === id);
    if (!spot) return;

    // Trigger HTML Info overlay panel
    const infoPanel = document.getElementById('info-panel');
    const infoTitle = document.getElementById('info-title');
    const infoDesc = document.getElementById('info-desc');

    if (infoPanel && infoTitle && infoDesc) {
      infoTitle.textContent = spot.name;
      infoDesc.textContent = spot.description;
      infoPanel.classList.remove('hidden');
    }

    // Mark HUD checklist item
    const chkHotspot = document.getElementById('chk-hotspots');
    if (chkHotspot) chkHotspot.classList.add('checked');

    // Smooth camera glide towards the hotspot using OrbitControls
    if (this.controls.orbitControls) {
      // Temporarily disable controls during transition to prevent camera jitter
      this.controls.orbitControls.enabled = false;

      new TWEEN.Tween(this.camera.position)
        .to({ x: spot.position.x, y: spot.position.y + 1.2, z: spot.position.z + 5 }, 1500)
        .easing(TWEEN.Easing.Cubic.Out)
        .start();

      new TWEEN.Tween(this.controls.orbitControls.target)
        .to({ x: spot.cameraLook.x, y: spot.cameraLook.y, z: spot.cameraLook.z }, 1500)
        .easing(TWEEN.Easing.Cubic.Out)
        .onComplete(() => {
          this.controls.orbitControls.enabled = true;
        })
        .start();
    }
  }

  /**
   * Toggles lights on/off in the scene
   */
  toggleLight() {
    this.lightOn = !this.lightOn;

    // Toggle spotlight intensity
    if (this.campusSpotLight) {
      const targetIntensity = this.lightOn ? 5 : 0;
      new TWEEN.Tween(this.campusSpotLight)
        .to({ intensity: targetIntensity }, 400)
        .start();
    }

    // Update bulb glow look
    if (this.lampBulbMesh && this.lampBulbMaterial) {
      const bulbColor = this.lightOn ? 0xffffff : 0x444444;
      const bulbEmissive = this.lightOn ? 0xfffaed : 0x000000;
      const emissiveInt = this.lightOn ? 1.5 : 0.0;
      
      this.lampBulbMaterial.color.setHex(bulbColor);
      this.lampBulbMaterial.emissive.setHex(bulbEmissive);
      this.lampBulbMaterial.emissiveIntensity = emissiveInt;
    }

    // Trigger HTML panel for light info
    const lightSpot = hotspots.find(s => s.id === "light_switch");
    if (lightSpot) {
      const infoPanel = document.getElementById('info-panel');
      const infoTitle = document.getElementById('info-title');
      const infoDesc = document.getElementById('info-desc');

      if (infoPanel && infoTitle && infoDesc) {
        infoTitle.textContent = lightSpot.name;
        infoDesc.textContent = this.lightOn
          ? `${lightSpot.description} \n\n[Status: The pathway spotlights are currently turned ON.]`
          : `${lightSpot.description} \n\n[Status: The spotlights are currently turned OFF. Thank you for conserving energy!]`;
        infoPanel.classList.remove('hidden');
      }
    }

    // Mark HUD checklist item
    const chkLight = document.getElementById('chk-light');
    if (chkLight) chkLight.classList.add('checked');
  }

  /**
   * Integrates additional meshes from loaded GLB into the Raycast registry.
   * e.g., mapping doors or lights inside the loaded file to active states.
   * 
   * @param {THREE.Object3D} model - The loaded GLB hierarchy root
   */
  registerGLBModels(model) {
    model.traverse((child) => {
      if (child.isMesh) {
        // Push to interactives list to allow clicking and console logging of its details
        this.interactiveObjects.push(child);
        
        // Add identification tag in user data
        if (!child.userData.type) {
          child.userData.type = 'glb_mesh';
        }
      }
    });
  }

  /**
   * Drives animation updates for beacons and TWEEN engines.
   * Called in the main tick loop.
   */
  update(time) {
    // 1. Update Tween engines
    TWEEN.update();

    // 2. Animate beacons (bounce up and down, spin around)
    this.beacons.forEach((group, index) => {
      group.rotation.y += 0.015;
      
      // Unique phase offset per beacon for organic feel
      const phase = time * 2.5 + index * Math.PI / 3;
      group.position.y = (hotspots[index]?.position?.y || 1.5) + 0.3 + Math.sin(phase) * 0.08;
    });
  }

  destroy() {
    if (this.cleanupListeners) this.cleanupListeners();
    this.beacons.forEach(b => this.scene.remove(b));
    this.beacons = [];
    this.interactiveObjects = [];
  }
}
