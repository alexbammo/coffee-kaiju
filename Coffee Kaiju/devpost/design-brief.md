---
status: approved
---

# Design brief: Coffee Kaiju

<!-- Filled in by plan-lens from the learner's interview. Use the learner's words. Mark any value they didn't choose as (default). -->

## The one spatial moment
You've just poured a real coffee and it's too hot to drink. A tiny glowing kaiju walks over, climbs your mug and cannonballs in; when you lean over the desk for a quick peek, the foam clears like frosted glass and you see him swimming laps in a softly lit amber pool. When it reaches sipping temperature he bursts out, shakes off and roars: your coffee is ready.

## Why it belongs on glasses
- Uses: draws in the world (the kaiju lives in and on your actual mug, at real size); leaves your body free (you keep working with eyes and hands on your keyboard, and sounds pull you back only when something happens).
- Why it's better than the phone or laptop version: a phone timer is a separate screen you have to check. Here the timer *is* your mug: the steam fading and the creature swimming in it tell you the state at a glance, right where the coffee is, without picking anything up.

## Product or overlay
- Type: overlay: it responds to your real, just-poured mug of coffee.
- What the real version would sense: where your mug is. Nothing else; there's no thermal sensor, so the countdown and the fading steam stand in for temperature.
- Stand-in for the preview: the user pinches to show the Lens where the mug is. In the preview, the pinch places a simple wooden desk slab with a real-size virtual mug of light coffee on it, so the mug never floats. Pinching the desk somewhere else moves the mug there and the kaiju walks over to it.

## Where things live
- Where the user is looking during the main task: at their work, not the Lens. The mug sits on the desk below their view; they glance down now and then and lean in for a quick peek. Splash, bubble and chime sounds pull their eyes back when something happens.
- Desk slab (preview stand-in): simple wooden surface under the mug, about 60 x 40 cm (default), at desk height a little below eye level.
- Mug: white, real size, about 9 cm wide and 10 cm tall, on the desk at arm's length (60–70 cm), slightly to one side of the keyboard. Pale caramel foam on top, white steam rising.
- Kaiju: about 6 cm tall, so he reads from 60–70 cm away and still fits the mug. He lands with a small hop about 25 cm to the side of the mug, walks over, climbs the outside and stands on the rim. Glowing cyan spines, eyes and tail fin, like a deep-sea creature.
- Inside the mug (the lean-in view): a softly lit amber pool, lit warm and bright, never dark, so it always looks like he's in a lit cup of coffee rather than a hole in the table. He swims lengths around the inside, does a loop, sinks to the bottom and kicks back up to tread water near the surface, trailing small bright bubbles so his path reads at that size.
- Countdown ring: about 8 cm above the rim, flat and facing the user, about 8 cm across. Thin white-and-cyan ring that empties as it counts down, with the minutes in small text in the middle.
- "Ready" tick: small, above the mug, after the countdown ends.

## Hands and input
- First pinch in front of you: places the desk slab and mug (preview); on SPECS it marks your real mug.
- Pinch the desk elsewhere: moves the mug there; the kaiju walks over to it.
- Pinch the ring: cycles the countdown length 0:30 (demo), 3, 5 and 8 minutes. Default is 5 minutes; a new countdown starts at the last time picked.
- Pinch the mug: does nothing while the countdown is running. Once he's out, it starts a new countdown: the steam comes back and he dives back in. After the Lens has cleared, pinching the desk again does the same.
- Targets are big and highlight when aimed at.
- Voice: none.

## When things show
- Foam surface: shows from normal distance, with his glowing cyan tail fin cutting a ripple across it every few seconds (about every 3–5 s, default) and the odd cyan bubble popping up. When the camera comes within about 50 cm of the mug the foam starts to fade, and it's fully clear by about 40 cm. Pulling back frosts it over again. It's a quick peek, not something to stare at.
- Steam: rises while the countdown runs and fades as it counts down; gone when the coffee is ready.
- Countdown ring: shows from the dive until zero. Dims when the user isn't looking at the mug (dimmed to about 30% when the mug is more than about 15° from the centre of view, default).
- Finish: at zero the chime plays, he bursts out (Jump), lands on the desk, shakes himself off (Shake) and roars (Roar). Steam and ring are gone.
- Desk buddy: he hops back up to sit on the rim with his tail hanging over the side, idling (breathing, the odd look around), so he's not demanding attention. The "Ready" tick shows for about 5 seconds, then fades.
- Clearing: after up to 2 minutes on the rim he waves off, dives back in with a small splash, and the Lens clears, mug and all, so nothing is left cluttering the view.
- If something needs attention out of view: sound. Splash on the dive, bubbles while he swims, the chime when it's ready.

## Done criteria
Each one can be checked in Lens Studio's preview, using the 30-second setting.
1. Pinching the desk places a white mug of light coffee at real size with steam rising, and the kaiju appears beside it, walks over, climbs up and stands on the rim.
2. He cannonballs in with a splash and the ring starts counting down from 0:30, and the steam fades as it runs. Pinching the ring cycles 0:30, 3, 5 and 8 minutes.
3. From normal distance I see foam with ripples and his glowing fin. Moving the camera to within about 50 cm fades the foam, and he's visibly glowing and swimming laps inside. Moving back frosts it over again.
4. When the ring reaches zero the chime plays, he jumps out onto the desk, shakes off and roars, then sits on the rim idling.
5. Pinching the mug after that starts a new countdown and he dives back in.

## Out of scope
- Recognising a real mug or reading the coffee's real temperature.
- Remembering the chosen time or the mug's position between sessions.
- Voice control.
- More than one mug or kaiju at a time.

## Risks and open questions
- The lean-in view is close (40–50 cm) compared with the display's ~1 m focus; fine as a quick peek, uncomfortable to hold. Feel unproven.
- On SPECS the real mug wall can't hide the kaiju inside it, and the real coffee will be darker than the virtual pool; the glowing, lit-from-within look is meant to carry it. Feel unproven.
- The kaiju is about 6 cm tall; whether his swim reads from 60–70 cm on real glasses is feel unproven (the bubble trail and glow are there to help).
- Assets: the kaiju model (`CoffeeKaiju.fbx`, nine takes: Idle, Walk, Climb, ClimbTop, Jump, Swim, Tread, Roar, Shake; Walk and Swim are in place, so move him in code; exported about 2 m tall) and sounds (splash_big, splash_small, bubbles_loop, bubble_pop, roar_a, roar_b, sip_ready_chime: a 12 s kettle chime, trim it) are in `../art/src/` beside this project. They're licensed (Synty, Mixamo): once imported into `Assets/`, keep the imported copies out of the public repo.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
