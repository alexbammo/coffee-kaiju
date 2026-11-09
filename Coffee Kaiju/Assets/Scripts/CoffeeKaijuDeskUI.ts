import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {boxMesh} from "./CoffeeKaijuMeshes"

/**
 * CoffeeKaijuDeskUI — the wooden desk slab (preview stand-in for the real desk).
 *
 * Owns: the slab visual (top surface at this object's local y = 0), its pinch target and
 * hover highlight. Reports where on the desk the user pinched.
 * Expects: lit material template wired; sits on the authored DeskStandIn object.
 * Emits: onDeskPinched(world hit point, or null when the interactor gave no hit point).
 * Must not: move the mug or kaiju itself; the controller decides.
 */
@component
export class CoffeeKaijuDeskUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">CoffeeKaijuDeskUI – wooden desk slab stand-in</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Lit material template (SimplePBR) for the wood")
  litMaterial: Material
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Desk width in cm (brief default: 60)")
  @widget(new SliderWidget(30, 120, 1))
  widthCm: number = 60
  @input
  @hint("Desk depth in cm (brief default: 40)")
  @widget(new SliderWidget(20, 80, 1))
  depthCm: number = 40
  @input("vec3", "{0.66, 0.45, 0.27}")
  @hint("Wood colour (keep it mid-bright: dark colours vanish on the additive display)")
  @widget(new ColorWidget())
  woodColor: vec3 = new vec3(0.66, 0.45, 0.27)
  @ui.group_end

  onDeskPinched = new Event<vec3 | null>()

  private mat: Material
  private hovered = false

  onAwake() {
    const so = this.getSceneObject()
    const vis = global.scene.createSceneObject("DeskVisual")
    vis.setParent(so)
    vis.getTransform().setLocalPosition(new vec3(0, -1, 0))
    const rmv = vis.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = boxMesh(this.widthCm, 2, this.depthCm)
    this.mat = this.litMaterial.clone()
    rmv.mainMaterial = this.mat

    const hit = global.scene.createSceneObject("DeskSlab")
    hit.setParent(so)
    hit.getTransform().setLocalPosition(new vec3(0, -1, 0))
    const collider = hit.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = new vec3(this.widthCm, 2, this.depthCm)
    collider.shape = shape
    collider.fitVisual = false
    const interactable = hit.createComponent(Interactable.getTypeName()) as Interactable

    this.createEvent("OnStartEvent").bind(() => {
      interactable.onTriggerStart.add((e) => {
        let p: vec3 | null = null
        const info = e.interactor ? e.interactor.targetHitInfo : null
        if (info && info.hit) p = info.hit.position
        this.onDeskPinched.invoke(p)
      })
      interactable.onHoverEnter.add(() => (this.hovered = true))
      interactable.onHoverExit.add(() => (this.hovered = false))
    })
    this.createEvent("UpdateEvent").bind(() => {
      const k = this.hovered ? 1.18 : 1
      this.mat.mainPass.baseColor = new vec4(
        Math.min(1, this.woodColor.x * k),
        Math.min(1, this.woodColor.y * k),
        Math.min(1, this.woodColor.z * k),
        1,
      )
    })
  }

  /** Half extents of the desk top in local cm (x, z). */
  getHalfSize(): vec2 {
    return new vec2(this.widthCm / 2, this.depthCm / 2)
  }
}
