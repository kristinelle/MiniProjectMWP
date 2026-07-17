/**
 * locations.js
 * 
 * Central data registry for interactive locations, hotspots, and elements in the UTM Sports Hall 2.
 * You can edit the text titles, descriptions, and coordinates directly in this file
 * to customize the tour points or match specific mesh coordinates of your GLB model.
 */

export const hotspots = [
  {
    id: "entrance",
    name: "Main Entrance (Lobby)",
    description: "Welcome to UTM Sports Hall 2 (Dewan Sukan 2). This lobby serves as the main registration point for sports tournaments, state examinations (e.g. SPM/STPM), and academic events. Built to support the active campus life of Universiti Teknologi Malaysia.",
    position: { x: 0, y: 1.5, z: 8 },
    cameraLook: { x: 0, y: 1.2, z: 0 }
  },
  {
    id: "court",
    name: "Indoor Multisport Court",
    description: "The main hall features high-grade flooring marked for multiple indoor games including Badminton, Basketball, Volleyball, and Futsal. It is equipped with spectator seating and host ventilation systems to maintain a cool environment during intense matches.",
    position: { x: -3, y: 1.5, z: -2 },
    cameraLook: { x: 0, y: 1.0, z: -10 }
  },
  {
    id: "deck",
    name: "Technical Control & Scoring Deck",
    description: "Positioned at the side of the court, the Technical Control Deck houses the digital scoreboard controls, public address (PA) sound systems, and referee seats. It ensures smooth coordination during UTM inter-college sports competitions (Sukan Antara Kolej - SAK).",
    position: { x: -8, y: 1.5, z: 4 },
    cameraLook: { x: -8, y: 1.5, z: -5 }
  },
  {
    id: "light_switch",
    name: "Eco-Campus Light Controller",
    description: "UTM is committed to a green, sustainable campus. This interactive controller toggles the main arena floodlights. Toggle it off when leaving the hall to support the university's energy conservation campaign.",
    position: { x: 6, y: 1.5, z: 6 },
    cameraLook: { x: 6, y: 1.5, z: 10 }
  }
];

export const collisionBounds = {
  minX: -45,
  maxX: 45,
  minZ: -45,
  maxZ: 45,
  minY: 0,
  maxY: 20
};

export const defaultSettings = {
  movementSpeed: 10.0, // Walking speed
  turnSpeed: 0.002,
  playerHeight: 2.2, // Stable height level during WASD walk
  startPosition: { x: 0, y: 3.0, z: 32.0 }, // Positioned in front of the hall
  startLookAt: { x: 0, y: 1.5, z: 0 }, // Look towards the building center
  lightColorOn: 0xffffff,
  lightColorOff: 0x222233
};
