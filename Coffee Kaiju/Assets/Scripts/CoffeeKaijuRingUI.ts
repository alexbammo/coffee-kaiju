import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {arcXY} from "./CoffeeKaijuMeshes"

/**
 * CoffeeKaijuRingUI — the countdown ring above the mug (passive view).
 *
 * Owns: the thin white track, the cyan arc that empties as time runs out, the minutes text in
 * the middle, a pinch target (collider + SIK Interactable) with a hover highlight, facing the
 * camera, and the dim level. A radial gauge has no UIKit primitive, so it is drawn with
 * MeshBuilder arcs; there are no panels or buttons here.
 * Expects: `unlitMaterial` (template, cloned) wired in the Inspector; the controller calls
 * setCamera(), show/hide, setProgress(), setTimeText(), setDim().
 * Emits: onRingPinched when the ring is pinched or clicked.
 * Must not: own countdown state or decide durations; the controller does.
 */
@component
export class CoffeeKaijuRingUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">CoffeeKaijuRingUI – countdown ring above the mug</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Unlit material used as a template; cloned for the track, arc and highlight")
  unlitMaterial: Material
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Ring diameter in cm (brief: about 8 cm across)")
  @widget(new SliderWidget(4, 14, 0.5))
  diameterCm: number = 8
  @input("vec3", "{0.35, 0.95, 1.0}")
  @hint("Colour of the arc that empties as the countdown runs")
  @widget(new ColorWidget())
  fillColor: vec3 = new vec3(0.35, 0.95, 1.0)
  @input("vec3", "{1.0, 1.0, 1.0}")
  @hint("Colour of the thin background track and the minutes text")
  @widget(new ColorWidget())
  trackColor: vec3 = new vec3(1, 1, 1)
  @input
  @hint("Text size of the minutes in the middle of the ring")
  @widget(new SliderWidget(10, 120, 1))
  textSize: number = 90
  @ui.group_end

  /** Fires when the user pinches (or clicks) the ring. */
  onRingPinched = new Event<void>()

  private trackVisual: RenderMeshVisual
  private fillVisual: RenderMeshVisual
  private text: Text
  private trackMat: Material
  private fillMat: Material
  private camera: SceneObject | null = null
  private progress = 1
  private dim = 1
  private hovered = false
  private visible = false
  private lastArcFraction = -1
  private visualRoot: SceneObject

  onAwake() {
    const so = this.getSceneObject()
    // Visuals live on a child so the collider wrapper keeps unit scale and identity rotation.
    this.visualRoot = global.scene.createSceneObject("RingVisuals")
    this.visualRoot.setParent(so)
    const rOut = this.diameterCm / 2
    const rIn = rOut - 0.35

    const trackObj = global.scene.createSceneObject("RingTrack")
    trackObj.setParent(this.visualRoot)
    this.trackVisual = trackObj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    this.trackVisual.mesh = arcXY(rIn + 0.08, rOut - 0.08, 1, 64)
    this.trackMat = this.makeMat()
    this.trackVisual.mainMaterial = this.trackMat

    const fillObj = global.scene.createSceneObject("RingFill")
    fillObj.setParent(this.visualRoot)
    fillObj.getTransform().setLocalPosition(new vec3(0, 0, 0.05))
    this.fillVisual = fillObj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    this.fillMat = this.makeMat()
    this.fillVisual.mainMaterial = this.fillMat

    const textObj = global.scene.createSceneObject("RingTime")
    textObj.setParent(this.visualRoot)
    textObj.getTransform().setLocalPosition(new vec3(0, 0, 0.1))
    this.text = textObj.createComponent("Component.Text") as Text
    this.text.size = this.textSize
    this.text.depthTest = true
    this.text.horizontalAlignment = HorizontalAlignment.Center
    this.text.verticalAlignment = VerticalAlignment.Center
    this.text.text = "5:00"

    // Pinch target: a generous box around the ring so it is easy to hit.
    const collider = so.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = new vec3(this.diameterCm + 2, this.diameterCm + 2, this.diameterCm + 2)
    collider.shape = shape
    collider.fitVisual = false
    const interactable = so.createComponent(Interactable.getTypeName()) as Interactable

    this.createEvent("OnStartEvent").bind(() => {
      interactable.onTriggerStart.add(() => {
        if (this.visible) this.onRingPinched.invoke()
      })
      interactable.onHoverEnter.add(() => (this.hovered = true))
      interactable.onHoverExit.add(() => (this.hovered = false))
    })
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
    this.applyVisible()
  }

  setCamera(camera: SceneObject) {
    this.camera = camera
  }

  show() {
    this.visible = true
    this.applyVisible()
  }

  hide() {
    this.visible = false
    this.applyVisible()
  }

  isShowing(): boolean {
    return this.visible
  }

  /** fraction of time remaining, 1 = full ring, 0 = empty. */
  setProgress(fraction: number) {
    this.progress = Math.max(0, Math.min(1, fraction))
  }

  setTimeText(s: string) {
    this.text.text = s
  }

  getTimeText(): string {
    return this.text.text
  }

  /** 1 = full brightness, lower = dimmed when the user looks away from the mug. */
  setDim(alpha: number) {
    this.dim = alpha
  }

  getAlpha(): number {
    return this.visible ? this.dim : 0
  }

  private makeMat(): Material {
    const m = this.unlitMaterial.clone()
    m.mainPass.blendMode = BlendMode.Normal
    m.mainPass.depthWrite = false
    m.mainPass.twoSided = true
    return m
  }

  private applyVisible() {
    this.trackVisual.getSceneObject().enabled = this.visible
    this.fillVisual.getSceneObject().enabled = this.visible
    this.text.getSceneObject().enabled = this.visible
  }

  private onUpdate() {
    if (!this.visible) return
    // Face the user.
    if (this.camera) {
      const t = this.visualRoot.getTransform()
      const toCam = this.camera.getTransform().getWorldPosition().sub(t.getWorldPosition())
      if (toCam.length > 0.01) t.setWorldRotation(quat.lookAt(toCam.normalize(), vec3.up()))
    }
    // Rebuild the arc only when it visibly changes.
    const f = Math.round(this.progress * 200) / 200
    if (f !== this.lastArcFraction) {
      this.lastArcFraction = f
      const rOut = this.diameterCm / 2
      this.fillVisual.mesh = arcXY(rOut - 0.35, rOut, Math.max(0.002, f), 72)
      this.fillVisual.enabled = f > 0.001
    }
    const boost = this.hovered ? 1.0 : 0.85
    const a = this.dim * boost
    this.fillMat.mainPass.baseColor = new vec4(this.fillColor.x, this.fillColor.y, this.fillColor.z, a)
    this.trackMat.mainPass.baseColor = new vec4(this.trackColor.x, this.trackColor.y, this.trackColor.z, 0.35 * a)
    this.text.textFill.color = new vec4(this.trackColor.x, this.trackColor.y, this.trackColor.z, Math.max(0.3, a))
    const s = this.hovered ? 1.08 : 1
    this.visualRoot.getTransform().setLocalScale(new vec3(s, s, s))
  }
}
