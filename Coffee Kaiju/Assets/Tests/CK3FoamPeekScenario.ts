import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {anyEnabled, ensureSwimmingAt30, flatLength, note} from "./CoffeeKaijuTestUtils"

/**
 * Done criterion 3: from normal distance there is foam with ripples and his glowing fin.
 * Within about 50 cm the foam fades and he is visibly swimming laps inside; moving back
 * frosts it over again.
 *
 * LEAF cannot drive the preview camera (it is device-tracked), so the lean-in is simulated
 * by moving the desk stand-in towards the camera along the line of sight. That gives the same
 * camera-to-mug distance, which is the only input the foam logic uses.
 */
@component
export class CK3FoamPeekScenario extends Scenario {
  async run(): Promise<void> {
    const id = "c3"
    const interactor = new DefaultLeafInteractor()
    const c = await ensureSwimmingAt30(interactor)
    await sleep(300)

    // Normal distance: frosted foam, ripples from the fin, bubbles.
    const camT = findSceneObjectByName("Camera Object").getTransform()
    const mugTop = () => c.getMugWorldPosition().add(new vec3(0, 8.75, 0))
    const d0 = camT.getWorldPosition().distance(mugTop())
    note(id, `normal distance ${d0.toFixed(1)} cm, foam ${c.getFoamOpacity().toFixed(2)}`)
    expect(d0).toBeGreaterThan(50)
    expect(c.getFoamOpacity()).toBeCloseTo(1, 1)
    let ripple = false
    let bubble = false
    const t0 = getTime()
    while (getTime() - t0 < 6.5 && !(ripple && bubble)) {
      ripple = ripple || anyEnabled("Ripple", 4)
      bubble = bubble || anyEnabled("Bubble", 18)
      await sleep(100)
    }
    note(id, `ripple seen ${ripple}, bubble seen ${bubble}`)
    expect(ripple).toBe(true)
    expect(bubble).toBe(true)

    // Lean in: bring the mug to 45 cm, then 38 cm from the camera.
    const desk = findSceneObjectByName("DeskStandIn").getTransform()
    const home = desk.getWorldPosition()
    const moveMugTo = async (dist: number) => {
      const cam = camT.getWorldPosition()
      const dir = mugTop().sub(cam).normalize()
      const target = cam.add(dir.uniformScale(dist))
      desk.setWorldPosition(desk.getWorldPosition().add(target.sub(mugTop())))
      await sleep(400)
    }
    await moveMugTo(45)
    const fHalf = c.getFoamOpacity()
    await moveMugTo(38)
    const fClear = c.getFoamOpacity()
    note(id, `foam at 45 cm ${fHalf.toFixed(2)}, at 38 cm ${fClear.toFixed(2)}`)
    expect(fHalf).toBeGreaterThan(0.2)
    expect(fHalf).toBeLessThan(0.8)
    expect(fClear).toBeCloseTo(0, 1)
    expect(findSceneObjectByName("Foam").isEnabledInHierarchy).toBe(false)

    // Visibly swimming laps inside: below the surface, moving round the pool.
    const samples: vec3[] = []
    for (let i = 0; i < 6; i++) {
      samples.push(c.getKaijuOffsetFromMug())
      await sleep(400)
    }
    let travelled = 0
    let inside = true
    for (let i = 0; i < samples.length; i++) {
      if (flatLength(samples[i]) > 4.1 || samples[i].y > 9.5 || samples[i].y < 0.5) inside = false
      if (i > 0) travelled += samples[i].sub(samples[i - 1]).length
    }
    note(id, `swim path over 2 s: ${travelled.toFixed(1)} cm, inside the mug ${inside}, anim ${c.getKaijuAnimation()}`)
    expect(inside).toBe(true)
    expect(travelled).toBeGreaterThan(2)

    // Pull back: frosted again.
    desk.setWorldPosition(home)
    await sleep(400)
    note(id, `back at ${camT.getWorldPosition().distance(mugTop()).toFixed(1)} cm, foam ${c.getFoamOpacity().toFixed(2)}`)
    expect(c.getFoamOpacity()).toBeCloseTo(1, 1)
  }
}
