# Coffee Kaiju

A Lens for SPECS. Fresh coffee is too hot to drink, so a tiny glowing kaiju leaps onto your mug and cannonballs in. Lean over for a peek and you'll see him swimming laps inside. When it's cool enough to sip, he bursts out, shakes off and roars.

Entry for **Learn AR with SPECS** (Devpost, November 2026). Planned with the Devpost Learn `plan-lens` skill and built with Snap's CLAD agents through the Lens Studio MCP.

- Video: https://youtu.be/5JTMI94DMP0
- Repo: https://github.com/alexbammo/coffee-kaiju

## What's here
| Path | What |
|---|---|
| `Coffee Kaiju/` | The Lens Studio 5.23.2 SPECS project (`Coffee Kaiju.esproj`) |
| `Coffee Kaiju/devpost/design-brief.md` | The approved design brief CLAD built from |
| `Docs/BRIEF.md` | Our working design notes |
| `Docs/DEVPOST.md` | The submission text |

## Run it
1. Open `Coffee Kaiju/Coffee Kaiju.esproj` in Lens Studio 5.23.2 or later.
2. In the Preview panel, use Interactive Preview. WASD moves, Q and E go down and up, right-drag looks around, and a click acts as a pinch.
3. Click the desk to place the mug. Click the ring above the mug to choose the 0:30 demo time.

## Licensed assets are not included
The kaiju (Synty POLYGON Kaiju, rigged with Mixamo) and the sound effects come from paid packs. Their licences allow them inside a finished Lens but forbid sharing the source files, so they're left out of this repo. The project opens without them, but the kaiju and sounds will be missing. The demo video shows the Lens complete.

To run it with your own copy of the pack:
1. Export `SM_Chr_Kaiju_01` + `SM_Chr_Attach_Kaiju_01_Tail_01` and rig it in Mixamo.
2. Merge these clips into one FBX: Idle, Walk, Climb, ClimbTop, Jump, Swim, Tread, Roar, Shake.
3. Import it as `Coffee Kaiju/Assets/Art/Kaiju/CoffeeKaiju.fbx`; the sounds go in `Coffee Kaiju/Assets/Audio/` (splash_big, splash_small, bubbles_loop, bubble_pop, roar_a, roar_b, sip_ready_chime_trim).

## Tests
LEAF scenarios for each done criterion are in `Coffee Kaiju/Assets/Tests/` (open the LEAF panel in Lens Studio to run them). `video-demo` drives the full flow used to record the demo video.
