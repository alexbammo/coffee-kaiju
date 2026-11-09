import {DefaultScenarioManager} from "Leaf.lspkg/Scenarios/scenario/manager/DefaultLeafScenarioManager"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"

/**
 * CoffeeKaijuScenarioClient — runs every registered LEAF scenario in order in the preview and
 * prints one result line per scenario. Keep `autoRun` off for normal use of the Lens.
 */
@component
export class CoffeeKaijuScenarioClient extends BaseScriptComponent {
  @input
  @hint("Run all LEAF scenarios automatically when the preview starts (turn off to use the Lens by hand)")
  autoRun: boolean = false
  @input
  @hint("Optional: comma-separated scenario ids to run (empty = all, in order)")
  runOnly: string = ""

  onAwake() {
    if (!this.autoRun) return
    this.createEvent("OnStartEvent").bind(() => {
      this.runAll().then(() => print("[CK-LEAF] DONE"))
    })
  }

  private async runAll(): Promise<void> {
    const manager = DefaultScenarioManager.getInstance()
    await sleep(1500)
    const only = this.runOnly.split(",").map((x) => x.trim()).filter((x) => x.length > 0)
    const ids = manager.listScenarioIds().filter((id) => only.length === 0 || only.indexOf(id) >= 0)
    print("[CK-LEAF] scenarios: " + ids.join(", "))
    for (const id of ids) {
      try {
        await manager.startScenario(id)
        print(`[CK-LEAF] RESULT ${id}: PASS`)
      } catch (e) {
        print(`[CK-LEAF] RESULT ${id}: FAIL ${e}`)
      }
      await sleep(500)
    }
  }
}
