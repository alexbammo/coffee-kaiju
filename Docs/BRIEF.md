# Coffee Kaiju - brief

Devpost "Learn AR with SPECS" entry. Closes **Mon 9 Nov 2026, 5pm ET (22:00 UK)**. Lens for SPECS, built through CLAD in Lens Studio 5.23.2, shown in the Lens Studio preview.

**Pitch (for plan-lens):** Fresh coffee is too hot to drink. A tiny kaiju dives in and swims while it cools; lean closer to watch him inside. When it hits sipping temperature he jumps out and roars.

**What the countdown is for (owner, 9 Nov):** cool-down to sipping temperature, not brewing. Steam over the mug fades as it runs down; that is the stand-in for temperature (SPECS have no thermal sensor).

## The loop
1. **Place.** Pinch to show the Lens where your mug is. On SPECS that marks your real, just-poured mug; in the preview (no real mug) the pinch places a virtual mug of coffee as the stand-in. No real-mug recognition.
2. **Arrive.** The kaiju stomps across the desk to the mug (Walk), climbs the outside (Climb), pulls himself over the rim (ClimbTop) and stands on the rim (Idle).
3. **Dive.** He cannonballs in (Jump) with a big splash, and the cool-down countdown starts (default 5 min, pinch the ring for 3/5/8 min, plus a 30 s demo setting); steam fades as it runs.
4. **Lean in.** From normal distance: a white mug, pale caramel foam, white steam; every few seconds his glowing cyan tail fin cuts a ripple across the foam, with the odd cyan bubble. From about 50 cm the foam starts to fade, fully clear by about 40 cm (a quick peek, not a stare), like frosted glass clearing into a softly lit amber pool (lit warm and bright, never dark: the SPECS display shows dark as see-through). He glows cyan (spines and eyes, like a deep-sea creature), swims lengths around the inside (Swim), a loop, sinks to the bottom and kicks back up to tread near the surface (Tread), trailing small bright bubbles. Pull back and the foam frosts over again.
5. **Sippable.** The steam is gone, the chime plays, he bursts out (Jump), lands on the desk, shakes himself off (Shake) and roars (Roar).
6. **Desk buddy.** Steam and ring are gone. He hops back up to sit on the rim, tail hanging over the side, idling (breathing, the odd look around). A small "Ready" tick shows above the mug for about 5 s, then fades. After up to 2 min he waves off, dives back in with a small splash, and the Lens clears, mug and all.
7. **Again.** Once he's out, pinch the mug (or the desk once it has cleared): the steam comes back, he dives back in and a new countdown starts at the last time picked. A mug-pinch does nothing while the countdown is running. Pinching the desk somewhere else moves the mug there and he walks over to it.

## Where things live (owner, 9 Nov)
- Mug: real size, 9 cm wide x 10 cm tall, on the desk at arm's length (60-70 cm), beside the keyboard, a little below eye level. Preview: on a simple wooden desk slab placed by the same pinch.
- Kaiju: hops down about 25 cm to the side of the mug, walks over, climbs, stands on the rim.
- Countdown ring: about 8 cm above the rim (moved up so it doesn't overlap the mug as a pinch target), flat, facing the user, about 8 cm across; thin white-and-cyan, empties as it counts, small minutes text in the middle; dims when the user isn't looking at the mug.
- The user mostly looks at their work. Splash, bubble and chime sounds pull their eyes back to the mug.

## Done criteria
The five checks in `devpost/design-brief.md` (30 s setting). That brief is approved (9 Nov) and is what CLAD builds from.

## Assets (all in `art/src/`, gitignored: licensed)
- `CoffeeKaiju.fbx`: the Synty POLYGON Kaiju lizard (Kaiju_01 + Tail_01), rigged by Mixamo, with the tail pinned to the hips. Nine takes: **Idle, Walk, Climb, ClimbTop, Jump, Swim, Tread, Roar, Shake**. Walk and Swim are in place; move him in code. About 2 m tall as exported; scale him to about 6 cm so he reads from 60-70 cm away (owner, 9 Nov; was 4-5 cm).
- `sfx/`: splash_big, splash_small, bubbles_loop, bubble_pop, roar_a, roar_b, sip_ready_chime (12 s kettle chime, trim it).

## Repo and licence
The public repo holds the Lens project, code, `devpost/` planning docs and the exported compiled Lens. Raw Synty and Mixamo FBX, textures and pack sounds are not committed (Synty EULA: no sharing source files outside the team). See `DECISIONS.md`, 9 Nov.
