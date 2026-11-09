import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {Logger, LogLevel} from "Leaf.lspkg/Utils/common/Logger"
import {getController, pinch, waitFor} from "./CoffeeKaijuTestUtils"

/**
 * Not a test: drives the full demo for the submission video at real speed.
 * Prints "[CK-VIDEO] <cue>" lines; the recorder moves the preview camera on "lean-in" / "lean-out"
 * and the cut uses the cues and the [CK-SFX] lines.
 */
@component
export class CK7VideoDemoScenario extends Scenario {
  async run(): Promise<void> {
    const cue = (s: string) => print("[CK-VIDEO] " + s)
    // Keep LEAF's on-screen log out of the video.
    Logger.logLevel = LogLevel.ERROR
    const overlay = findSceneObjectByName("LeafDebugUICamera")
    if (overlay) overlay.enabled = false
    const interactor = new DefaultLeafInteractor()
    const c = getController()
    cue("start")
    // Wait for the recorder to tilt the preview camera down at the desk, then hold a beat.
    await waitFor("camera looking down", () => c.cameraObject.getTransform().back.y < -0.25, 60000)
    await sleep(2500)
    cue("place")
    await pinch(interactor, "PlaceSurface")
    await waitFor("dive", () => c.getState() === "Diving" || c.getState() === "Swimming", 60000)
    cue("dived")
    await sleep(1500)
    // Show the ring choices, ending on the 30-second demo setting.
    let guard = 0
    while (c.getCountdownLength() !== 30 && guard++ < 5) {
      await pinch(interactor, "CountdownRing")
      await sleep(900)
    }
    cue("ring-30")
    await sleep(5000)
    cue("lean-in")
    await sleep(9000)
    cue("lean-out")
    await waitFor("finish", () => c.getState() === "Finishing", 40000)
    cue("finish")
    await waitFor("buddy", () => c.getState() === "Buddy", 45000)
    cue("buddy")
    await sleep(6000)
    cue("restart")
    await pinch(interactor, "MugBody")
    await waitFor("swimming again", () => c.getState() === "Swimming", 8000)
    await sleep(4000)
    cue("end")
  }
}
