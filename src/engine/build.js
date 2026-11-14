import * as THREE from 'three'

export function createBucket() {
  const disposables = []
  const track = (resource) => {
    disposables.push(resource)
    return resource
  }

  function box(group, { w, h, d, x, y, z, material, rotY = 0 }) {
    const geometry = track(new THREE.BoxGeometry(w, h, d))
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    mesh.rotation.y = rotY
    group.add(mesh)
    return mesh
  }

  return {
    track,
    material(params) {
      return track(new THREE.MeshStandardMaterial(params))
    },
    basic(params) {
      return track(new THREE.MeshBasicMaterial(params))
    },
    box,
    dispose() {
      for (const resource of disposables) resource.dispose?.()
    },
  }
}

function subtractGaps(min, max, gaps) {
  const sorted = gaps
    .map((gap) => ({
      min: Math.max(min, gap.min),
      max: Math.min(max, gap.max),
    }))
    .filter((gap) => gap.max - gap.min > 0.02)
    .sort((a, b) => a.min - b.min)

  const parts = []
  let cursor = min
  for (const gap of sorted) {
    if (gap.min > cursor + 0.02) parts.push({ min: cursor, max: gap.min })
    cursor = Math.max(cursor, gap.max)
  }
  if (cursor < max - 0.02) parts.push({ min: cursor, max })
  return parts
}

/**
 * A straight wall. `axis: 'x'` runs along X; `axis: 'z'` runs along Z.
 * An opening with `door: true` is left out of the collider.
 * Pass `walkables` so a raised door sill can be walked on.
 */
export function addWall(group, bucket, spec) {
  const {
    axis,
    x,
    z,
    length,
    thickness,
    baseY,
    height,
    material,
    openings = [],
    colliders,
    occluders,
    walkables,
  } = spec

  const along = (offset, span, y, h, extra = {}) => {
    const center = offset + span / 2
    const mesh = bucket.box(group, {
      w: axis === 'x' ? span : thickness,
      h,
      d: axis === 'x' ? thickness : span,
      x: axis === 'x' ? x + center : x,
      y,
      z: axis === 'z' ? z + center : z,
      material: extra.material ?? material,
    })
    if (extra.walkable && walkables) walkables.push(mesh)
    if (extra.occlude !== false && occluders) occluders.push(mesh)
    return mesh
  }

  const cuts = openings
    .map((opening) => ({
      ...opening,
      from: opening.offset - opening.width / 2,
      to: opening.offset + opening.width / 2,
    }))
    .sort((a, b) => a.from - b.from)

  let cursor = -length / 2
  for (const cut of cuts) {
    if (cut.from > cursor + 0.02) {
      const span = cut.from - cursor
      along(cursor, span, baseY + height / 2, height)
    }
    cursor = Math.max(cursor, cut.to)
  }
  if (cursor < length / 2 - 0.02) {
    const span = length / 2 - cursor
    along(cursor, span, baseY + height / 2, height)
  }

  for (const cut of cuts) {
    const span = cut.to - cut.from
    if (cut.sill > 0.02) {
      along(cut.from, span, baseY + cut.sill / 2, cut.sill, {
        walkable: Boolean(cut.door),
        occlude: !cut.door,
      })
    }
    const openingTop = cut.sill + cut.height
    const lintel = height - openingTop
    if (lintel > 0.02) {
      along(cut.from, span, baseY + openingTop + lintel / 2, lintel, {
        occlude: !cut.door,
      })
    }
    if (cut.glass && spec.glass) {
      const pane = along(
        cut.from,
        Math.max(0.04, span - 0.04),
        baseY + cut.sill + cut.height / 2,
        Math.max(0.04, cut.height - 0.04),
        { material: spec.glass, occlude: true },
      )
      pane.position[axis === 'x' ? 'z' : 'x'] += 0
      pane.scale[axis === 'x' ? 'z' : 'x'] = 0.2
    }
  }

  if (!colliders) return

  const doors = cuts
    .filter((cut) => cut.door)
    .map((cut) => ({
      min: (axis === 'x' ? x : z) + cut.from - 0.04,
      max: (axis === 'x' ? x : z) + cut.to + 0.04,
    }))

  const minAlong = (axis === 'x' ? x : z) - length / 2
  const maxAlong = (axis === 'x' ? x : z) + length / 2
  const crossMin = (axis === 'x' ? z : x) - thickness / 2
  const crossMax = (axis === 'x' ? z : x) + thickness / 2

  for (const part of subtractGaps(minAlong, maxAlong, doors)) {
    colliders.push(
      axis === 'x'
        ? { minX: part.min, maxX: part.max, minZ: crossMin, maxZ: crossMax }
        : { minX: crossMin, maxX: crossMax, minZ: part.min, maxZ: part.max },
    )
  }
}

export function addColliderBox(group, bucket, lists, spec) {
  const mesh = bucket.box(group, spec)
  const { x, y, z, w, h, d } = spec
  if (lists.colliders) {
    lists.colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
    })
  }
  if (lists.occluders) lists.occluders.push(mesh)
  if (spec.walkable && lists.walkables) lists.walkables.push(mesh)
  return mesh
}

export function showColliders(group, bucket, colliders) {
  const material = bucket.basic({
    color: '#9d3419',
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  })
  for (const box of colliders) {
    const w = box.maxX - box.minX
    const d = box.maxZ - box.minZ
    const mesh = bucket.box(group, {
      w,
      h: 1.2,
      d,
      x: (box.minX + box.maxX) / 2,
      y: 0.6,
      z: (box.minZ + box.maxZ) / 2,
      material,
    })
    mesh.raycast = () => {}
  }
}
