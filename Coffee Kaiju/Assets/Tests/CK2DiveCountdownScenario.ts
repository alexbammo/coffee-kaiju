import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {countOf, getController, note, pinch, waitFor} from "./CoffeeKaijuTestUtils"

/**
 * Done criterion 2: he cannonballs in with a splash and the ring starts counting down from
 * 0:30, and the steam fades as it runs. Pinching the ring cycles 0:30, 3, 5 and 8 minutes.
 */
@component
export class CK2DiveCountdownScenario extends Scenario {
  async run(): Promise<void> {
    const id = "c2"
    const interactor = new DefaultLeafInteractor()
    const c = getController()
    if (c.getState() === "Waiting") await pinch(interactor, "PlaceSurface")
    const splashesBefore = countOf(c.getSoundHistory(), "splash_big")

    await waitFor("dive", () => c.getState() === "Diving", 20000)
    expect(c.isRingVisible()).toBe(true)
    await waitFor("swimming", () => c.getState() === "Swimming", 5000)
    expect(countOf(c.getSoundHistory(), "splash_big")).toBe(splashesBefore + 1)
    note(id, `splash heard; countdown ${c.getCountdownLength()} s, ring "${c.getRingText()}"`)

    // Ring cycles 0:30 -> 3 -> 5 -> 8 minutes (wrapping).
    const order = [30, 180, 300, 480]
    const seen: number[] = []
    for (let i = 0; i < 4; i++) {
      const before = c.getCountdownLength()
      await pinch(interactor, "CountdownRing")
      const after = c.getCountdownLength()
      seen.push(after)
      expect(after).toBe(order[(order.indexOf(before) + 1) % order.length])
    }
    note(id, `ring pinches gave ${seen.join(", ")} s`)
    let guard = 0
    while (c.getCountdownLength() !== 30 && guard++ < 4) await pinch(interactor, "CountdownRing")
    expect(c.getCountdownLength()).toBe(30)
    expect(c.getRingText()).toBe("0:30")

    // Counts down and the steam fades with it.
    const r1 = c.getRemainingSeconds()
    const s1 = c.getSteamLevel()
    await sleep(3000)
    const r2 = c.getRemainingSeconds()
    const s2 = c.getSteamLevel()
    note(id, `after 3 s: remaining ${r1.toFixed(1)} -> ${r2.toFixed(1)}, steam ${s1.toFixed(2)} -> ${s2.toFixed(2)}, ring "${c.getRingText()}"`)
    expect(r1 - r2).toBeGreaterThan(2.5)
    expect(r1 - r2).toBeLessThan(3.6)
    expect(s2).toBeLessThan(s1 - 0.08)
    expect(c.getRingText() !== "0:30").toBe(true)
  }
}
