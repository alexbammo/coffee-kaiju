import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {countOf, ensureSwimmingAt30, getController, note, pinch, waitFor} from "./CoffeeKaijuTestUtils"

/**
 * Done criterion 5: pinching the mug after that starts a new countdown and he dives back in.
 * Also checks the guard: pinching the mug while the countdown runs does nothing.
 */
@component
export class CK5MugRestartScenario extends Scenario {
  async run(): Promise<void> {
    const id = "c5"
    const interactor = new DefaultLeafInteractor()
    let c = getController()
    // Self-contained: each LEAF run restarts the preview, so get to the buddy stage first.
    if (c.getState() !== "Buddy") {
      await ensureSwimmingAt30(interactor)
      c = getController()
    }
    await waitFor("kaiju sitting on the rim", () => c.getState() === "Buddy", 50000)
    const splashes = countOf(c.getSoundHistory(), "splash_big")
    const lastLength = c.getCountdownLength()

    await pinch(interactor, "MugBody")
    expect(c.getState()).toBe("Diving")
    expect(c.getSteamLevel()).toBeCloseTo(1, 1)
    await waitFor("swimming again", () => c.getState() === "Swimming", 5000)
    expect(countOf(c.getSoundHistory(), "splash_big")).toBe(splashes + 1)
    expect(c.getCountdownLength()).toBe(lastLength)
    expect(c.isRingVisible()).toBe(true)
    note(id, `new countdown ${c.getCountdownLength()} s (last picked ${lastLength} s), ring "${c.getRingText()}"`)

    // Guard: pinching the mug mid-countdown changes nothing.
    await sleep(1500)
    const r = c.getRemainingSeconds()
    await pinch(interactor, "MugBody")
    expect(c.getState()).toBe("Swimming")
    expect(c.getRemainingSeconds()).toBeLessThan(r + 0.05)
    note(id, `mid-countdown mug pinch ignored (remaining ${c.getRemainingSeconds().toFixed(1)} s)`)
  }
}
