import * as THREE from 'three'
import { site } from '../content/site.js'
import { moduleById } from '../scenes/registry.js'
import { createWalker } from './walk.js'
import { createShell } from '../ui/shell.js'

export function start(root) {
  const canvas = document.createElement('canvas')
  canvas.tabIndex = -1
  canvas.setAttribute(
    'aria-label',
    'Walkable model. Drag to look. Tap or click the ground to walk.',
  )
  root.append(canvas)

  const listed = site.scenes
    .map((id) => {
      const sceneModule = moduleById(id)
      if (!sceneModule) {
        console.warn(`Scene "${id}" is listed in src/content/site.js but is not registered.`)
      }
      return sceneModule
    })
    .filter(Boolean)

  if (listed.length === 0) {
    throw new Error('No scenes are registered. Add one in src/content/site.js and src/scenes/registry.js.')
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(62, 1, 0.08, 220)
  const desktopQuery = window.matchMedia('(pointer: fine) and (hover: hover)')

  let world = null
  let activeId = null

  const shell = createShell(root, {
    scenes: listed.map((sceneModule) => ({
      id: sceneModule.id,
      name: sceneModule.name,
    })),
    onScene: mount,
  })

  const walker = createWalker({
    camera,
    canvas,
    getWorld: () => world,
    isDesktop: () => desktopQuery.matches,
  })
  scene.add(walker.marker)

  function mount(id) {
    const sceneModule = moduleById(id)
    if (!sceneModule || activeId === id) return
    if (world) {
      scene.remove(world.object)
      world.dispose()
    }
    world = sceneModule.create()
    scene.add(world.object)
    scene.background = world.background
    scene.fog = world.fog
    const theme = document.querySelector('meta[name="theme-color"]')
    if (theme) theme.setAttribute('content', `#${world.background.getHexString()}`)
    walker.spawn(world)
    shell.setScene(world)
    shell.setPlace(world.zoneAt(world.spawn.x, world.spawn.z))
    activeId = id
  }

  function resize() {
    const width = root.clientWidth
    const height = Math.max(root.clientHeight, 1)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  window.addEventListener('resize', resize)
  resize()
  mount(listed[0].id)

  let last = performance.now()
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    walker.update(dt)
    world?.update(dt)
    if (world) {
      const feet = walker.feetPosition()
      shell.setPlace(world.zoneAt(feet.x, feet.z))
      shell.setArea(world, feet)
    }
    renderer.render(scene, camera)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
