/**
 * House on the island — edit this file to change the sheet.
 *
 * Positions are meters. The house sits at the origin. +Z is south, toward
 * the beach where you start. Keep the house at least 8 meters wide so the
 * door and windows still fit.
 *
 * To add a different sheet, copy src/scenes/empty-stage, register it in
 * src/scenes/registry.js, and list its id in src/content/site.js.
 *
 * `areas` are notes. Walk within `radius` meters of `position` and the
 * text appears at the bottom. Nothing is labeled in the world.
 */
export const content = {
  id: 'island-house',
  name: 'House on the island',

  spawn: { x: 0, z: 17.6, yaw: 0, pitch: -0.06, floorY: 0 },
  player: { eyeHeight: 1.6, radius: 0.28, walkSpeed: 3.5 },

  sky: '#d7e6e2',

  places: {
    beach: 'Beach',
    path: 'Path',
    lawn: 'Lawn',
    porch: 'Porch',
    living: 'Living room',
    study: 'Study',
  },

  island: {
    sandRadius: 22,
    grassRadius: 12,
  },

  house: {
    width: 10,
    depth: 8,
    wall: 0.16,
    wallHeight: 2.85,
    floor: 0.2,
    splitX: 1.5,
    doorWidth: 1.4,
    doorHeight: 2.15,
    innerDoorWidth: 1.2,
    innerDoorZ: -0.4,
  },

  porch: { width: 7.2, depth: 3.4, step: 0.7 },
  path: { halfWidth: 1.15, endZ: 16.4 },

  palette: {
    water: '#2f6f76',
    waterDeep: '#173f46',
    sand: '#e6d3a6',
    sandDark: '#c9b07a',
    grass: '#74864a',
    grassDark: '#5d6c3b',
    plaster: '#efe6d6',
    plasterDeep: '#ddd2bc',
    roof: '#3c433e',
    wood: '#a0663c',
    woodDark: '#6e4328',
    studyFloor: '#8d5a38',
    leaf: '#3f6844',
    leafDark: '#2c4a32',
    trunk: '#6b4a30',
    rock: '#8a8478',
    glass: '#b7d0cc',
    frame: '#2a302c',
  },

  props: [
    { kind: 'tree', x: -8.2, z: -4.6, scale: 1.15 },
    { kind: 'tree', x: -10.4, z: 6.2, scale: 0.9 },
    { kind: 'tree', x: 8.6, z: -5.2, scale: 1.05 },
    { kind: 'tree', x: 11.2, z: 4.4, scale: 0.8 },
    { kind: 'rock', x: 15.2, z: 10.4, scale: 1.2 },
    { kind: 'rock', x: -14.4, z: 9.2, scale: 1 },
    { kind: 'rock', x: 7.4, z: 15.2, scale: 0.85 },
    { kind: 'table', x: -2.15, z: -0.35 },
    { kind: 'stool', x: -2.15, z: 0.7 },
    { kind: 'bench', x: -2.15, z: 6.15 },
    { kind: 'shelf', x: 3.45, z: -3.35 },
  ],

  areas: [
    {
      id: 'shore',
      body: 'Example. A marker on the beach. Change this text in src/scenes/island-house/content.js.',
      position: [15.2, 0, 10.4],
      radius: 2.6,
    },
    {
      id: 'porch',
      body: 'Example. The porch faces the water. Swap this note for your own.',
      position: [0, 0, 5.8],
      radius: 2.6,
    },
    {
      id: 'table',
      body: 'Example. A table in the living room. The words are sample copy.',
      position: [-2.15, 0, -0.35],
      radius: 1.8,
    },
    {
      id: 'shelf',
      body: 'Example. The study shelf. Replace this when you add your own notes.',
      position: [3.45, 0, -2.4],
      radius: 1.8,
    },
  ],

  debug: { colliders: false },
}
