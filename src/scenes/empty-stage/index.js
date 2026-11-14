import { content } from './content.js'
import { createEmptyStage } from './create.js'

export const emptyStage = {
  id: content.id,
  name: content.name,
  create() {
    return createEmptyStage(content)
  },
}
