import { islandHouse } from './island-house/index.js'
// To add a sheet: copy src/scenes/empty-stage, import it here, and add its id
// to the `scenes` list in src/content/site.js.
// import { emptyStage } from './empty-stage/index.js'

/** Every scene the app is allowed to build. */
export const sceneModules = [
  islandHouse,
  // emptyStage,
]

export function moduleById(id) {
  return sceneModules.find((scene) => scene.id === id) ?? null
}
