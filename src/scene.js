import * as THREE from 'three';
import { defaultSettings } from './locations.js';

/**
 * Creates and initializes the core Three.js scene elements.
 * Sets up rendering context, camera settings, UTM campus daylight lighting, 
 * shadows, and responsive viewport sizing.
 * 
 * @param {HTMLElement} container - The DOM element to attach the WebGL canvas to.
 * @returns {Object} Core scene references (scene, camera, renderer, lighting details)
 */
export function createScene(container) {
  // 1. Scene setup with soft sky-blue fog
  const scene = new THREE.Scene();
  const skyColor = '#9ecbed'; // Soft daylight blue
  scene.background = new THREE.Color(skyColor);
  scene.fog = new THREE.FogExp2(skyColor, 0.012);

  // 2. Camera setup - Positioned slightly back to view the hall from the entrance walk
  const camera = new THREE.PerspectiveCamera(
    60, 
    window.innerWidth / window.innerHeight, 
    0.1, 
    1000
  );
  camera.position.set(
    defaultSettings.startPosition.x, 
    defaultSettings.startPosition.y, 
    defaultSettings.startPosition.z
  );
  camera.lookAt(
    defaultSettings.startLookAt.x,
    defaultSettings.startLookAt.y,
    defaultSettings.startLookAt.z
  );

  // 3. WebGL Renderer Setup (Antialiased, enabling shadow maps and ACES tone mapping)
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: false,
    powerPreference: "high-performance" 
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Beautiful soft shadows
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  
  // Clear any existing canvas and append
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // 4. Lighting Configuration
  // Soft ambient light for fill shadows
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // Main directional light (Sunlight) to cast crisp, soft shadows
  const sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
  sunLight.position.set(25, 45, 20);
  sunLight.castShadow = true;
  
  // Shadow resolution settings
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 150;
  
  // Shadow camera frustum fitting the walkable campus
  const shadowFrustumSize = 35;
  sunLight.shadow.camera.left = -shadowFrustumSize;
  sunLight.shadow.camera.right = shadowFrustumSize;
  sunLight.shadow.camera.top = shadowFrustumSize;
  sunLight.shadow.camera.bottom = -shadowFrustumSize;
  sunLight.shadow.bias = -0.0005; // Fix shadow acne
  scene.add(sunLight);

  // Hemisphere Light for sky/ground color reflection
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x445533, 0.4);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  // 5. Environmental Ground Plane (Grassy UTM courtyard)
  const groundSize = 120;
  const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
  const groundMat = new THREE.MeshStandardMaterial({ 
    color: 0x2d4232, // Soft forest green
    roughness: 0.9, 
    metalness: 0.05 
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Concrete pathway leading to the sports hall
  const pathGeo = new THREE.PlaneGeometry(12, 40);
  const pathMat = new THREE.MeshStandardMaterial({
    color: 0x5a5d61, // Dark asphalt/concrete
    roughness: 0.8,
    metalness: 0.1
  });
  const path = new THREE.Mesh(pathGeo, pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, 10); // Placed slightly above ground to prevent z-fighting
  path.receiveShadow = true;
  scene.add(path);

  // Grid Helper aligned with UTM campus coordinate system
  const gridHelper = new THREE.GridHelper(groundSize, 60, 0x8A1538, 0x3d3d3d);
  gridHelper.position.y = 0.02;
  scene.add(gridHelper);

  // 6. Responsive Resize Handling
  window.addEventListener('resize', onWindowResize);

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  // Clean-up handler (essential for hot-reloads and preventing memory leaks)
  function destroy() {
    window.removeEventListener('resize', onWindowResize);
    renderer.dispose();
  }

  return { 
    scene, 
    camera, 
    renderer, 
    ambientLight, 
    sunLight, 
    hemiLight, 
    ground, 
    destroy 
  };
}
