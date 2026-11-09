import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {flatLength, getController, note, pinch} from "./CoffeeKaijuTestUtils"

/** Extra (brief, Hands and input): pinching the desk elsewhere moves the mug; he goes with it. */
@component
export class CK6DeskMoveScenario extends Scenario {
  async run(): Promise<void> {
    const id = "extra-desk-move"
    const interactor = new DefaultLeafInteractor()
    const c = getController()
    if (c.getState() === "Waiting") await pinch(interactor, "PlaceSurface")
    const before = c.getMugWorldPosition()
    await pinch(interactor, "DeskSlab")
    await sleep(300)
    const after = c.getMugWorldPosition()
    const moved = after.sub(before).length
    note(id, `mug moved ${moved.toFixed(1)} cm; kaiju ${flatLength(c.getKaijuOffsetFromMug()).toFixed(1)} cm from mug, state ${c.getState()}`)
    expect(moved).toBeGreaterThan(5)
    if (c.getState() === "Swimming" || c.getState() === "Buddy") {
      expect(flatLength(c.getKaijuOffsetFromMug())).toBeLessThan(5)
    }
  }
}
