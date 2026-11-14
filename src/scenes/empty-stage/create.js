import * as THREE from 'three'
import { addColliderBox, addWall, createBucket, showColliders } from '../../engine/build.js'

export function createEmptyStage(content) {
  const group = new THREE.Group()
  const bucket = createBucket()
  const walkables = []
  const colliders = []
  const occluders = []

  const floorMaterial = bucket.material({ color: content.palette.floor, roughness: 0.95 })
  const wallMaterial = bucket.material({ color: content.palette.wall, roughness: 0.9 })

  addColliderBox(group, bucket, { walkables, colliders: null, occluders: null }, {
    w: content.floor.width,
    h: 0.2,
    d: content.floor.depth,
    x: 0,
    y: -0.1,
    z: 0,
    material: floorMaterial,
    walkable: true,
  })

  addWall(group, bucket, {
    axis: 'x',
    x: 0,
    z: -2,
    length: 6,
    thickness: 0.16,
    baseY: 0,
    height: 2.6,
    material: wallMaterial,
    openings: [{ offset: 0, width: 1.2, height: 2.1, sill: 0, door: true }],
    colliders,
    occluders,
    walkables,
  })

  const areas = (content.areas ?? []).map((area) => ({
    id: area.id,
    body: area.body,
    x: area.position[0],
    z: area.position[2],
    radius: area.radius,
  }))

  if (content.debug?.colliders) showColliders(group, bucket, colliders)

  group.add(new THREE.HemisphereLight('#e7eee8', '#c8bfae', 1))
  const sun = new THREE.DirectionalLight('#fff6ea', 1.8)
  sun.position.set(-6, 10, 4)
  group.add(sun)

  return {
    id: content.id,
    name: content.name,
    object: group,
    background: new THREE.Color(content.sky),
    fog: new THREE.Fog(content.sky, 18, 40),
    spawn: content.spawn,
    eyeHeight: content.player.eyeHeight,
    radius: content.player.radius,
    walkSpeed: content.player.walkSpeed,
    walkables,
    colliders,
    occluders,
    areas,
    zoneAt() {
      return content.places.stage
    },
    update() {},
    dispose() {
      bucket.dispose()
    },
  }
}
