import * as THREE from 'three'
import { addColliderBox, addWall, createBucket, showColliders } from '../../engine/build.js'

function speckle(bucket, base, spot, count) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  context.fillStyle = base
  context.fillRect(0, 0, 128, 128)
  context.fillStyle = spot
  for (let i = 0; i < count; i += 1) {
    context.globalAlpha = 0.16
    context.beginPath()
    context.arc((i * 47) % 128, (i * 29) % 128, 0.6, 0, Math.PI * 2)
    context.fill()
  }
  context.globalAlpha = 1
  const texture = bucket.track(new THREE.CanvasTexture(canvas))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

function disc(bucket, group, { radius, y, material, walkables }) {
  const geometry = bucket.track(new THREE.CircleGeometry(radius, 72))
  geometry.rotateX(-Math.PI / 2)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.y = y
  group.add(mesh)
  walkables.push(mesh)
  return mesh
}

function measure(content) {
  const house = content.house
  const southCenter = house.depth / 2
  const southFace = southCenter + house.wall / 2
  const porchEnd = southFace + content.porch.depth
  const stepEnd = porchEnd + content.porch.step
  return {
    southCenter,
    northCenter: -southCenter,
    westCenter: -house.width / 2,
    eastCenter: house.width / 2,
    southFace,
    porchEnd,
    stepEnd,
    top: house.floor + house.wallHeight,
    innerWest: -house.width / 2 + house.wall / 2,
    innerEast: house.width / 2 - house.wall / 2,
    innerNorth: -house.depth / 2 + house.wall / 2,
    innerSouth: house.depth / 2 - house.wall / 2,
  }
}

function addTree(group, bucket, lists, materials, prop) {
  const scale = prop.scale ?? 1
  const trunkHeight = 1.15 * scale
  const trunk = bucket.box(group, {
    w: 0.28 * scale,
    h: trunkHeight,
    d: 0.28 * scale,
    x: prop.x,
    y: trunkHeight / 2,
    z: prop.z,
    material: materials.trunk,
  })
  lists.occluders.push(trunk)
  lists.colliders.push({
    minX: prop.x - 0.18 * scale,
    maxX: prop.x + 0.18 * scale,
    minZ: prop.z - 0.18 * scale,
    maxZ: prop.z + 0.18 * scale,
  })
  const cone = bucket.track(new THREE.ConeGeometry(0.9 * scale, 1.55 * scale, 7))
  const lower = new THREE.Mesh(cone, materials.leaf)
  lower.position.set(prop.x, trunkHeight + 0.5 * scale, prop.z)
  const upper = new THREE.Mesh(cone, materials.leafDark)
  upper.position.set(prop.x, trunkHeight + 1.2 * scale, prop.z)
  upper.scale.setScalar(0.72)
  group.add(lower, upper)
}

function addRock(group, bucket, lists, material, prop) {
  const scale = prop.scale ?? 1
  const geometry = bucket.track(new THREE.IcosahedronGeometry(0.38 * scale, 0))
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(prop.x, 0.2 * scale, prop.z)
  mesh.scale.set(1.2, 0.72, 1.05)
  group.add(mesh)
  lists.occluders.push(mesh)
  lists.colliders.push({
    minX: prop.x - 0.36 * scale,
    maxX: prop.x + 0.36 * scale,
    minZ: prop.z - 0.32 * scale,
    maxZ: prop.z + 0.32 * scale,
  })
}

export function createIslandHouse(content) {
  const group = new THREE.Group()
  const bucket = createBucket()
  const walkables = []
  const colliders = []
  const occluders = []
  const lists = { walkables, colliders, occluders }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const layout = measure(content)
  const house = content.house
  const palette = content.palette

  const sandMap = speckle(bucket, palette.sand, palette.sandDark, 50)
  sandMap.repeat.set(6, 6)
  const grassMap = speckle(bucket, palette.grass, palette.grassDark, 40)
  grassMap.repeat.set(4, 4)

  const materials = {
    sand: bucket.material({ map: sandMap, roughness: 1 }),
    grass: bucket.material({ map: grassMap, roughness: 1 }),
    plaster: bucket.material({ color: palette.plaster, roughness: 0.92 }),
    plasterDeep: bucket.material({ color: palette.plasterDeep, roughness: 0.9 }),
    roof: bucket.material({ color: palette.roof, roughness: 0.82 }),
    wood: bucket.material({ color: palette.wood, roughness: 0.72 }),
    woodDark: bucket.material({ color: palette.woodDark, roughness: 0.74 }),
    studyFloor: bucket.material({ color: palette.studyFloor, roughness: 0.7 }),
    trunk: bucket.material({ color: palette.trunk, roughness: 0.9 }),
    leaf: bucket.material({ color: palette.leaf, roughness: 0.85, flatShading: true }),
    leafDark: bucket.material({ color: palette.leafDark, roughness: 0.85, flatShading: true }),
    rock: bucket.material({ color: palette.rock, roughness: 0.95, flatShading: true }),
    path: bucket.material({ color: palette.sandDark, roughness: 1 }),
    glass: bucket.material({
      color: palette.glass,
      transparent: true,
      opacity: 0.28,
      roughness: 0.08,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  }

  const waterUniforms = {
    uTime: { value: 0 },
    uStill: { value: reduced ? 1 : 0 },
    uColor: { value: new THREE.Color(palette.water) },
    uDeep: { value: new THREE.Color(palette.waterDeep) },
  }
  const water = new THREE.Mesh(
    bucket.track(new THREE.PlaneGeometry(180, 180, 28, 28)),
    bucket.track(new THREE.ShaderMaterial({
      transparent: true,
      uniforms: waterUniforms,
      vertexShader: `
        uniform float uTime;
        uniform float uStill;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 displaced = position;
          if (uStill < 0.5) {
            displaced.z += sin(position.x * 0.35 + uTime) * 0.045;
            displaced.z += cos(position.y * 0.28 + uTime * 0.8) * 0.03;
          }
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uDeep;
        varying vec2 vUv;
        void main() {
          float falloff = smoothstep(0.15, 1.0, length(vUv - 0.5) * 1.7);
          gl_FragColor = vec4(mix(uColor, uDeep, falloff), 0.94);
        }
      `,
    })),
  )
  water.rotation.x = -Math.PI / 2
  water.position.y = -0.55
  group.add(water)

  const skirt = new THREE.Mesh(
    bucket.track(new THREE.CylinderGeometry(content.island.sandRadius * 0.98, content.island.sandRadius * 1.22, 1.5, 64, 1, true)),
    materials.sand,
  )
  skirt.position.y = -0.78
  group.add(skirt)

  disc(bucket, group, {
    radius: content.island.sandRadius,
    y: 0,
    material: materials.sand,
    walkables,
  })
  disc(bucket, group, {
    radius: content.island.grassRadius,
    y: 0.03,
    material: materials.grass,
    walkables,
  })

  const wallHeight = layout.top
  const wallSpec = {
    thickness: house.wall,
    baseY: 0,
    height: wallHeight,
    material: materials.plaster,
    glass: materials.glass,
    colliders,
    occluders,
    walkables,
  }
  const windowOn = (offset) => ({
    offset,
    width: 1.15,
    height: 1.05,
    sill: 1.2,
    glass: true,
  })

  addWall(group, bucket, {
    ...wallSpec,
    axis: 'x',
    x: 0,
    z: layout.southCenter,
    length: house.width,
    openings: [
      { offset: 0, width: house.doorWidth, height: house.doorHeight, sill: house.floor, door: true },
      windowOn(-house.width * 0.3),
      windowOn(house.width * 0.3),
    ],
  })
  addWall(group, bucket, {
    ...wallSpec,
    axis: 'x',
    x: 0,
    z: layout.northCenter,
    length: house.width,
    openings: [windowOn(-house.width * 0.24), windowOn(house.width * 0.32)],
  })
  addWall(group, bucket, {
    ...wallSpec,
    axis: 'z',
    x: layout.westCenter,
    z: 0,
    length: house.depth,
    openings: [windowOn(0.2)],
  })
  addWall(group, bucket, {
    ...wallSpec,
    axis: 'z',
    x: layout.eastCenter,
    z: 0,
    length: house.depth,
    openings: [windowOn(-0.3)],
  })
  addWall(group, bucket, {
    ...wallSpec,
    axis: 'z',
    x: house.splitX,
    z: 0,
    length: house.depth - house.wall,
    openings: [{
      offset: house.innerDoorZ,
      width: house.innerDoorWidth,
      height: house.doorHeight,
      sill: house.floor,
      door: true,
    }],
  })

  const floorLists = { walkables, colliders: null, occluders: null }
  addColliderBox(group, bucket, floorLists, {
    w: house.splitX - house.wall / 2 - layout.innerWest,
    h: house.floor,
    d: layout.innerSouth - layout.innerNorth,
    x: (layout.innerWest + house.splitX - house.wall / 2) / 2,
    y: house.floor / 2,
    z: 0,
    material: materials.wood,
    walkable: true,
  })
  addColliderBox(group, bucket, floorLists, {
    w: layout.innerEast - (house.splitX + house.wall / 2),
    h: house.floor,
    d: layout.innerSouth - layout.innerNorth,
    x: (house.splitX + house.wall / 2 + layout.innerEast) / 2,
    y: house.floor / 2,
    z: 0,
    material: materials.studyFloor,
    walkable: true,
  })
  addColliderBox(group, bucket, floorLists, {
    w: house.wall + 0.02,
    h: house.floor,
    d: house.innerDoorWidth - 0.08,
    x: house.splitX,
    y: house.floor / 2,
    z: house.innerDoorZ,
    material: materials.wood,
    walkable: true,
  })

  addColliderBox(group, bucket, floorLists, {
    w: content.porch.width,
    h: house.floor,
    d: content.porch.depth,
    x: 0,
    y: house.floor / 2,
    z: layout.southFace + content.porch.depth / 2,
    material: materials.wood,
    walkable: true,
  })
  addColliderBox(group, bucket, floorLists, {
    w: 2.4,
    h: house.floor / 2,
    d: content.porch.step,
    x: 0,
    y: house.floor / 4,
    z: layout.porchEnd + content.porch.step / 2,
    material: materials.plasterDeep,
    walkable: true,
  })
  addColliderBox(group, bucket, floorLists, {
    w: content.path.halfWidth * 2,
    h: 0.05,
    d: content.path.endZ - layout.stepEnd,
    x: 0,
    y: 0.025,
    z: (layout.stepEnd + content.path.endZ) / 2,
    material: materials.path,
    walkable: true,
  })

  const ceiling = bucket.box(group, {
    w: house.width - house.wall * 2,
    h: 0.08,
    d: house.depth - house.wall * 2,
    x: 0,
    y: layout.top - 0.04,
    z: 0,
    material: materials.plaster,
  })
  occluders.push(ceiling)

  const roof = bucket.box(group, {
    w: house.width + 1.1,
    h: 0.14,
    d: house.depth + 1.1,
    x: 0,
    y: layout.top + 0.07,
    z: 0,
    material: materials.roof,
  })
  occluders.push(roof)
  const porchRoof = bucket.box(group, {
    w: content.porch.width + 0.4,
    h: 0.1,
    d: content.porch.depth + 0.3,
    x: 0,
    y: 2.62,
    z: layout.southFace + content.porch.depth / 2,
    material: materials.roof,
  })
  occluders.push(porchRoof)

  for (const side of [-1, 1]) {
    addColliderBox(group, bucket, lists, {
      w: 0.12,
      h: 2.55,
      d: 0.12,
      x: side * (content.porch.width / 2 - 0.08),
      y: 1.275,
      z: layout.porchEnd - 0.1,
      material: materials.woodDark,
    })
  }

  const doorThickness = 0.045
  const swingDoor = ({ hingeX, hingeZ, leafWidth, swing }) => {
    const height = house.doorHeight - 0.08
    const geometry = bucket.track(new THREE.BoxGeometry(leafWidth, height, doorThickness))
    geometry.translate(leafWidth / 2, 0, 0)
    const mesh = new THREE.Mesh(geometry, materials.woodDark)
    mesh.position.set(hingeX, house.floor + 0.02 + height / 2, hingeZ)
    mesh.rotation.y = swing
    group.add(mesh)
  }
  const doorGap = 0.02
  swingDoor({
    hingeX: -house.doorWidth / 2,
    hingeZ: layout.southFace + doorThickness / 2 + doorGap,
    leafWidth: house.doorWidth - 0.08,
    swing: Math.PI,
  })
  swingDoor({
    hingeX: house.splitX - house.wall / 2 - doorThickness / 2 - doorGap,
    hingeZ: house.innerDoorZ + house.innerDoorWidth / 2,
    leafWidth: house.innerDoorWidth - 0.08,
    swing: -Math.PI / 2,
  })

  for (const prop of content.props) {
    if (prop.kind === 'tree') addTree(group, bucket, lists, materials, prop)
    else if (prop.kind === 'rock') addRock(group, bucket, lists, materials.rock, prop)
    else if (prop.kind === 'table') {
      addColliderBox(group, bucket, lists, {
        w: 1.15, h: 0.08, d: 0.72, x: prop.x, y: 0.72, z: prop.z, material: materials.wood,
      })
      addColliderBox(group, bucket, lists, {
        w: 0.12, h: 0.52, d: 0.12, x: prop.x, y: house.floor + 0.26, z: prop.z, material: materials.woodDark,
      })
    } else if (prop.kind === 'stool') {
      addColliderBox(group, bucket, lists, {
        w: 0.38, h: 0.46, d: 0.38, x: prop.x, y: house.floor + 0.23, z: prop.z, material: materials.woodDark,
      })
    } else if (prop.kind === 'bench') {
      addColliderBox(group, bucket, lists, {
        w: 1.25, h: 0.1, d: 0.42, x: prop.x, y: house.floor + 0.46, z: prop.z, material: materials.wood,
      })
      addColliderBox(group, bucket, lists, {
        w: 1.15, h: 0.4, d: 0.1, x: prop.x, y: house.floor + 0.2, z: prop.z, material: materials.woodDark,
      })
    } else if (prop.kind === 'shelf') {
      addColliderBox(group, bucket, lists, {
        w: 1.3, h: 0.9, d: 0.32, x: prop.x, y: house.floor + 0.7, z: prop.z, material: materials.wood,
      })
    }
  }

  const areas = (content.areas ?? []).map((area) => ({
    id: area.id,
    body: area.body,
    x: area.position[0],
    z: area.position[2],
    radius: area.radius,
  }))

  if (content.debug?.colliders) showColliders(group, bucket, colliders)

  const hemi = new THREE.HemisphereLight('#d5ebe6', '#c6b48a', 0.95)
  const sun = new THREE.DirectionalLight('#fff3df', 2.35)
  sun.position.set(-14, 18, 10)
  group.add(hemi, sun)

  const background = new THREE.Color(content.sky)
  const fog = new THREE.Fog(content.sky, 26, 78)

  function zoneAt(x, z) {
    const places = content.places
    if (x >= layout.innerWest && x <= house.splitX && z >= layout.innerNorth && z <= layout.innerSouth) {
      return places.living
    }
    if (x > house.splitX && x <= layout.innerEast && z >= layout.innerNorth && z <= layout.innerSouth) {
      return places.study
    }
    if (Math.abs(x) <= content.porch.width / 2 && z > layout.innerSouth && z <= layout.stepEnd) {
      return places.porch
    }
    if (Math.abs(x) <= content.path.halfWidth && z > layout.stepEnd && z <= content.path.endZ) {
      return places.path
    }
    const distance = Math.hypot(x, z)
    if (distance <= content.island.grassRadius) return places.lawn
    return places.beach
  }

  return {
    id: content.id,
    name: content.name,
    object: group,
    background,
    fog,
    spawn: content.spawn,
    eyeHeight: content.player.eyeHeight,
    radius: content.player.radius,
    walkSpeed: content.player.walkSpeed,
    walkables,
    colliders,
    occluders,
    areas,
    zoneAt,
    update(dt) {
      waterUniforms.uTime.value += dt
    },
    dispose() {
      bucket.dispose()
    },
  }
}
