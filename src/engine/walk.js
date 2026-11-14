import * as THREE from 'three'

const MOVE_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function shortest(from, to) {
  let delta = to - from
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  return delta
}

function blocked(x, z, boxes, radius) {
  for (const box of boxes) {
    if (
      x > box.minX - radius &&
      x < box.maxX + radius &&
      z > box.minZ - radius &&
      z < box.maxZ + radius
    ) {
      return true
    }
  }
  return false
}

function accentColor() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
  return value || '#9d3419'
}

export function createWalker({ camera, canvas, getWorld, isDesktop }) {
  const keys = new Set()
  const feet = new THREE.Vector3()
  const raycaster = new THREE.Raycaster()
  const pointerNdc = new THREE.Vector2()
  const down = new THREE.Vector3(0, -1, 0)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let yaw = 0
  let pitch = -0.16
  let floorY = 0
  let destination = null
  let pointer = null
  let stuck = 0
  let clock = 0

  const marker = new THREE.Group()
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.46, 40),
    new THREE.MeshBasicMaterial({
      color: accentColor(),
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  const armX = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.02, 0.045), ring.material)
  const armZ = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.02, 0.72), ring.material)
  marker.add(ring, armX, armZ)
  marker.visible = false

  function sampleFloor(world, x, z, feetY) {
    raycaster.set(new THREE.Vector3(x, 40, z), down)
    const hits = raycaster.intersectObjects(world.walkables, false)
    let best = null
    for (const hit of hits) {
      const y = hit.point.y
      if (y <= feetY + 0.42 && y >= feetY - 0.85) {
        if (best === null || y > best) best = y
      }
    }
    return best
  }

  function clearDestination() {
    destination = null
    marker.visible = false
    stuck = 0
  }

  function spawn(world) {
    feet.set(world.spawn.x, 0, world.spawn.z)
    yaw = world.spawn.yaw
    pitch = world.spawn.pitch
    const y = sampleFloor(world, feet.x, feet.z, world.spawn.floorY ?? 0)
    floorY = y ?? 0
    clearDestination()
    keys.clear()
  }

  function ndcFromEvent(event) {
    const rect = canvas.getBoundingClientRect()
    pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  function pick(event) {
    const world = getWorld()
    if (!world) return
    ndcFromEvent(event)
    raycaster.setFromCamera(pointerNdc, camera)

    const blockDistance = raycaster.intersectObjects(world.occluders, false)[0]?.distance ?? Infinity
    const groundHit = raycaster.intersectObjects(world.walkables, false)[0]
    if (!groundHit || groundHit.distance >= blockDistance) return
    destination = groundHit.point.clone()
    marker.position.set(destination.x, groundHit.point.y + 0.04, destination.z)
    marker.visible = true
    stuck = 0
  }

  function onKeyDown(event) {
    if (!isDesktop() || !MOVE_KEYS.has(event.code)) return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    keys.add(event.code)
    event.preventDefault()
  }

  function onKeyUp(event) {
    keys.delete(event.code)
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', () => keys.clear())

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    try {
      canvas.setPointerCapture(event.pointerId)
    } catch {
      /* The pointer can already be captured. Looking still tracks the id. */
    }
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false }
  })

  canvas.addEventListener('pointermove', (event) => {
    if (!pointer || event.pointerId !== pointer.id) return
    const dx = event.clientX - pointer.x
    const dy = event.clientY - pointer.y
    if (!pointer.dragging && dx * dx + dy * dy < 36) return
    pointer.dragging = true
    yaw -= dx * 0.0042
    pitch = clamp(pitch - dy * 0.0038, -1.05, 1.05)
    pointer.x = event.clientX
    pointer.y = event.clientY
  })

  function endPointer(event) {
    if (!pointer || event.pointerId !== pointer.id) return
    const dragged = pointer.dragging
    pointer = null
    if (!dragged) pick(event)
  }

  canvas.addEventListener('pointerup', endPointer)
  canvas.addEventListener('pointercancel', () => {
    pointer = null
  })
  canvas.addEventListener('contextmenu', (event) => event.preventDefault())

  function tryStep(world, dx, dz) {
    const radius = world.radius
    const previousX = feet.x
    const previousZ = feet.z
    if (!blocked(feet.x + dx, feet.z, world.colliders, radius)) feet.x += dx
    if (!blocked(feet.x, feet.z + dz, world.colliders, radius)) feet.z += dz
    const nextFloor = sampleFloor(world, feet.x, feet.z, floorY)
    if (nextFloor === null) {
      feet.x = previousX
      feet.z = previousZ
      return false
    }
    floorY = nextFloor
    return feet.x !== previousX || feet.z !== previousZ
  }

  function keyboardWish() {
    if (!isDesktop()) return null
    let forward = 0
    let strafe = 0
    if (keys.has('KeyW') || keys.has('ArrowUp')) forward += 1
    if (keys.has('KeyS') || keys.has('ArrowDown')) forward -= 1
    if (keys.has('KeyD') || keys.has('ArrowRight')) strafe += 1
    if (keys.has('KeyA') || keys.has('ArrowLeft')) strafe -= 1
    if (forward === 0 && strafe === 0) return null
    const length = Math.hypot(forward, strafe)
    const fx = -Math.sin(yaw)
    const fz = -Math.cos(yaw)
    const rx = Math.cos(yaw)
    const rz = -Math.sin(yaw)
    return {
      x: (fx * forward + rx * strafe) / length,
      z: (fz * forward + rz * strafe) / length,
    }
  }

  function update(dt) {
    const world = getWorld()
    if (!world) return
    clock += dt
    const speed = world.walkSpeed
    const wish = keyboardWish()

    if (wish) {
      clearDestination()
      tryStep(world, wish.x * speed * dt, wish.z * speed * dt)
    } else if (destination) {
      const dx = destination.x - feet.x
      const dz = destination.z - feet.z
      const distance = Math.hypot(dx, dz)
      if (distance < 0.12) {
        clearDestination()
      } else {
        const step = Math.min(speed * dt, distance)
        const moved = tryStep(world, (dx / distance) * step, (dz / distance) * step)
        const remaining = Math.hypot(destination.x - feet.x, destination.z - feet.z)
        if (!moved || remaining > distance - 0.01) stuck += dt
        else stuck = 0
        if (stuck > 0.55) clearDestination()
        else if (!pointer?.dragging) {
          const targetYaw = Math.atan2(-(dx / distance), -(dz / distance))
          const delta = shortest(yaw, targetYaw)
          const turn = reduced ? delta : clamp(delta, -2.4 * dt, 2.4 * dt)
          yaw += turn
        }
      }
    }

    const pulse = reduced ? 1 : 1 + Math.sin(clock * 3) * 0.05
    marker.scale.setScalar(pulse)
    camera.position.set(feet.x, floorY + world.eyeHeight, feet.z)
    camera.rotation.order = 'YXZ'
    camera.rotation.y = yaw
    camera.rotation.x = pitch
  }

  function feetPosition() {
    return { x: feet.x, z: feet.z, floorY }
  }

  function dispose() {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    ring.geometry.dispose()
    armX.geometry.dispose()
    armZ.geometry.dispose()
    ring.material.dispose()
  }

  return { marker, spawn, update, feetPosition, dispose }
}
