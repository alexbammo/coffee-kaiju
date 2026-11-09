import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectByName, findSceneObjectsByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {CoffeeKaijuController} from "../Scripts/CoffeeKaijuController"

/** Shared helpers for the Coffee Kaiju LEAF scenarios. Scenarios run in order in one Lens session. */

export function getController(): CoffeeKaijuController {
  for (const so of findSceneObjectsByName("CoffeeKaiju")) {
    const c = so.getComponent(CoffeeKaijuController.getTypeName()) as CoffeeKaijuController
    if (c) return c
  }
  throw new Error("CoffeeKaijuController not found on a SceneObject named CoffeeKaiju")
}

export async function waitFor(what: string, cond: () => boolean, timeoutMs: number): Promise<number> {
  const t0 = getTime()
  while (!cond()) {
    if ((getTime() - t0) * 1000 > timeoutMs) throw new Error(`Timed out after ${timeoutMs} ms waiting for: ${what}`)
    await sleep(100)
  }
  return (getTime() - t0) * 1000
}

export async function pinch(interactor: DefaultLeafInteractor, name: string): Promise<void> {
  const target = findInteractableByName(name)
  if (!target) throw new Error(`Interactable "${name}" not found`)
  await interactor.trigger(target)
  await sleep(150)
}

export function anyEnabled(prefix: string, count: number): boolean {
  for (let i = 0; i < count; i++) {
    const so = findSceneObjectByName(prefix + i)
    if (so && so.isEnabledInHierarchy) return true
  }
  return false
}

export function flatLength(v: vec3): number {
  return Math.sqrt(v.x * v.x + v.z * v.z)
}

export function countOf(list: string[], name: string): number {
  return list.filter((s) => s === name).length
}

/** Prints a check line so the log shows what each criterion actually measured. */
export function note(scenario: string, msg: string) {
  print(`[CK-TEST ${scenario}] ${msg}`)
}

/** Brings the Lens to a running 0:30 countdown, whatever state an earlier scenario left. */
export async function ensureSwimmingAt30(interactor: DefaultLeafInteractor): Promise<CoffeeKaijuController> {
  const c = getController()
  if (c.getState() === "Waiting") await pinch(interactor, "PlaceSurface")
  if (c.getState() === "Cleared") await pinch(interactor, "DeskSlab")
  if (c.getState() === "Buddy") await pinch(interactor, "MugBody")
  await waitFor("Swimming", () => c.getState() === "Swimming", 40000)
  let guard = 0
  while (c.getCountdownLength() !== 30 && guard++ < 5) await pinch(interactor, "CountdownRing")
  return c
}
