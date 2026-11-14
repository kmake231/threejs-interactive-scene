import { content } from './content.js'
import { createIslandHouse } from './create.js'

export const islandHouse = {
  id: content.id,
  name: content.name,
  create() {
    return createIslandHouse(content)
  },
}
