import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {annulusXZ, latheMesh, quadXY, sphereMesh, tubeMesh} from "./CoffeeKaijuMeshes"

/** Mug dimensions in cm (brief: about 9 cm wide, 10 cm tall). Fixed geometry, not opinions. */
export const MUG = {
  outerR: 4.5,
  innerR: 4.1,
  height: 10,
  floorY: 0.6,
  coffeeY: 8.6,
  foamY: 8.75,
}

type Puff = {obj: SceneObject; mat: Material; t: number}
type Bubble = {obj: SceneObject; mat: Material; pos: vec3; speed: number; life: number; size: number; popping: number}
type Ripple = {obj: SceneObject; mat: Material; t: number; x: number; z: number}

/**
 * CoffeeKaijuMugFX — the virtual mug of light coffee (preview stand-in) and its effects.
 *
 * Owns: the white mug (body, rim, handle), the warm amber pool lining, the foam disc and its
 * opacity, steam puffs, bubbles, fin ripples, the mug pinch target (collider + Interactable)
 * with a hover glow, and show/hide with a short pop.
 * Expects: lit + unlit template materials wired; the controller drives every value.
 * Emits: onMugPinched.
 * Must not: own countdown state, sounds or the kaiju.
 */
@component
export class CoffeeKaijuMugFX extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">CoffeeKaijuMugFX – virtual mug, foam, steam, bubbles</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Lit material template (SimplePBR) for the white mug")
  litMaterial: Material
  @input
  @hint("Unlit material template for coffee, foam, steam, bubbles and ripples")
  unlitMaterial: Material
  @input
  @hint("Soft puff material for the steam (unlit, textured, alpha-blended)")
  steamMaterial: Material
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input("vec3", "{1.0, 0.62, 0.24}")
  @hint("Warm amber of the lit coffee pool (keep it bright: the display is additive)")
  @widget(new ColorWidget())
  coffeeColor: vec3 = new vec3(1.0, 0.62, 0.24)
  @input("vec3", "{0.93, 0.80, 0.62}")
  @hint("Pale caramel foam on top of the coffee")
  @widget(new ColorWidget())
  foamColor: vec3 = new vec3(0.93, 0.8, 0.62)
  @input("vec3", "{0.35, 0.95, 1.0}")
  @hint("Glow colour of bubbles, fin ripples and the hover highlight")
  @widget(new ColorWidget())
  glowColor: vec3 = new vec3(0.35, 0.95, 1.0)
  @input
  @hint("Peak opacity of a steam puff when the coffee is fresh")
  @widget(new SliderWidget(0, 1, 0.05))
  steamOpacity: number = 0.45
  @ui.group_end

  onMugPinched = new Event<void>()

  private visualRoot: SceneObject
  private surfaceMat: Material
  private foamMat: Material
  private foamObj: SceneObject
  private glowObj: SceneObject
  private puffs: Puff[] = []
  private bubbles: Bubble[] = []
  private ripples: Ripple[] = []
  private steamLevel = 1
  private foamOpacity = 1
  private hovered = false
  private shownScale = 1
  private targetScale = 1
  private time = 0
  private pinchEnabled = true
  private hitObj: SceneObject

  onAwake() {
    const so = this.getSceneObject()
    this.visualRoot = global.scene.createSceneObject("MugVisuals")
    this.visualRoot.setParent(so)

    const mugMat = this.litMaterial.clone()
    mugMat.mainPass.baseColor = new vec4(0.97, 0.97, 0.95, 1)
    mugMat.mainPass.twoSided = true
    const coffeeMat = this.unlit(new vec4(this.coffeeColor.x, this.coffeeColor.y, this.coffeeColor.z, 1), false)
    this.surfaceMat = this.unlit(new vec4(this.coffeeColor.x, this.coffeeColor.y * 1.1, this.coffeeColor.z * 1.2, 0.35), true)
    this.foamMat = this.unlit(new vec4(this.foamColor.x, this.foamColor.y, this.foamColor.z, 1), true)

    const {outerR, innerR, height, floorY, coffeeY, foamY} = MUG
    this.addMesh("MugOuter", latheMesh([[outerR, 0], [outerR, height]], 48, true), mugMat)
    this.addMesh("MugRim", annulusXZ(innerR, outerR, height, 48, true), mugMat)
    this.addMesh("MugInnerUpper", latheMesh([[innerR, coffeeY], [innerR, height]], 48, false), mugMat)
    this.addMesh("MugBase", annulusXZ(0, outerR, 0, 48, false), mugMat)
    const handle: vec3[] = []
    for (let i = 0; i <= 16; i++) {
      const a = -1.35 + (i / 16) * 2.7
      handle.push(new vec3(outerR - 0.3 + 2.3 * Math.cos(a), 5.2 + 2.7 * Math.sin(a), 0))
    }
    this.addMesh("MugHandle", tubeMesh(handle, 0.5, 10), mugMat)
    // Warm, bright pool: lining and floor glow amber so it never reads as a hole.
    this.addMesh("PoolLining", latheMesh([[innerR - 0.02, floorY], [innerR - 0.02, coffeeY]], 48, false), coffeeMat)
    this.addMesh("PoolFloor", annulusXZ(0, innerR - 0.02, floorY, 48, true), coffeeMat)
    this.addMesh("PoolSurface", annulusXZ(0, innerR - 0.02, coffeeY, 48, true), this.surfaceMat)
    this.foamObj = this.addMesh("Foam", annulusXZ(0, innerR - 0.03, foamY, 48, true), this.foamMat)
    this.glowObj = this.addMesh(
      "HoverGlow",
      annulusXZ(outerR, outerR + 0.5, height + 0.05, 48, true),
      this.unlit(new vec4(this.glowColor.x, this.glowColor.y, this.glowColor.z, 0.9), true),
    )
    this.glowObj.enabled = false

    // Steam puffs: soft camera-facing quads.
    const puffMesh = quadXY()
    for (let i = 0; i < 7; i++) {
      const mat = this.steamMaterial.clone()
      const obj = this.addMesh("Steam" + i, puffMesh, mat)
      this.puffs.push({obj, mat, t: i / 7})
    }
    // Bubble pool.
    const bubbleMesh = sphereMesh(1, 6, 8)
    for (let i = 0; i < 18; i++) {
      const mat = this.unlit(new vec4(this.glowColor.x, this.glowColor.y, this.glowColor.z, 1), true)
      const obj = this.addMesh("Bubble" + i, bubbleMesh, mat)
      obj.enabled = false
      this.bubbles.push({obj, mat, pos: vec3.zero(), speed: 3, life: 0, size: 0.2, popping: 0})
    }
    // Ripple pool.
    const ringMesh = annulusXZ(0.82, 1, 0, 40, true)
    for (let i = 0; i < 4; i++) {
      const mat = this.unlit(new vec4(this.glowColor.x, this.glowColor.y, this.glowColor.z, 0), true)
      const obj = this.addMesh("Ripple" + i, ringMesh, mat)
      obj.enabled = false
      this.ripples.push({obj, mat, t: 1, x: 0, z: 0})
    }

    // Pinch target on a unit-scale child sized to the mug.
    const hit = global.scene.createSceneObject("MugBody")
    this.hitObj = hit
    hit.setParent(so)
    hit.getTransform().setLocalPosition(new vec3(0, height / 2, 0))
    const collider = hit.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = new vec3(outerR * 2 + 3, height + 1, outerR * 2 + 1)
    collider.shape = shape
    collider.fitVisual = false
    const interactable = hit.createComponent(Interactable.getTypeName()) as Interactable
    this.createEvent("OnStartEvent").bind(() => {
      interactable.onTriggerStart.add(() => {
        if (this.pinchEnabled) this.onMugPinched.invoke()
      })
      interactable.onHoverEnter.add(() => (this.hovered = true))
      interactable.onHoverExit.add(() => (this.hovered = false))
    })

    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  private camera: SceneObject | null = null

  setCamera(camera: SceneObject) {
    this.camera = camera
  }

  /** 1 = full steam, 0 = none. */
  setSteamLevel(level: number) {
    this.steamLevel = Math.max(0, Math.min(1, level))
  }

  /** 1 = frosted foam, 0 = clear so the pool shows. */
  setFoamOpacity(opacity: number) {
    this.foamOpacity = Math.max(0, Math.min(1, opacity))
  }

  /** Whether hover highlighting and pinches on the mug are active. */
  setPinchEnabled(enabled: boolean) {
    this.pinchEnabled = enabled
  }

  /** Pop the mug in (true) or shrink it away (false). */
  setShown(shown: boolean, instant = false) {
    this.targetScale = shown ? 1 : 0
    if (instant) this.shownScale = this.targetScale
    if (shown) this.visualRoot.enabled = true
    this.hitObj.enabled = shown
  }

  /** A cyan ripple on the foam at mug-local (x, z). */
  spawnRipple(x: number, z: number) {
    const r = this.ripples.find((q) => q.t >= 1)
    if (!r) return
    r.t = 0
    r.x = x
    r.z = z
    r.obj.enabled = true
  }

  /** A small bright bubble rising from a mug-local point to the surface. */
  spawnBubble(local: vec3) {
    const b = this.bubbles.find((q) => !q.obj.enabled)
    if (!b) return
    b.pos = local
    b.size = 0.12 + Math.random() * 0.16
    b.speed = 2.5 + Math.random() * 2
    b.popping = 0
    b.obj.enabled = true
  }

  private unlit(color: vec4, transparent: boolean): Material {
    const m = this.unlitMaterial.clone()
    m.mainPass.baseColor = color
    m.mainPass.twoSided = true
    if (transparent) {
      m.mainPass.blendMode = BlendMode.Normal
      m.mainPass.depthWrite = false
    }
    return m
  }

  private addMesh(name: string, mesh: RenderMesh, mat: Material): SceneObject {
    const obj = global.scene.createSceneObject(name)
    obj.setParent(this.visualRoot)
    const rmv = obj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = mesh
    rmv.mainMaterial = mat
    return obj
  }

  private onUpdate() {
    const dt = getDeltaTime()
    this.time += dt

    // Show / hide pop.
    this.shownScale += (this.targetScale - this.shownScale) * Math.min(1, dt * 8)
    if (Math.abs(this.shownScale - this.targetScale) < 0.01) this.shownScale = this.targetScale
    const s = this.shownScale
    this.visualRoot.getTransform().setLocalScale(new vec3(s, s, s))
    this.visualRoot.enabled = s > 0.001

    this.glowObj.enabled = this.hovered && this.pinchEnabled && s > 0.5

    // Foam and pool surface.
    this.foamMat.mainPass.baseColor = new vec4(this.foamColor.x, this.foamColor.y, this.foamColor.z, this.foamOpacity)
    this.foamObj.enabled = this.foamOpacity > 0.01

    // Steam: puffs rise from the rim, widen and fade.
    for (const p of this.puffs) {
      p.t += dt / 3.6
      if (p.t > 1) p.t -= 1
      const t = p.t
      const k = this.puffs.indexOf(p)
      const sway = Math.sin(this.time * 0.9 + k * 1.7) * (0.6 + 1.4 * t)
      const side = ((k % 3) - 1) * 1.4
      p.obj.getTransform().setLocalPosition(new vec3(side + sway, MUG.height + 0.5 + t * 12, Math.cos(k * 2.1) * 1.2))
      const sc = 2.2 + 4.5 * t
      p.obj.getTransform().setLocalScale(new vec3(sc, sc, sc))
      if (this.camera) {
        const pt = p.obj.getTransform()
        const toCam = this.camera.getTransform().getWorldPosition().sub(pt.getWorldPosition())
        if (toCam.length > 0.01) pt.setWorldRotation(quat.lookAt(toCam.normalize(), vec3.up()))
      }
      const a = this.steamOpacity * this.steamLevel * Math.sin(Math.PI * t)
      p.mat.mainPass.baseColor = new vec4(1, 1, 1, a)
      p.obj.enabled = a > 0.005
    }

    // Bubbles: rise, then pop at the surface.
    for (const b of this.bubbles) {
      if (!b.obj.enabled) continue
      if (b.popping > 0) {
        b.popping += dt
        const k = b.popping / 0.25
        const sc = b.size * (1 + k * 1.5)
        b.obj.getTransform().setLocalScale(new vec3(sc, sc * 0.4, sc))
        b.mat.mainPass.baseColor = new vec4(this.glowColor.x, this.glowColor.y, this.glowColor.z, 1 - k)
        if (k >= 1) b.obj.enabled = false
        continue
      }
      b.pos = b.pos.add(new vec3(Math.sin(this.time * 7 + b.size * 40) * 0.3 * dt, b.speed * dt, 0))
      if (b.pos.y >= MUG.foamY) {
        b.pos = new vec3(b.pos.x, MUG.foamY + 0.05, b.pos.z)
        b.popping = 0.0001
      }
      b.obj.getTransform().setLocalPosition(b.pos)
      b.obj.getTransform().setLocalScale(new vec3(b.size, b.size, b.size))
      b.mat.mainPass.baseColor = new vec4(this.glowColor.x, this.glowColor.y, this.glowColor.z, 1)
    }

    // Fin ripples: expanding cyan rings on the foam.
    for (const r of this.ripples) {
      if (r.t >= 1) continue
      r.t += dt / 1.4
      if (r.t >= 1) {
        r.obj.enabled = false
        continue
      }
      const room = Math.max(0.6, MUG.innerR - 0.1 - Math.sqrt(r.x * r.x + r.z * r.z))
      const rad = Math.min(room, 0.3 + r.t * 2.0)
      r.obj.getTransform().setLocalPosition(new vec3(r.x, MUG.foamY + 0.04, r.z))
      r.obj.getTransform().setLocalScale(new vec3(rad, 1, rad))
      const a = (1 - r.t) * 0.9 * Math.max(0.25, this.foamOpacity)
      r.mat.mainPass.baseColor = new vec4(this.glowColor.x, this.glowColor.y, this.glowColor.z, a)
    }
  }
}
