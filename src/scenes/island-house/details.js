import * as THREE from 'three'
import { addColliderBox } from '../../engine/build.js'

export function addDetails(group, bucket, lists, materials, content, layout) {
  const { house, porch } = content
  const box = (w, h, d, x, y, z, material = materials.woodDark) =>
    bucket.box(group, { w, h, d, x, y, z, material })
  const trim = bucket.material({ color: '#eee4ce', roughness: 0.75 })
  const metal = bucket.material({ color: '#343d3b', roughness: 0.45, metalness: 0.6 })
  const fabric = bucket.material({ color: '#c9bda1', roughness: 1 })
  const roofRise = 1.9
  const halfSpan = house.width / 2 + 0.65
  const slope = Math.atan2(roofRise, halfSpan)
  const slopeLength = Math.hypot(halfSpan, roofRise)
  for (const side of [-1, 1]) {
    const roof = box(slopeLength, 0.16, house.depth + 1.3,
      side * halfSpan / 2, layout.top + roofRise / 2, 0, materials.roof)
    roof.rotation.z = -side * slope
    lists.occluders.push(roof)
    for (let z = -house.depth / 2 - 0.6; z <= house.depth / 2 + 0.6; z += 0.32) {
      const seam = box(slopeLength, 0.045, 0.028,
        side * halfSpan / 2, layout.top + roofRise / 2 + 0.1, z, metal)
      seam.rotation.z = -side * slope
    }
    for (const z of [-house.depth / 2 - 0.65, house.depth / 2 + 0.65]) {
      const fascia = box(slopeLength + 0.12, 0.22, 0.12,
        side * halfSpan / 2, layout.top + roofRise / 2, z, trim)
      fascia.rotation.z = -side * slope
    }
    box(0.16, 0.18, house.depth + 1.4, side * halfSpan, layout.top, 0, metal)
  }
  box(0.22, 0.15, house.depth + 1.45, 0, layout.top + roofRise + 0.08, 0, metal)
  const gable = new THREE.Shape()
  gable.moveTo(-house.width / 2, 0)
  gable.lineTo(house.width / 2, 0)
  gable.lineTo(0, roofRise)
  gable.closePath()
  const gableGeometry = bucket.track(new THREE.ExtrudeGeometry(gable, { depth: house.wall, bevelEnabled: false }))
  for (const z of [-house.depth / 2, house.depth / 2 - house.wall]) {
    const mesh = new THREE.Mesh(gableGeometry, materials.plaster)
    mesh.position.set(0, layout.top, z)
    group.add(mesh)
    for (let y = 0.15; y < roofRise; y += 0.18) {
      const width = house.width * (1 - y / roofRise)
      box(width, 0.025, 0.025, 0, layout.top + y, z + (z > 0 ? house.wall + 0.01 : -0.01), trim)
    }
  }
  // Frames follow the existing wall openings, including their sill heights.
  const windows = [
    [-house.width * 0.3, layout.southCenter, 0], [house.width * 0.3, layout.southCenter, 0],
    [-house.width * 0.24, layout.northCenter, 0], [house.width * 0.32, layout.northCenter, 0],
    [layout.westCenter, 0.2, Math.PI / 2], [layout.eastCenter, -0.3, Math.PI / 2],
  ]
  for (const [x, z, rotation] of windows) {
    const frame = new THREE.Group()
    frame.position.set(x, 1.725, z)
    frame.rotation.y = rotation
    group.add(frame)
    const part = (w, h, d, px, py, material) => bucket.box(frame, { w, h, d, x: px, y: py, z: 0, material })
    for (const side of [-1, 1]) {
      part(0.09, 1.2, 0.23, side * 0.6, 0, trim)
      part(1.3, 0.09, 0.23, 0, side * 0.57, trim)
    }
    part(0.045, 1.05, 0.2, 0, 0, metal)
    part(1.15, 0.045, 0.2, 0, 0, metal)
    part(1.4, 0.09, 0.38, 0, -0.65, trim)
  }
  for (const x of [-house.width / 2, house.width / 2]) {
    for (const z of [-house.depth / 2, house.depth / 2]) box(0.23, layout.top, 0.23, x, layout.top / 2, z, trim)
  }
  for (const side of [-1, 1]) {
    box(0.12, house.doorHeight + 0.15, 0.25, side * (house.doorWidth / 2 + 0.05), house.floor + house.doorHeight / 2, layout.southCenter, trim)
  }
  box(house.doorWidth + 0.24, 0.13, 0.25, 0, house.floor + house.doorHeight, layout.southCenter, trim)
  for (let x = -porch.width / 2 + 0.1; x < porch.width / 2; x += 0.18) {
    box(0.008, 0.005, porch.depth, x, house.floor + 0.004, layout.southFace + porch.depth / 2)
  }
  for (const side of [-1, 1]) {
    const x = side * (porch.width / 2 - 0.08)
    addColliderBox(group, bucket, lists, { w: 0.12, h: 0.1, d: porch.depth - 0.2, x, y: 1.1, z: layout.southFace + porch.depth / 2, material: trim })
    for (let z = layout.southFace + 0.2; z < layout.porchEnd; z += 0.25) box(0.04, 0.8, 0.04, x, 0.65, z, trim)
    box(0.25, 0.2, 0.25, x, 0.3, layout.porchEnd - 0.1, trim)
  }
  // A low sofa along the living-room wall keeps the entrance circulation clear.
  const sofaX = layout.innerWest + 0.65
  const sofaZ = -1.7
  addColliderBox(group, bucket, lists, { w: 1.1, h: 0.35, d: 2.5, x: sofaX, y: house.floor + 0.3, z: sofaZ, material: materials.woodDark })
  box(0.18, 0.8, 2.5, sofaX - 0.48, house.floor + 0.55, sofaZ, fabric)
  for (const offset of [-0.78, 0, 0.78]) box(0.85, 0.18, 0.73, sofaX + 0.08, house.floor + 0.56, sofaZ + offset, fabric)
  for (const side of [-1, 1]) box(1.1, 0.55, 0.15, sofaX, house.floor + 0.4, sofaZ + side * 1.2, fabric)
  // Deterministic low vegetation clusters leave the central path open.
  const bladeGeometry = bucket.track(new THREE.ConeGeometry(0.08, 0.45, 4))
  const grass = new THREE.InstancedMesh(bladeGeometry, materials.leaf, 500)
  const dummy = new THREE.Object3D()
  for (let i = 0; i < 500; i += 1) {
    const angle = i * 2.399963
    const radius = 8.6 + ((i * 37) % 100) / 100 * 3
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    dummy.position.set(x, 0.14, z)
    dummy.scale.setScalar(z > 0 && Math.abs(x) < 1.6 ? 0 : 0.5 + (i % 7) / 7)
    dummy.rotation.set(0.2, angle, 0.15)
    dummy.updateMatrix()
    grass.setMatrixAt(i, dummy.matrix)
  }
  group.add(grass)
}
