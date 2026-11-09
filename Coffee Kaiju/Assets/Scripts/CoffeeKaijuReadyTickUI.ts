import {tickMesh} from "./CoffeeKaijuMeshes"

/**
 * CoffeeKaijuReadyTickUI — the small "Ready" tick above the mug (passive view).
 *
 * Owns: a cyan tick mark plus the word "Ready", facing the camera, and its fade-out.
 * Expects: `unlitMaterial` template wired; the controller calls setCamera(), showFor(seconds), hide().
 * Must not: decide when the coffee is ready.
 */
@component
export class CoffeeKaijuReadyTickUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">CoffeeKaijuReadyTickUI – "Ready" tick above the mug</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Unlit material used as a template for the tick mark")
  unlitMaterial: Material
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input("vec3", "{0.35, 0.95, 1.0}")
  @hint("Tick colour")
  @widget(new ColorWidget())
  tickColor: vec3 = new vec3(0.35, 0.95, 1.0)
  @input
  @hint("Label shown under the tick")
  label: string = "Ready"
  @ui.group_end

  private root: SceneObject
  private tickMat: Material
  private text: Text
  private camera: SceneObject | null = null
  private remaining = 0
  private fade = 0.6
  private showing = false

  onAwake() {
    this.root = global.scene.createSceneObject("ReadyTickVisual")
    this.root.setParent(this.getSceneObject())
    const tickObj = global.scene.createSceneObject("Tick")
    tickObj.setParent(this.root)
    tickObj.getTransform().setLocalPosition(new vec3(0, 0.9, 0))
    const rmv = tickObj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = tickMesh(2.4, 0.45)
    this.tickMat = this.unlitMaterial.clone()
    this.tickMat.mainPass.blendMode = BlendMode.Normal
    this.tickMat.mainPass.depthWrite = false
    this.tickMat.mainPass.twoSided = true
    rmv.mainMaterial = this.tickMat

    const textObj = global.scene.createSceneObject("ReadyLabel")
    textObj.setParent(this.root)
    textObj.getTransform().setLocalPosition(new vec3(0, -0.9, 0))
    this.text = textObj.createComponent("Component.Text") as Text
    this.text.text = this.label
    this.text.size = 36
    this.text.depthTest = true
    this.text.horizontalAlignment = HorizontalAlignment.Center
    this.text.verticalAlignment = VerticalAlignment.Center

    this.root.enabled = false
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  setCamera(camera: SceneObject) {
    this.camera = camera
  }

  showFor(seconds: number) {
    this.remaining = seconds
    this.showing = true
    this.root.enabled = true
  }

  hide() {
    this.showing = false
    this.remaining = 0
    this.root.enabled = false
  }

  isShowing(): boolean {
    return this.showing
  }

  private onUpdate() {
    if (!this.showing) return
    this.remaining -= getDeltaTime()
    if (this.remaining <= 0) {
      this.hide()
      return
    }
    const a = Math.min(1, this.remaining / this.fade)
    this.tickMat.mainPass.baseColor = new vec4(this.tickColor.x, this.tickColor.y, this.tickColor.z, a)
    this.text.textFill.color = new vec4(1, 1, 1, a)
    if (this.camera) {
      const t = this.root.getTransform()
      const toCam = this.camera.getTransform().getWorldPosition().sub(t.getWorldPosition())
      if (toCam.length > 0.01) t.setWorldRotation(quat.lookAt(toCam.normalize(), vec3.up()))
    }
  }
}
