/**
 * CoffeeKaijuAudio — plays the provided Coffee Kaiju sounds and remembers what played.
 *
 * Owns: one AudioComponent per cue (LowLatency so cues land on the action), the bubbles
 * loop, and a log of cue names for tests (`lastSound`, `history`).
 * Expects: a parent SceneObject to hang the audio components on; a master volume.
 * Must not: decide when to play anything; the controller calls it.
 */

export type SoundName =
  | "splash_big"
  | "splash_small"
  | "bubbles_loop"
  | "bubble_pop"
  | "roar_a"
  | "roar_b"
  | "sip_ready_chime"

export class CoffeeKaijuAudio {
  private components: {[key: string]: AudioComponent} = {}
  private roarToggle = false
  lastSound = ""
  history: string[] = []

  constructor(parent: SceneObject, private volume: number) {
    const tracks: {[key: string]: AudioTrackAsset} = {
      splash_big: requireAsset("../Audio/splash_big.wav") as AudioTrackAsset,
      splash_small: requireAsset("../Audio/splash_small.wav") as AudioTrackAsset,
      bubbles_loop: requireAsset("../Audio/bubbles_loop.wav") as AudioTrackAsset,
      bubble_pop: requireAsset("../Audio/bubble_pop.wav") as AudioTrackAsset,
      roar_a: requireAsset("../Audio/roar_a.wav") as AudioTrackAsset,
      roar_b: requireAsset("../Audio/roar_b.wav") as AudioTrackAsset,
      sip_ready_chime: requireAsset("../Audio/sip_ready_chime_trim.wav") as AudioTrackAsset,
    }
    const holder = global.scene.createSceneObject("CoffeeKaijuAudio")
    holder.setParent(parent)
    for (const key in tracks) {
      const c = holder.createComponent("Component.AudioComponent") as AudioComponent
      c.audioTrack = tracks[key]
      c.playbackMode = key === "bubbles_loop" ? Audio.PlaybackMode.LowPower : Audio.PlaybackMode.LowLatency
      c.volume = key === "bubbles_loop" ? volume * 0.45 : volume
      this.components[key] = c
    }
  }

  play(name: SoundName) {
    const c = this.components[name]
    if (!c) return
    if (c.isPlaying()) c.stop(false)
    c.play(1)
    this.record(name)
  }

  /** Alternates between the two provided roars so repeats don't sound identical. */
  playRoar() {
    this.roarToggle = !this.roarToggle
    this.play(this.roarToggle ? "roar_a" : "roar_b")
  }

  startBubbles() {
    const c = this.components["bubbles_loop"]
    if (c && !c.isPlaying()) {
      c.play(-1)
      this.record("bubbles_loop")
    }
  }

  stopBubbles() {
    const c = this.components["bubbles_loop"]
    if (c && c.isPlaying()) {
      c.stop(true)
      print("[CK-SFX] stop bubbles_loop")
    }
  }

  private record(name: string) {
    // Timestamped in the Lens Studio log; the video cut lays the sounds in from these lines.
    print("[CK-SFX] " + name)
    this.lastSound = name
    this.history.push(name)
    if (this.history.length > 50) this.history.shift()
  }
}
