import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {CoffeeKaijuAudio} from "./CoffeeKaijuAudio"
import {CoffeeKaijuDeskUI} from "./CoffeeKaijuDeskUI"
import {CoffeeKaijuMugFX, MUG} from "./CoffeeKaijuMugFX"
import {CoffeeKaijuReadyTickUI} from "./CoffeeKaijuReadyTickUI"
import {CoffeeKaijuRingUI} from "./CoffeeKaijuRingUI"

/**
 * CoffeeKaijuController — the Coffee Kaiju state machine (main orchestrator).
 *
 * Owns: the experience state (Waiting → Arriving → OnRim → Diving → Swimming → Finishing →
 * Buddy → Clearing → Cleared), the countdown and the chosen length, the mug's place on the
 * desk, the kaiju's motion and animation, foam opacity by camera distance, ring dimming,
 * and when each sound plays. Exposes read-only getters for LEAF tests.
 * Expects (all wired in the Inspector): camera, PlaceSurface, desk, mug, ring, ready tick,
 * kaiju root and kaiju model (with its AnimationPlayer).
 * Must not: build visuals (MugFX / DeskUI / RingUI / ReadyTickUI do) or show text itself.
 */

export type KaijuState =
  | "Waiting"
  | "Arriving"
  | "OnRim"
  | "Diving"
  | "Swimming"
  | "Finishing"
  | "Buddy"
  | "Clearing"
  | "Cleared"

/** Kaiju scale while inside the mug, so his tail stays inside a 8 cm pool. */
const SWIM_SCALE = 0.6
/** How far from the mug wall (cm) he stops walking and leaps for the rim. */
const LEAP_RUNUP = 5

/** Countdown lengths the ring cycles through, in seconds (brief: 0:30 demo, 3, 5, 8 minutes). */
export const DURATIONS = [30, 180, 300, 480]

type Step = {
  name: string
  dur: number
  state?: KaijuState
  anim?: string
  animSpeed?: number
  loop?: boolean
  start?: () => void
  update?: (t: number) => void
  end?: () => void
}

@component
export class CoffeeKaijuController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">CoffeeKaijuController – mug timer kaiju state machine</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("The world camera (Camera Object)")
  cameraObject: SceneObject
  @input
  @hint("Invisible desk-height surface that catches the first pinch")
  placeSurface: SceneObject
  @input
  @hint("Desk slab stand-in (CoffeeKaijuDeskUI on DeskStandIn)")
  desk: CoffeeKaijuDeskUI
  @input
  @hint("Virtual mug and its effects (CoffeeKaijuMugFX on Mug)")
  mug: CoffeeKaijuMugFX
  @input
  @hint("Countdown ring view (CoffeeKaijuRingUI on CountdownRing)")
  ring: CoffeeKaijuRingUI
  @input
  @hint("Ready tick view (CoffeeKaijuReadyTickUI on ReadyTick)")
  readyTick: CoffeeKaijuReadyTickUI
  @input
  @hint("Kaiju root moved by this script (child of DeskStandIn)")
  kaijuRoot: SceneObject
  @input
  @hint("The imported CoffeeKaiju model that holds the AnimationPlayer")
  kaijuModel: SceneObject
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Countdown length used until the user picks another on the ring")
  @widget(new ComboBoxWidget([new ComboBoxItem("0:30 (demo)", 0), new ComboBoxItem("3 min", 1), new ComboBoxItem("5 min", 2), new ComboBoxItem("8 min", 3)]))
  startDurationIndex: number = 2
  @input
  @hint("Camera distance (cm) at which the foam starts to fade")
  @widget(new SliderWidget(30, 100, 1))
  foamFadeStartCm: number = 50
  @input
  @hint("Camera distance (cm) at which the foam is fully clear")
  @widget(new SliderWidget(20, 90, 1))
  foamClearCm: number = 40
  @input
  @hint("Ring dims when the mug is more than this many degrees from the centre of view")
  @widget(new SliderWidget(5, 45, 1))
  ringDimAngleDeg: number = 15
  @input
  @hint("Seconds the kaiju sits on the rim before waving off and the Lens clears")
  @widget(new SliderWidget(10, 300, 5))
  buddySeconds: number = 120
  @input
  @hint("Seconds the Ready tick stays up")
  @widget(new SliderWidget(1, 15, 0.5))
  readyTickSeconds: number = 5
  @input
  @hint("Volume of all sounds")
  @widget(new SliderWidget(0, 1, 0.05))
  volume: number = 1
  @ui.group_end

  private state: KaijuState = "Waiting"
  private durationIndex = 2
  private countdownLength = 300
  private remaining = 300
  private steamLevel = 0
  private foamOpacity = 1
  private ringAlpha = 1
  private anim = ""
  private audio: CoffeeKaijuAudio
  private animPlayer: AnimationPlayer

  private mugPos = new vec3(12, 0, 0)
  private kPos = vec3.zero()
  private kYaw = 0
  private kPitch = 0
  private kScale = 1
  private kScaleTarget = 1

  private steps: Step[] = []
  private stepIndex = 0
  private stepTime = 0
  private onSequenceDone: (() => void) | null = null

  // Swimming.
  private swimTime = 0
  private swimTheta = 0
  private swimPhaseStart = 0
  private frozenXZ = new vec2(1.9, 0)
  private rippleTimer = 3
  private bubbleTimer = 0
  private popTimer = 7
  private surfaceBoost = 0

  // Buddy.
  private buddyTime = 0
  private lookTimer = 6
  private lookYaw = 0
  private lookYawTarget = 0
  private placeSurfaceOffAt = -1

  onAwake() {
    this.durationIndex = Math.max(0, Math.min(DURATIONS.length - 1, Math.round(this.startDurationIndex)))
    this.countdownLength = DURATIONS[this.durationIndex]
    this.remaining = this.countdownLength
    const missing: string[] = []
    if (!this.cameraObject) missing.push("cameraObject")
    if (!this.placeSurface) missing.push("placeSurface")
    if (!this.desk) missing.push("desk")
    if (!this.mug) missing.push("mug")
    if (!this.ring) missing.push("ring")
    if (!this.readyTick) missing.push("readyTick")
    if (!this.kaijuRoot) missing.push("kaijuRoot")
    if (!this.kaijuModel) missing.push("kaijuModel")
    if (missing.length > 0) {
      print("[CoffeeKaiju] ERROR missing inputs: " + missing.join(", "))
      return
    }
    this.audio = new CoffeeKaijuAudio(this.getSceneObject(), this.volume)
    this.animPlayer = this.kaijuModel.getComponent("Component.AnimationPlayer") as AnimationPlayer

    // Placement surface: big invisible box at desk height that follows the head until placed.
    const col = this.placeSurface.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = new vec3(160, 1, 160)
    col.shape = shape
    col.fitVisual = false
    const placeInteractable = this.placeSurface.createComponent(Interactable.getTypeName()) as Interactable

    this.createEvent("OnStartEvent").bind(() => {
      placeInteractable.onTriggerStart.add((e) => {
        const info = e.interactor ? e.interactor.targetHitInfo : null
        this.onPlacePinch(info && info.hit ? info.hit.position : null)
      })
      this.desk.onDeskPinched.add((p) => this.onDeskPinch(p))
      this.mug.onMugPinched.add(() => this.onMugPinch())
      this.ring.onRingPinched.add(() => this.onRingPinch())
      this.ring.setCamera(this.cameraObject)
      this.readyTick.setCamera(this.cameraObject)
      this.mug.setCamera(this.cameraObject)
      this.resetToWaiting()
      print("[CoffeeKaiju] ready: pinch in front of you to place the mug")
    })
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  // ---------- Public read-only API (used by LEAF tests) ----------

  getState(): KaijuState {
    return this.state
  }
  /** Countdown length in seconds of the current (or next) countdown. */
  getCountdownLength(): number {
    return this.countdownLength
  }
  getRemainingSeconds(): number {
    return this.remaining
  }
  getSteamLevel(): number {
    return this.steamLevel
  }
  getFoamOpacity(): number {
    return this.foamOpacity
  }
  getRingAlpha(): number {
    return this.ring.getAlpha()
  }
  isRingVisible(): boolean {
    return this.ring.isShowing()
  }
  getRingText(): string {
    return this.ring.getTimeText()
  }
  isReadyTickVisible(): boolean {
    return this.readyTick.isShowing()
  }
  isMugVisible(): boolean {
    return this.state !== "Waiting" && this.state !== "Cleared"
  }
  /** Kaiju position relative to the mug base centre, in cm (y up). */
  getKaijuOffsetFromMug(): vec3 {
    return this.kPos.sub(this.mugPos)
  }
  getKaijuWorldPosition(): vec3 {
    return this.kaijuRoot.getTransform().getWorldPosition()
  }
  getMugWorldPosition(): vec3 {
    return this.mug.getSceneObject().getTransform().getWorldPosition()
  }
  getKaijuAnimation(): string {
    return this.anim
  }
  getLastSound(): string {
    return this.audio ? this.audio.lastSound : ""
  }
  getSoundHistory(): string[] {
    return this.audio ? this.audio.history.slice() : []
  }

  // ---------- Input ----------

  private onPlacePinch(hit: vec3 | null) {
    if (this.state !== "Waiting") return
    const cam = this.cameraObject.getTransform()
    const look = this.flatLook()
    const right = vec3.up().cross(look).uniformScale(-1).normalize()
    let mugWorld = cam.getWorldPosition().add(look.uniformScale(65)).add(right.uniformScale(12)).add(new vec3(0, -35, 0))
    if (hit) {
      const flat = new vec3(hit.x - cam.getWorldPosition().x, 0, hit.z - cam.getWorldPosition().z)
      if (flat.length > 30 && flat.length < 110) mugWorld = hit
    }
    // Desk faces the user; mug sits 12 cm right of the desk centre.
    const deskT = this.desk.getSceneObject().getTransform()
    deskT.setWorldRotation(quat.angleAxis(Math.atan2(-look.x, -look.z), vec3.up()))
    deskT.setWorldPosition(mugWorld.sub(right.uniformScale(12)))
    this.desk.getSceneObject().enabled = true
    this.mugPos = new vec3(12, 0, 0)
    this.applyMugPos()
    this.mug.setShown(true)
    this.steamLevel = 1
    this.placeSurfaceOffAt = getTime() + 0.5
    print("[CoffeeKaiju] placed mug at " + mugWorld.toString() + ", camera at " + cam.getWorldPosition().toString())
    this.startArrival(true)
  }

  private onDeskPinch(hit: vec3 | null) {
    const target = this.deskPointFor(hit)
    if (this.state === "Cleared") {
      this.mugPos = target
      this.applyMugPos()
      this.mug.setShown(true)
      this.startNewCountdownFromDesk()
      return
    }
    if (this.state === "Waiting" || this.state === "Clearing") return
    this.mugPos = target
    this.applyMugPos()
    if (this.state === "Arriving") this.startArrival(false)
  }

  private onMugPinch() {
    if (this.state === "Buddy") {
      this.readyTick.hide()
      this.steamLevel = 1
      this.runSequence(this.diveSteps(), () => this.startSwimming())
    } else if (this.state === "Finishing") {
      // Already out of the mug: hop back up, then dive.
      this.steamLevel = 1
      this.ring.hide()
      this.runSequence([this.hopToRimStep(), ...this.diveSteps()], () => this.startSwimming())
    }
    // Waiting / arriving / countdown running: pinching the mug does nothing.
  }

  private onRingPinch() {
    if (!this.ring.isShowing()) return
    this.durationIndex = (this.durationIndex + 1) % DURATIONS.length
    this.countdownLength = DURATIONS[this.durationIndex]
    this.remaining = this.countdownLength
    this.steamLevel = 1
    print("[CoffeeKaiju] countdown length " + this.formatTime(this.countdownLength))
  }

  // ---------- Sequences ----------

  private resetToWaiting() {
    this.setState("Waiting")
    this.desk.getSceneObject().enabled = false
    this.mug.setShown(false, true)
    this.ring.hide()
    this.readyTick.hide()
    this.kaijuRoot.enabled = false
    this.placeSurface.enabled = true
    this.steamLevel = 0
  }

  /** Hop down beside the mug (first time only), walk over, climb, stand on the rim, then dive. */
  private startArrival(withHop: boolean) {
    const half = this.desk.getHalfSize()
    const sideSign = this.mugPos.x - 25 >= -half.x + 3 ? -1 : 1
    const land = new vec3(this.mugPos.x + sideSign * 25, 0, this.mugPos.z)
    const steps: Step[] = []
    if (withHop) {
      this.kPos = land.add(new vec3(sideSign * 4, 7, 0))
      this.kaijuRoot.enabled = true
      this.kScale = this.kScaleTarget = 1
      const from = this.kPos
      steps.push({
        name: "hop-in",
        dur: 0.8,
        state: "Arriving",
        anim: "Jump",
        animSpeed: 1.6,
        update: (t) => {
          this.kPos = this.arc(from, land, 3, t)
          this.kYaw = this.yawTo(this.mugPos.sub(land))
        },
      })
    }
    const start = withHop ? land : this.kPos
    let from = start
    const approach = () => {
      const d = new vec3(from.x - this.mugPos.x, 0, from.z - this.mugPos.z)
      const dir = d.length > 0.01 ? d.normalize() : new vec3(sideSign, 0, 0)
      return this.mugPos.add(dir.uniformScale(MUG.outerR + LEAP_RUNUP))
    }
    const walkDist = Math.max(1, approach().sub(start).length)
    steps.push({
      name: "walk",
      dur: walkDist / 8,
      state: "Arriving",
      anim: "Walk",
      animSpeed: 1.3,
      loop: true,
      start: () => (from = this.kPos),
      update: (t) => {
        const to = approach()
        this.kPos = vec3.lerp(from, to, t)
        this.kYaw = this.yawTo(to.sub(from))
      },
    })
    const radial = () => {
      const d = new vec3(this.kPos.x - this.mugPos.x, 0, this.kPos.z - this.mugPos.z)
      return d.length > 0.01 ? d.normalize() : new vec3(sideSign, 0, 0)
    }
    // Owner, 9 Nov: the climb read as sliding; he leaps onto the rim instead.
    let dir = new vec3(sideSign, 0, 0)
    let leapFrom = vec3.zero()
    steps.push({
      name: "leap-to-rim",
      dur: 1.5,
      state: "Arriving",
      anim: "Jump",
      animSpeed: 1.5,
      start: () => {
        dir = radial()
        leapFrom = this.kPos.sub(this.mugPos)
      },
      update: (t) => {
        const rim = dir.uniformScale(MUG.innerR + 0.2).add(new vec3(0, MUG.height, 0))
        // Crouch for the first fifth, fly in a high arc, then land on the rim.
        const a = Math.max(0, Math.min(1, (t - 0.2) / 0.65))
        const e = a * a * (3 - 2 * a)
        this.kPos = this.mugPos.add(this.arc(leapFrom, rim, 9, e))
        this.kYaw = this.yawTo(dir.uniformScale(-1))
      },
    })
    steps.push(this.onRimStep(() => dir, 1.4))
    this.runSequence([...steps, ...this.diveSteps()], () => this.startSwimming())
  }

  private onRimStep(dirFn: () => vec3, dur: number): Step {
    let yaw0 = 0
    return {
      name: "on-rim",
      dur,
      state: "OnRim",
      anim: "Idle",
      loop: true,
      start: () => (yaw0 = this.kYaw),
      update: (t) => {
        const d = dirFn()
        this.kPos = this.mugPos.add(d.uniformScale(MUG.innerR + 0.2)).add(new vec3(0, MUG.height, 0))
        this.kYaw = yaw0 + this.angleDiff(0, yaw0) * Math.min(1, t * 1.6)
      },
    }
  }

  /** Cannonball into the pool with a big splash. */
  private diveSteps(): Step[] {
    let from = vec3.zero()
    let splashed = false
    return [
      {
        name: "dive",
        dur: 1.1,
        state: "Diving",
        anim: "Jump",
        animSpeed: 1.5,
        start: () => {
          from = this.kPos.sub(this.mugPos)
          splashed = false
          this.remaining = this.countdownLength
          this.ring.show()
          this.updateRing()
        },
        update: (t) => {
          const to = new vec3(0, 5.5, 0)
          const p = this.arc(from, to, 4.5, t)
          this.kPos = this.mugPos.add(p)
          this.kYaw = this.yawTo(to.sub(from))
          this.kScaleTarget = t > 0.6 ? SWIM_SCALE : 1
          if (!splashed && t > 0.55 && p.y < MUG.foamY) {
            splashed = true
            this.audio.play("splash_big")
            this.mug.spawnRipple(0, 0)
            for (let i = 0; i < 8; i++) this.mug.spawnBubble(new vec3((Math.random() - 0.5) * 3, 3 + Math.random() * 3, (Math.random() - 0.5) * 3))
          }
        },
      },
    ]
  }

  private hopToRimStep(): Step {
    let from = vec3.zero()
    let dir = new vec3(-1, 0, 0)
    return {
      name: "hop-to-rim",
      dur: 0.9,
      anim: "Jump",
      animSpeed: 1.7,
      start: () => {
        from = this.kPos.sub(this.mugPos)
        const d = new vec3(from.x, 0, from.z)
        dir = d.length > 0.01 ? d.normalize() : new vec3(-1, 0, 0)
        this.kScaleTarget = 1
      },
      update: (t) => {
        const to = dir.uniformScale(MUG.innerR + 0.2).add(new vec3(0, MUG.height, 0))
        this.kPos = this.mugPos.add(this.arc(from, to, 5, t))
        this.kYaw = this.yawTo(to.sub(from))
        this.lastRimDir = dir
      },
    }
  }

  private lastRimDir = new vec3(0, 0, 1)

  private startNewCountdownFromDesk() {
    // After the Lens cleared: the kaiju hops back onto the rim and dives in again.
    this.steamLevel = 1
    this.kaijuRoot.enabled = true
    this.kScale = this.kScaleTarget = 1
    const half = this.desk.getHalfSize()
    const sideSign = this.mugPos.x - 10 >= -half.x ? -1 : 1
    this.kPos = this.mugPos.add(new vec3(sideSign * 9, 0, 2))
    this.runSequence(
      [this.hopToRimStep(), this.onRimStep(() => this.lastRimDir, 0.6), ...this.diveSteps()],
      () => this.startSwimming(),
    )
  }

  private startSwimming() {
    this.setState("Swimming")
    this.remaining = this.countdownLength
    this.swimTime = 0
    this.swimPhaseStart = 0
    const off = this.kPos.sub(this.mugPos)
    this.swimTheta = Math.atan2(off.z, off.x)
    this.rippleTimer = 2 + Math.random() * 2
    this.kScaleTarget = SWIM_SCALE
    this.playAnim("Swim", 1.1, true)
    this.audio.startBubbles()
    this.ring.show()
  }

  private startFinishing() {
    this.audio.stopBubbles()
    this.audio.play("sip_ready_chime")
    this.ring.hide()
    this.steamLevel = 0
    this.remaining = 0
    const half = this.desk.getHalfSize()
    const sideSign = this.mugPos.x - 10 >= -half.x ? -1 : 1
    let from = vec3.zero()
    let splashed = false
    const landOff = new vec3(sideSign * 9, 0, 2.5)
    this.runSequence(
      [
        {
          name: "burst-out",
          dur: 1.2,
          state: "Finishing",
          anim: "Jump",
          animSpeed: 1.4,
          start: () => (from = this.kPos.sub(this.mugPos)),
          update: (t) => {
            this.kPos = this.mugPos.add(this.arc(from, landOff, 9, t))
            this.kYaw = this.yawTo(landOff.sub(from))
            this.kScaleTarget = t > 0.3 ? 1 : SWIM_SCALE
            if (!splashed && t > 0.15) {
              splashed = true
              this.audio.play("splash_small")
              this.mug.spawnRipple(0, 0)
            }
          },
        },
        {
          name: "shake",
          dur: 4.0,
          state: "Finishing",
          anim: "Shake",
          animSpeed: 1.45,
          update: (t) => {
            this.kPos = this.mugPos.add(landOff)
            this.kYaw = this.kYaw + this.angleDiff(0, this.kYaw) * Math.min(1, t * 3)
          },
        },
        {
          name: "roar",
          dur: 4.0,
          state: "Finishing",
          anim: "Roar",
          animSpeed: 1.35,
          start: () => this.audio.playRoar(),
          update: () => {
            this.kPos = this.mugPos.add(landOff)
            this.kYaw = 0
          },
        },
        this.hopToRimStep(),
      ],
      () => this.startBuddy(),
    )
  }

  private startBuddy() {
    this.setState("Buddy")
    this.buddyTime = 0
    this.lookTimer = 5 + Math.random() * 4
    this.lookYaw = this.lookYawTarget = 0
    this.playAnim("Idle", 0.8, true)
    this.readyTick.showFor(this.readyTickSeconds)
  }

  private startClearing() {
    let from = vec3.zero()
    let splashed = false
    this.readyTick.hide()
    this.runSequence(
      [
        {
          name: "wave-off",
          dur: 1.6,
          state: "Clearing",
          anim: "Roar",
          animSpeed: 2.2,
          update: () => (this.kYaw = 0),
        },
        {
          name: "dive-away",
          dur: 1.0,
          state: "Clearing",
          anim: "Jump",
          animSpeed: 1.6,
          start: () => (from = this.kPos.sub(this.mugPos)),
          update: (t) => {
            const to = new vec3(0, 4, 0)
            this.kPos = this.mugPos.add(this.arc(from, to, 3, t))
            this.kScaleTarget = SWIM_SCALE
            if (!splashed && t > 0.5) {
              splashed = true
              this.audio.play("splash_small")
              this.mug.spawnRipple(0, 0)
            }
          },
        },
        {
          name: "fade",
          dur: 0.8,
          state: "Clearing",
          start: () => this.mug.setShown(false),
          update: (t) => (this.kScaleTarget = SWIM_SCALE * (1 - t)),
        },
      ],
      () => {
        this.kaijuRoot.enabled = false
        this.steamLevel = 0
        this.setState("Cleared")
        print("[CoffeeKaiju] cleared: pinch the desk to start again")
      },
    )
  }

  private runSequence(steps: Step[], done: () => void) {
    this.steps = steps
    this.stepIndex = -1
    this.onSequenceDone = done
    this.nextStep()
  }

  private nextStep() {
    const prev = this.steps[this.stepIndex]
    if (prev && prev.end) prev.end()
    this.stepIndex++
    this.stepTime = 0
    const s = this.steps[this.stepIndex]
    if (!s) {
      const done = this.onSequenceDone
      this.steps = []
      this.onSequenceDone = null
      if (done) done()
      return
    }
    if (s.state) this.setState(s.state)
    if (s.anim) this.playAnim(s.anim, s.animSpeed ?? 1, s.loop ?? false)
    if (s.start) s.start()
  }

  // ---------- Per-frame ----------

  private onUpdate() {
    if (!this.audio) return
    // Real elapsed time (capped only for long stalls), so motion keeps pace with the
    // animations when the preview drops frames. A 0.1 s cap made him slide in slow motion.
    const dt = Math.min(0.5, getDeltaTime())

    if (this.state === "Waiting") this.followHeadWithPlaceSurface()
    if (this.placeSurfaceOffAt > 0 && getTime() >= this.placeSurfaceOffAt) {
      this.placeSurfaceOffAt = -1
      this.placeSurface.enabled = false
    }

    // Timed sequence.
    if (this.steps.length > 0) {
      const s = this.steps[this.stepIndex]
      this.stepTime += dt
      const t = Math.min(1, this.stepTime / s.dur)
      if (s.update) s.update(t)
      if (t >= 1) this.nextStep()
    }

    if (this.state === "Swimming") this.updateSwimming(dt)
    if (this.state === "Buddy") this.updateBuddy(dt)

    // Countdown visuals.
    if (this.state === "Swimming" || this.state === "Diving") this.updateRing()
    this.mug.setSteamLevel(this.steamLevel)
    this.mug.setPinchEnabled(this.state === "Buddy" || this.state === "Finishing")

    // Foam frosts over from normal distance, clears when you lean in.
    if (this.isMugVisible()) {
      const top = this.mug.getSceneObject().getTransform().getWorldTransform().multiplyPoint(new vec3(0, MUG.foamY, 0))
      const d = this.cameraObject.getTransform().getWorldPosition().distance(top)
      const span = Math.max(1, this.foamFadeStartCm - this.foamClearCm)
      this.foamOpacity = Math.max(0, Math.min(1, (d - this.foamClearCm) / span))
      this.mug.setFoamOpacity(this.foamOpacity)

      const cam = this.cameraObject.getTransform()
      const look = cam.forward.uniformScale(-1)
      const toMug = top.sub(cam.getWorldPosition()).normalize()
      const angle = Math.acos(Math.max(-1, Math.min(1, look.dot(toMug)))) * (180 / Math.PI)
      const targetAlpha = angle > this.ringDimAngleDeg ? 0.3 : 1
      this.ringAlpha += (targetAlpha - this.ringAlpha) * Math.min(1, dt * 6)
      this.ring.setDim(this.ringAlpha)
    }

    // Apply kaiju transform (desk-local).
    this.kScale += (this.kScaleTarget - this.kScale) * Math.min(1, dt * 6)
    const kt = this.kaijuRoot.getTransform()
    kt.setLocalPosition(this.kPos)
    const rot = quat.angleAxis(this.kYaw + this.lookYaw, vec3.up()).multiply(quat.angleAxis(this.kPitch, vec3.right()))
    kt.setLocalRotation(rot)
    const s = Math.max(0.001, this.kScale)
    kt.setLocalScale(new vec3(s, s, s))
  }

  private updateRing() {
    this.ring.setProgress(this.countdownLength > 0 ? this.remaining / this.countdownLength : 0)
    this.ring.setTimeText(this.formatTime(this.remaining))
  }

  private updateSwimming(dt: number) {
    // The countdown follows real time even when frames are slow; motion uses the clamped dt.
    this.remaining = Math.max(0, this.remaining - getDeltaTime())
    this.steamLevel = this.countdownLength > 0 ? this.remaining / this.countdownLength : 0
    if (this.remaining <= 0) {
      this.kPitch = 0
      this.startFinishing()
      return
    }
    this.swimTime += dt
    const cycle = 14
    const u = (this.swimTime - this.swimPhaseStart) % cycle
    const r = 1.4
    const lapY = 6.0
    let pos: vec3
    let yaw = this.kYaw
    let pitch = 0
    let anim = "Swim"
    let animSpeed = 1.1
    this.surfaceBoost = Math.max(0, this.surfaceBoost - dt * 0.9)

    if (u < 9) {
      // Lengths round the inside of the mug; the fin breaks the foam now and then.
      this.swimTheta += dt * ((Math.PI * 2) / 4.5)
      const x = Math.cos(this.swimTheta) * r
      const z = Math.sin(this.swimTheta) * r
      this.frozenXZ = new vec2(x, z)
      const y = lapY + 1.4 * Math.sin(Math.min(1, this.surfaceBoost) * Math.PI * 0.5) + Math.min(1, u) * 0
      pos = new vec3(x, y, z)
      // Tangent of a counter-clockwise circle (seen from above).
      yaw = this.yawTo(new vec3(-Math.sin(this.swimTheta), 0, Math.cos(this.swimTheta)))
    } else if (u < 10.5) {
      // A loop: a vertical circle along the swim direction.
      const k = (u - 9) / 1.5
      const tangent = new vec3(-Math.sin(this.swimTheta), 0, Math.cos(this.swimTheta))
      const a = k * Math.PI * 2
      const base = new vec3(this.frozenXZ.x, lapY, this.frozenXZ.y)
      pos = base.add(tangent.uniformScale(Math.sin(a) * 1.1)).add(new vec3(0, (1 - Math.cos(a)) * -1.1, 0))
      pitch = a
      animSpeed = 1.6
    } else if (u < 12) {
      // Sink to the bottom.
      const k = (u - 10.5) / 1.5
      const e = k * k * (3 - 2 * k)
      pos = new vec3(this.frozenXZ.x * 0.5, lapY + (MUG.floorY + 1.0 - lapY) * e, this.frozenXZ.y * 0.5)
      anim = "Tread"
      animSpeed = 0.7
    } else if (u < 12.8) {
      // Kick back up.
      const k = (u - 12) / 0.8
      pos = new vec3(this.frozenXZ.x * 0.5, MUG.floorY + 1.0 + (7.2 - MUG.floorY - 1.0) * k, this.frozenXZ.y * 0.5)
      animSpeed = 2.0
    } else {
      // Tread water near the surface, then ease back into lengths.
      const k = (u - 12.8) / 1.2
      pos = new vec3(this.frozenXZ.x * (0.5 + 0.5 * k), 7.2 + (lapY - 7.2) * k, this.frozenXZ.y * (0.5 + 0.5 * k))
      anim = "Tread"
      animSpeed = 1.0
    }
    if (this.anim !== anim) this.playAnim(anim, animSpeed, true)
    this.kPos = this.mugPos.add(pos)
    this.kYaw = yaw
    this.kPitch = pitch

    // Fin ripple every 3–5 s; bubble trail; the odd bubble pop.
    this.rippleTimer -= dt
    if (this.rippleTimer <= 0) {
      this.rippleTimer = 3 + Math.random() * 2
      this.surfaceBoost = 1.4
      this.mug.spawnRipple(pos.x, pos.z)
    }
    this.bubbleTimer -= dt
    if (this.bubbleTimer <= 0) {
      this.bubbleTimer = 0.3 + Math.random() * 0.25
      this.mug.spawnBubble(pos.add(new vec3((Math.random() - 0.5) * 0.8, 0.3, (Math.random() - 0.5) * 0.8)))
    }
    this.popTimer -= dt
    if (this.popTimer <= 0) {
      this.popTimer = 6 + Math.random() * 5
      this.audio.play("bubble_pop")
    }
  }

  private updateBuddy(dt: number) {
    this.buddyTime += dt
    // Sit on the rim facing the user, tail over the side; the odd look around.
    this.kPos = this.mugPos.add(this.lastRimDir.uniformScale(MUG.innerR + 0.2)).add(new vec3(0, MUG.height, 0))
    this.kYaw = 0
    this.lookTimer -= dt
    if (this.lookTimer <= 0) {
      this.lookTimer = 5 + Math.random() * 5
      this.lookYawTarget = this.lookYawTarget === 0 ? (Math.random() < 0.5 ? -0.5 : 0.5) : 0
    }
    this.lookYaw += (this.lookYawTarget - this.lookYaw) * Math.min(1, dt * 2)
    if (this.buddyTime >= this.buddySeconds) {
      this.lookYaw = this.lookYawTarget = 0
      this.startClearing()
    }
  }

  private followHeadWithPlaceSurface() {
    const cam = this.cameraObject.getTransform()
    const look = this.flatLook()
    const t = this.placeSurface.getTransform()
    t.setWorldPosition(cam.getWorldPosition().add(look.uniformScale(70)).add(new vec3(0, -36, 0)))
    t.setWorldRotation(quat.angleAxis(Math.atan2(-look.x, -look.z), vec3.up()))
  }

  // ---------- Helpers ----------

  private setState(s: KaijuState) {
    if (this.state !== s) print("[CoffeeKaiju] state " + this.state + " -> " + s)
    this.state = s
  }

  private playAnim(name: string, speed: number, loop: boolean) {
    this.anim = name
    if (!this.animPlayer) return
    const full = "Kaiju|" + name
    const all = this.animPlayer.getActiveClips().concat(this.animPlayer.getInactiveClips())
    for (const c of all) {
      if (c !== full) {
        this.animPlayer.stopClip(c)
        this.animPlayer.setClipEnabled(c, false)
      }
    }
    const clip = this.animPlayer.getClip(full)
    if (!clip) return
    this.animPlayer.setClipEnabled(full, true)
    clip.playbackMode = loop ? PlaybackMode.Loop : PlaybackMode.Single
    clip.playbackSpeed = speed
    this.animPlayer.playClipAt(full, 0)
  }

  private applyMugPos() {
    this.mug.getSceneObject().getTransform().setLocalPosition(this.mugPos)
  }

  /** Converts a world hit point to a clamped desk-local spot for the mug. */
  private deskPointFor(hit: vec3 | null): vec3 {
    const half = this.desk.getHalfSize()
    let p: vec3
    if (hit) {
      p = this.desk.getSceneObject().getTransform().getInvertedWorldTransform().multiplyPoint(hit)
    } else {
      // No hit point (e.g. a scripted trigger): move the mug to the other side of the desk.
      p = new vec3(this.mugPos.x > 0 ? -12 : 12, 0, 0)
    }
    const mx = half.x - MUG.outerR - 2
    const mz = half.y - MUG.outerR - 2
    return new vec3(Math.max(-mx, Math.min(mx, p.x)), 0, Math.max(-mz, Math.min(mz, p.z)))
  }

  private flatLook(): vec3 {
    const f = this.cameraObject.getTransform().forward.uniformScale(-1)
    const flat = new vec3(f.x, 0, f.z)
    return flat.length > 0.01 ? flat.normalize() : new vec3(0, 0, -1)
  }

  private arc(a: vec3, b: vec3, peak: number, t: number): vec3 {
    return vec3.lerp(a, b, t).add(new vec3(0, peak * 4 * t * (1 - t), 0))
  }

  /** Yaw (radians) that turns the model's +Z towards a desk-local direction. */
  private yawTo(dir: vec3): number {
    if (Math.abs(dir.x) + Math.abs(dir.z) < 0.0001) return this.kYaw
    return Math.atan2(dir.x, dir.z)
  }

  private angleDiff(target: number, current: number): number {
    let d = target - current
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    return d
  }

  private formatTime(sec: number): string {
    const s = Math.ceil(sec)
    const m = Math.floor(s / 60)
    const r = s % 60
    return m + ":" + (r < 10 ? "0" : "") + r
  }
}
