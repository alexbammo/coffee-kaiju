import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {CK1PlaceArriveScenario} from "./CK1PlaceArriveScenario"
import {CK2DiveCountdownScenario} from "./CK2DiveCountdownScenario"
import {CK3FoamPeekScenario} from "./CK3FoamPeekScenario"
import {CK4FinishBuddyScenario} from "./CK4FinishBuddyScenario"
import {CK5MugRestartScenario} from "./CK5MugRestartScenario"
import {CK6DeskMoveScenario} from "./CK6DeskMoveScenario"
import {CK7VideoDemoScenario} from "./CK7VideoDemoScenario"

/** Registers the Coffee Kaiju LEAF scenarios, one per done criterion plus one extra. Run in order. */
@component
export class CoffeeKaijuLeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "c1-place-arrive", typename: CK1PlaceArriveScenario.getTypeName()},
    {id: "c2-dive-countdown-ring", typename: CK2DiveCountdownScenario.getTypeName()},
    {id: "c3-foam-peek", typename: CK3FoamPeekScenario.getTypeName()},
    {id: "c4-finish-buddy", typename: CK4FinishBuddyScenario.getTypeName()},
    {id: "c5-mug-restart", typename: CK5MugRestartScenario.getTypeName()},
    {id: "extra-desk-move", typename: CK6DeskMoveScenario.getTypeName()},
    {id: "video-demo", typename: CK7VideoDemoScenario.getTypeName()},
  ]
}
