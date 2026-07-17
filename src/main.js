import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createScene } from './scene.js';
import { TourControls } from './controls.js';
import { TourInteractions } from './interactions.js';
import './style.css';

// 1. Core State variables
let scene, camera, renderer, controls, interactions;
let clock;
let collidableObjects = [];

// DOM elements
const loadingScreen = document.getElementById('loading-screen');
const loadingStatus = document.getElementById('loading-status');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-percentage');

const welcomeScreen = document.getElementById('welcome-screen');
const btnStart = document.getElementById('btn-start');

const hudOverlay = document.getElementById('hud-overlay');

const infoPanel = document.getElementById('info-panel');
const infoCloseBtn = document.getElementById('info-close');

// 2. Initialize application
function init() {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error("Critical Error: #canvas-container element not found in DOM.");
    return;
  }

  // Set up Three.js scene environment
  const sceneData = createScene(container);
  scene = sceneData.scene;
  camera = sceneData.camera;
  renderer = sceneData.renderer;

  clock = new THREE.Clock();

  // Instantiate controls system (OrbitControls look-around + WASD walking)
  controls = new TourControls(camera, renderer.domElement, collidableObjects);

  // Instantiate interactions (beacons, spotlights, and toggles)
  interactions = new TourInteractions(scene, camera, controls);

  // Load the campus model
  loadCampusModel();

  // Bind interface events
  bindUIEvents();
  
  // Start animation loop
  animate();
}

// 3. GLB Loader with progressive loading feedback
function loadCampusModel() {
  const loader = new GLTFLoader();
  
  // Define GLB URL - served from /public/models
  const modelUrl = 'models/sportsHall2.glb';
  
  // Hardcoded model size in bytes (6451044 bytes) to ensure accurate progress reporting
  const ESTIMATED_TOTAL_BYTES = 6451044;

  loadingStatus.textContent = "Downloading Sports Hall 3D model...";

  loader.load(
    modelUrl,
    // On load success
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);

      // Calculate and print model's physical dimensions to help verify starting scale
      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      console.log("=========================================");
      console.log("GLB Model loaded successfully!");
      console.log("Bounding Box Center Coordinates:", center);
      console.log("Bounding Box Size Dimensions:", size);
      console.log("=========================================");
      
      // Propagate shadows throughout the loaded geometry
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          // Note: Since we disabled mesh-level collisions to prevent locks,
          // we traverse and catalog wall elements for general reference.
          const nameLower = child.name.toLowerCase();
          const isFloor = nameLower.includes('floor') || 
                          nameLower.includes('ground') || 
                          nameLower.includes('grass') || 
                          nameLower.includes('path') ||
                          nameLower.includes('road') ||
                          nameLower.includes('terrain');

          if (!isFloor) {
            collidableObjects.push(child);
          }
        }
      });

      // Register the loaded meshes to the raycast intersector (allows console-log inspect)
      interactions.registerGLBModels(model);

      // Hide loader, transition to start screen
      loadingScreen.classList.add('hidden');
      welcomeScreen.classList.remove('hidden');
    },
    // On progress
    (xhr) => {
      let total = xhr.total || ESTIMATED_TOTAL_BYTES;
      let loaded = xhr.loaded;
      let percent = Math.min(Math.round((loaded / total) * 100), 100);
      
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `${percent}%`;
      loadingStatus.textContent = `Downloading: ${(loaded / (1024 * 1024)).toFixed(1)} MB / ${(total / (1024 * 1024)).toFixed(1)} MB`;
    },
    // On load failure
    (error) => {
      console.error("Failed to load UTM model. Falling back to placeholder room.", error);
      loadingStatus.textContent = "Error loading model. Launching placeholder campus...";
      
      // Create a decorative placeholder hall structure so the project doesn't break
      createPlaceholderHall();
      
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        welcomeScreen.classList.remove('hidden');
      }, 2000);
    }
  );
}

/**
 * Fallback generator in case the GLB fails to load.
 */
function createPlaceholderHall() {
  const hallGeo = new THREE.BoxGeometry(24, 8, 30);
  const hallMat = new THREE.MeshStandardMaterial({
    color: 0x4d2836, // Dark maroon walls
    roughness: 0.8,
    metalness: 0.1,
    side: THREE.BackSide
  });
  const placeholderHall = new THREE.Mesh(hallGeo, hallMat);
  placeholderHall.position.set(0, 4, 0);
  placeholderHall.receiveShadow = true;
  scene.add(placeholderHall);
  collidableObjects.push(placeholderHall);

  // Add decorative banners representing UTM colors
  const bannerGeo = new THREE.PlaneGeometry(3, 6);
  const bannerMat = new THREE.MeshStandardMaterial({ color: 0x8A1538, side: THREE.DoubleSide });
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(-11.9, 4, 0);
  banner.rotation.y = Math.PI / 2;
  scene.add(banner);
}

// 4. Bind UI Click handlers
function bindUIEvents() {
  // Click start button on Welcome Screen
  btnStart.addEventListener('click', () => {
    startTour();
  });

  // Click info panel close button
  infoCloseBtn.addEventListener('click', () => {
    infoPanel.classList.add('hidden');
  });
}

function startTour() {
  // Hide overlays, expose tour HUD, and enable walking/mouse movement
  welcomeScreen.classList.add('hidden');
  hudOverlay.classList.remove('hidden');
  controls.setEnabled(true);
}

// 5. Main Animation Loop
function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // Update camera translations and targets (WASD keys movement)
  if (controls) {
    controls.update(deltaTime);
  }

  // Update floating beacons, light updates, and TWEEN animations
  if (interactions) {
    interactions.update(elapsedTime);
  }

  // Render Frame
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// Fire initialization on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  init();
});
