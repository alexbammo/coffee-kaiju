import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {countOf, ensureSwimmingAt30, flatLength, getController, note, waitFor} from "./CoffeeKaijuTestUtils"

/**
 * Done criterion 4: when the ring reaches zero the chime plays, he jumps out onto the desk,
 * shakes off and roars, then sits on the rim idling.
 */
@component
export class CK4FinishBuddyScenario extends Scenario {
  async run(): Promise<void> {
    const id = "c4"
    const interactor = new DefaultLeafInteractor()
    await ensureSwimmingAt30(interactor)
    const c = getController()
    const chimes = countOf(c.getSoundHistory(), "sip_ready_chime")

    await waitFor("ring reaches zero", () => c.getState() === "Finishing", 35000)
    expect(countOf(c.getSoundHistory(), "sip_ready_chime")).toBe(chimes + 1)
    expect(c.isRingVisible()).toBe(false)
    expect(c.getSteamLevel()).toBe(0)
    note(id, `zero reached: chime played, ring hidden, steam ${c.getSteamLevel()}`)

    // Out onto the desk, shake, roar.
    const anims: string[] = []
    let lowestY = 99
    let farthest = 0
    const t0 = getTime()
    while (c.getState() === "Finishing" && getTime() - t0 < 15) {
      const a = c.getKaijuAnimation()
      if (anims[anims.length - 1] !== a) anims.push(a)
      const o = c.getKaijuOffsetFromMug()
      if (o.y < lowestY && flatLength(o) > 5) lowestY = o.y
      farthest = Math.max(farthest, flatLength(o))
      await sleep(100)
    }
    const roars = countOf(c.getSoundHistory(), "roar_a") + countOf(c.getSoundHistory(), "roar_b")
    note(id, `finish anims ${anims.join(" > ")}; on desk at y=${lowestY.toFixed(1)} cm, ${farthest.toFixed(1)} cm from mug; roars ${roars}`)
    expect(anims.indexOf("Jump") >= 0).toBe(true)
    expect(anims.indexOf("Shake") > anims.indexOf("Jump")).toBe(true)
    expect(anims.indexOf("Roar") > anims.indexOf("Shake")).toBe(true)
    expect(lowestY).toBeCloseTo(0, 0)
    expect(farthest).toBeGreaterThan(5)
    expect(roars).toBeGreaterThan(0)

    // Sits on the rim idling, with the Ready tick for about 5 s.
    await waitFor("buddy on the rim", () => c.getState() === "Buddy", 5000)
    await sleep(300)
    const rim = c.getKaijuOffsetFromMug()
    note(id, `buddy: height ${rim.y.toFixed(1)} cm, anim ${c.getKaijuAnimation()}, ready tick ${c.isReadyTickVisible()}`)
    expect(rim.y).toBeCloseTo(10, 0)
    expect(c.getKaijuAnimation()).toBe("Idle")
    expect(c.isReadyTickVisible()).toBe(true)
    await sleep(5500)
    expect(c.isReadyTickVisible()).toBe(false)
    expect(c.getState()).toBe("Buddy")
  }
}
