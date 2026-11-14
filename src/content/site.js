/**
 * Site-wide edits.
 * `scenes` is the list of sheets, in order. Each id must be registered
 * in src/scenes/registry.js. With one id, the sheet menu stays hidden.
 */
export const site = {
  title: 'House on the island',
  scenes: ['island-house'],
  hints: {
    desktop: 'Drag to look. Click the ground to walk. WASD moves.',
    touch: 'Drag to look. Tap the ground to walk.',
  },
}
