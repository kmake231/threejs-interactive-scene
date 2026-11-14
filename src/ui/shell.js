import { site } from '../content/site.js'

export function createShell(root, { scenes, onScene }) {
  const hud = document.createElement('div')
  hud.className = 'hud'

  const block = document.createElement('header')
  block.className = 'block'

  const title = document.createElement('h1')
  const placeLine = document.createElement('p')
  placeLine.className = 'place'
  const cross = document.createElement('span')
  cross.className = 'cross'
  cross.setAttribute('aria-hidden', 'true')
  const place = document.createElement('span')
  place.setAttribute('aria-live', 'polite')
  placeLine.append(cross, place)

  const hint = document.createElement('p')
  hint.className = 'hint'
  block.append(title, placeLine, hint)

  let select = null
  if (scenes.length > 1) {
    const field = document.createElement('label')
    field.className = 'sheet-field'
    field.append(document.createTextNode('Sheet'))
    select = document.createElement('select')
    for (const scene of scenes) {
      const option = document.createElement('option')
      option.value = scene.id
      option.textContent = scene.name
      select.append(option)
    }
    select.addEventListener('change', () => onScene(select.value))
    field.append(select)
    block.append(field)
  }

  const note = document.createElement('p')
  note.className = 'area-note'
  note.hidden = true
  note.setAttribute('aria-live', 'polite')
  hud.append(block, note)
  root.append(hud)

  const desktopQuery = window.matchMedia('(pointer: fine) and (hover: hover)')
  let activeArea = null

  function applyHint() {
    hint.textContent = desktopQuery.matches ? site.hints.desktop : site.hints.touch
  }
  applyHint()
  desktopQuery.addEventListener('change', applyHint)

  function showArea(area) {
    if (!area) {
      activeArea = null
      note.hidden = true
      note.textContent = ''
      return
    }
    if (activeArea === area.id) return
    activeArea = area.id
    note.textContent = area.body
    note.hidden = false
  }

  return {
    setScene(world) {
      title.textContent = world.name
      document.title = world.name
      if (select) select.value = world.id
      showArea(null)
    },
    setPlace(name) {
      if (place.textContent !== name) place.textContent = name
    },
    setArea(world, feet) {
      let nearest = null
      let nearestDistance = Infinity
      for (const area of world.areas ?? []) {
        const distance = Math.hypot(feet.x - area.x, feet.z - area.z)
        const reach = area.radius + (activeArea === area.id ? 0.35 : 0)
        if (distance <= reach && distance < nearestDistance) {
          nearest = area
          nearestDistance = distance
        }
      }
      showArea(nearest)
    },
  }
}
