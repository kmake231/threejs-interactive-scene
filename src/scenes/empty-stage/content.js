/**
 * A blank sheet. Copy this folder, change `id`, and register it:
 *   1. src/scenes/registry.js  — import the module and add it to sceneModules
 *   2. src/content/site.js     — add the id to `scenes`
 * Walkable floors are flat meshes. Anything in `colliders` blocks walking.
 * +Z is south. The player starts at `spawn`.
 */
export const content = {
  id: 'empty-stage',
  name: 'Empty stage',
  spawn: { x: 0, z: 4.5, yaw: 0, pitch: -0.12, floorY: 0 },
  player: { eyeHeight: 1.6, radius: 0.28, walkSpeed: 3.5 },
  sky: '#d5ddd8',
  floor: { width: 14, depth: 14 },
  places: { stage: 'Stage' },
  palette: {
    floor: '#d9d3c6',
    wall: '#efe8dc',
  },
  areas: [
    {
      id: 'note',
      body: 'Example. This sheet is a starting point. Replace it from src/scenes/empty-stage/content.js.',
      position: [0, 0, -1],
      radius: 2,
    },
  ],
  debug: { colliders: false },
}
