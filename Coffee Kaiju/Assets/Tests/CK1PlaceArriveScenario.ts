import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {flatLength, getController, note, pinch, waitFor} from "./CoffeeKaijuTestUtils"

/**
 * Done criterion 1: pinching the desk places a white mug of light coffee at real size with
 * steam rising, and the kaiju appears beside it, walks over, climbs up and stands on the rim.
 */
@component
export class CK1PlaceArriveScenario extends Scenario {
  async run(): Promise<void> {
    const id = "c1"
    const interactor = new DefaultLeafInteractor()
    await sleep(1000)
    const c = getController()
    expect(c.getState()).toBe("Waiting")
    expect(c.isMugVisible()).toBe(false)

    await pinch(interactor, "PlaceSurface")
    await sleep(400)
    expect(c.isMugVisible()).toBe(true)
    expect(c.getSteamLevel()).toBeGreaterThan(0.9)

    // Real size: the mug body is about 9 cm wide and 10 cm tall.
    await sleep(600)
    const outer = findSceneObjectByName("MugOuter").getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    const size = outer.worldAabbMax().sub(outer.worldAabbMin())
    note(id, `mug AABB ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)} cm`)
    expect(size.y).toBeCloseTo(10, 0)
    expect(Math.max(size.x, size.z)).toBeGreaterThan(8.5)
    expect(Math.max(size.x, size.z)).toBeLessThan(14)

    // Steam puffs are visible above the mug.
    let steamVisible = false
    for (let i = 0; i < 7; i++) {
      const so = findSceneObjectByName("Steam" + i)
      if (so && so.isEnabledInHierarchy) steamVisible = true
    }
    expect(steamVisible).toBe(true)

    // The kaiju appears beside the mug (about 25 cm to the side).
    const start = c.getKaijuOffsetFromMug()
    note(id, `kaiju lands ${flatLength(start).toFixed(1)} cm from the mug, state ${c.getState()}`)
    expect(c.getState()).toBe("Arriving")
    expect(flatLength(start)).toBeGreaterThan(15)

    // Walks over.
    await waitFor("walking", () => c.getKaijuAnimation() === "Walk", 3000)
    // Owner, 9 Nov: he leaps onto the rim instead of climbing.
    await waitFor("leaping", () => c.getKaijuAnimation() === "Jump", 8000)
    const atWall = flatLength(c.getKaijuOffsetFromMug())
    note(id, `leaps for the rim from ${atWall.toFixed(1)} cm from the mug centre`)
    expect(atWall).toBeLessThan(11)

    // Stands on the rim.
    await waitFor("on the rim", () => c.getState() === "OnRim", 8000)
    await sleep(300)
    const rim = c.getKaijuOffsetFromMug()
    note(id, `on rim: height ${rim.y.toFixed(1)} cm, ${flatLength(rim).toFixed(1)} cm from centre`)
    expect(rim.y).toBeCloseTo(10, 0)
    expect(flatLength(rim)).toBeLessThan(5)
    expect(flatLength(rim)).toBeGreaterThan(3.5)
  }
}
