/**
 * CoffeeKaijuMeshes — code-authored geometry for the Coffee Kaiju stand-ins.
 *
 * Owns: pure MeshBuilder helpers (box, lathe/cylinder walls, discs, arcs, spheres, tubes).
 * Expects: nothing; every function returns a RenderMesh in centimetres, Y up.
 * Must not: touch the scene, materials or state. Callers attach the meshes.
 */

const LAYOUT = [
  {name: "position", components: 3},
  {name: "normal", components: 3, normalized: true},
  {name: "texture0", components: 2},
]

class Builder {
  v: number[] = []
  i: number[] = []
  count = 0
  vert(p: vec3, n: vec3, u: number, w: number): number {
    this.v.push(p.x, p.y, p.z, n.x, n.y, n.z, u, w)
    return this.count++
  }
  quad(a: number, b: number, c: number, d: number) {
    this.i.push(a, b, c, a, c, d)
  }
  build(): RenderMesh {
    const mb = new MeshBuilder(LAYOUT)
    mb.topology = MeshTopology.Triangles
    mb.indexType = MeshIndexType.UInt16
    mb.appendVerticesInterleaved(this.v)
    mb.appendIndices(this.i)
    mb.updateMesh()
    return mb.getMesh()
  }
}

/** Axis-aligned box centred on the origin. */
export function boxMesh(w: number, h: number, d: number): RenderMesh {
  const b = new Builder()
  const hx = w / 2,
    hy = h / 2,
    hz = d / 2
  const faces: [vec3, vec3, vec3][] = [
    [new vec3(0, 0, 1), new vec3(1, 0, 0), new vec3(0, 1, 0)],
    [new vec3(0, 0, -1), new vec3(-1, 0, 0), new vec3(0, 1, 0)],
    [new vec3(1, 0, 0), new vec3(0, 0, -1), new vec3(0, 1, 0)],
    [new vec3(-1, 0, 0), new vec3(0, 0, 1), new vec3(0, 1, 0)],
    [new vec3(0, 1, 0), new vec3(1, 0, 0), new vec3(0, 0, -1)],
    [new vec3(0, -1, 0), new vec3(1, 0, 0), new vec3(0, 0, 1)],
  ]
  const half = new vec3(hx, hy, hz)
  for (const [n, r, u] of faces) {
    const c = new vec3(n.x * hx, n.y * hy, n.z * hz)
    const rs = new vec3(r.x * half.x, r.y * half.y, r.z * half.z)
    const us = new vec3(u.x * half.x, u.y * half.y, u.z * half.z)
    const a = b.vert(c.sub(rs).sub(us), n, 0, 0)
    const bb = b.vert(c.add(rs).sub(us), n, 1, 0)
    const cc = b.vert(c.add(rs).add(us), n, 1, 1)
    const d = b.vert(c.sub(rs).add(us), n, 0, 1)
    b.quad(a, bb, cc, d)
  }
  return b.build()
}

/**
 * Surface of revolution around Y. `profile` is a list of [radius, y] points; normals point
 * away from the axis when `outward` is true (use false for the inside of a cup).
 */
export function latheMesh(profile: number[][], segments: number, outward: boolean): RenderMesh {
  const b = new Builder()
  const rows = profile.length
  for (let s = 0; s <= segments; s++) {
    const a = (s / segments) * Math.PI * 2
    const cx = Math.cos(a),
      sz = Math.sin(a)
    for (let r = 0; r < rows; r++) {
      const [rad, y] = profile[r]
      const n = outward ? new vec3(cx, 0, sz) : new vec3(-cx, 0, -sz)
      b.vert(new vec3(cx * rad, y, sz * rad), n, s / segments, r / (rows - 1))
    }
  }
  for (let s = 0; s < segments; s++) {
    for (let r = 0; r < rows - 1; r++) {
      const a = s * rows + r
      const c = (s + 1) * rows + r
      if (outward) b.quad(a, a + 1, c + 1, c)
      else b.quad(a, c, c + 1, a + 1)
    }
  }
  return b.build()
}

/** Flat annulus (or disc when rIn = 0) in the XZ plane at height y, facing up (or down). */
export function annulusXZ(rIn: number, rOut: number, y: number, segments: number, up = true): RenderMesh {
  const b = new Builder()
  const n = up ? vec3.up() : vec3.down()
  for (let s = 0; s <= segments; s++) {
    const a = (s / segments) * Math.PI * 2
    const cx = Math.cos(a),
      sz = Math.sin(a)
    b.vert(new vec3(cx * rIn, y, sz * rIn), n, 0.5 + cx * 0.5 * (rIn / rOut), 0.5 + sz * 0.5 * (rIn / rOut))
    b.vert(new vec3(cx * rOut, y, sz * rOut), n, 0.5 + cx * 0.5, 0.5 + sz * 0.5)
  }
  for (let s = 0; s < segments; s++) {
    const a = s * 2
    if (up) b.quad(a, a + 2, a + 3, a + 1)
    else b.quad(a, a + 1, a + 3, a + 2)
  }
  return b.build()
}

/**
 * Arc of an annulus in the XY plane facing +Z. Starts at 12 o'clock and sweeps clockwise
 * by `fraction` of a full turn (fraction 1 = full ring).
 */
export function arcXY(rIn: number, rOut: number, fraction: number, segments: number): RenderMesh {
  const b = new Builder()
  const f = Math.max(0.001, Math.min(1, fraction))
  const segs = Math.max(2, Math.ceil(segments * f))
  const n = new vec3(0, 0, 1)
  for (let s = 0; s <= segs; s++) {
    const a = Math.PI / 2 - (s / segs) * f * Math.PI * 2
    const cx = Math.cos(a),
      sy = Math.sin(a)
    b.vert(new vec3(cx * rIn, sy * rIn, 0), n, s / segs, 0)
    b.vert(new vec3(cx * rOut, sy * rOut, 0), n, s / segs, 1)
  }
  for (let s = 0; s < segs; s++) {
    const a = s * 2
    b.quad(a, a + 1, a + 3, a + 2)
  }
  return b.build()
}

/** UV sphere centred on the origin. */
export function sphereMesh(r: number, lat = 10, lon = 14): RenderMesh {
  const b = new Builder()
  for (let y = 0; y <= lat; y++) {
    const th = (y / lat) * Math.PI
    for (let x = 0; x <= lon; x++) {
      const ph = (x / lon) * Math.PI * 2
      const n = new vec3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph))
      b.vert(n.uniformScale(r), n, x / lon, y / lat)
    }
  }
  for (let y = 0; y < lat; y++) {
    for (let x = 0; x < lon; x++) {
      const a = y * (lon + 1) + x
      const c = a + lon + 1
      b.quad(a, a + 1, c + 1, c)
    }
  }
  return b.build()
}

/** Round tube swept along a polyline of points (used for the mug handle). */
export function tubeMesh(path: vec3[], radius: number, sides = 10): RenderMesh {
  const b = new Builder()
  for (let p = 0; p < path.length; p++) {
    const prev = path[Math.max(0, p - 1)]
    const next = path[Math.min(path.length - 1, p + 1)]
    const t = next.sub(prev).normalize()
    let side = t.cross(vec3.forward())
    if (side.length < 0.01) side = t.cross(vec3.up())
    side = side.normalize()
    const up = side.cross(t).normalize()
    for (let s = 0; s <= sides; s++) {
      const a = (s / sides) * Math.PI * 2
      const n = side.uniformScale(Math.cos(a)).add(up.uniformScale(Math.sin(a)))
      b.vert(path[p].add(n.uniformScale(radius)), n, s / sides, p / (path.length - 1))
    }
  }
  for (let p = 0; p < path.length - 1; p++) {
    for (let s = 0; s < sides; s++) {
      const a = p * (sides + 1) + s
      const c = a + sides + 1
      b.quad(a, c, c + 1, a + 1)
    }
  }
  return b.build()
}

/** A tick mark made of two thick strokes in the XY plane facing +Z, about `size` cm wide. */
export function tickMesh(size: number, thickness: number): RenderMesh {
  const b = new Builder()
  const n = new vec3(0, 0, 1)
  const stroke = (p0: vec3, p1: vec3) => {
    const d = p1.sub(p0).normalize()
    const o = new vec3(-d.y, d.x, 0).uniformScale(thickness / 2)
    const a = b.vert(p0.sub(o), n, 0, 0)
    const c = b.vert(p1.sub(o), n, 1, 0)
    const e = b.vert(p1.add(o), n, 1, 1)
    const f = b.vert(p0.add(o), n, 0, 1)
    b.quad(a, c, e, f)
  }
  const s = size
  const elbow = new vec3(-0.12 * s, -0.3 * s, 0)
  stroke(new vec3(-0.45 * s, 0.02 * s, 0), elbow.add(new vec3(0.02 * s, -0.02 * s, 0)))
  stroke(elbow, new vec3(0.48 * s, 0.4 * s, 0))
  return b.build()
}

/** Unit quad (1 x 1 cm) in the XY plane facing +Z, centred on the origin. */
export function quadXY(): RenderMesh {
  const b = new Builder()
  const n = new vec3(0, 0, 1)
  const a = b.vert(new vec3(-0.5, -0.5, 0), n, 0, 0)
  const c = b.vert(new vec3(0.5, -0.5, 0), n, 1, 0)
  const d = b.vert(new vec3(0.5, 0.5, 0), n, 1, 1)
  const e = b.vert(new vec3(-0.5, 0.5, 0), n, 0, 1)
  b.quad(a, c, d, e)
  return b.build()
}
