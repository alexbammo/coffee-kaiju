# Coffee Kaiju: Devpost submission draft

**Name:** Coffee Kaiju

**Tagline:** A tiny kaiju swims in your too-hot coffee and roars when it's ready to sip.

**Links:** Video: https://youtu.be/5JTMI94DMP0 · Repo: https://github.com/alexbammo/coffee-kaiju

## Inspiration
I've loved kaiju since watching Godzilla as a kid, then feeding coins into Rampage at the arcade, and later I made Smashy City for Android and iOS. Coffee is my other daily habit. I've burnt my tongue on a cup I couldn't wait for, and forgotten plenty until they went cold. A phone timer is one more screen to check. So I put the two together: the mug itself tells you when it's ready, and a tiny monster makes the wait fun.

## What it does
- **Mark your mug.** Pinch to show the Lens where your coffee is. On SPECS that marks your real mug; in the Lens Studio preview it places a real-size virtual mug on a desk.
- **He arrives.** A 6 cm glowing kaiju hops down beside the mug, stomps over and leaps up onto the rim.
- **Cannonball.** He dives in with a splash. Steam rises and a countdown ring starts above the mug. Pinch the ring to choose 3, 5 or 8 minutes (or 30 seconds for a demo).
- **Lean in for a peek.** From normal distance you see pale foam, the odd bubble, and his glowing fin cutting a ripple. Lean over the desk and the foam clears like frosted glass: he's swimming laps in a softly lit amber pool, doing loops and sinking to the bottom.
- **Ready to sip.** The steam fades as it cools. At zero a chime plays, he bursts out, shakes himself off on your desk and roars. Then he sits on the rim like a desk buddy; pinch the mug for the next cup, or after two minutes he waves off, dives back in and the Lens clears.

## Why glasses
It uses two of the things glasses do well:
- **It draws in the world.** The timer is your mug: the fading steam and the creature in it show the state at a glance, right where the coffee is.
- **It leaves your body free.** Your eyes and hands stay on your work. Splash, bubble and chime sounds pull your eyes down only when something happens.

Leaning in with your own body is the reveal, which a phone can't do.

## Designing for the display
- SPECS displays are additive, so dark colours vanish. Instead of dark coffee we used a white mug and a pale latte. The kaiju glows (cyan spines and eyes), and the inside of the mug is lit warm, so he reads "in a lit cup" rather than "in a hole".
- The reveal starts at about 50 cm, a natural lean over a desk, and is meant as a quick peek. That keeps it near the display's comfortable focus.
- Big pinch targets. The ring sits well above the rim, and pinching the mug does nothing while it counts down, so you can't restart it by accident.
- The glasses can't read temperature, so the countdown and the fading steam stand in for it.

## How we built it
- Planned with the Devpost Learn **plan-lens** skill: an interview that checked the idea against AR design rules and preview limits and wrote `devpost/design-brief.md`.
- Built by Snap's **CLAD** agents in Claude Code, through the **Lens Studio MCP**, in Lens Studio 5.23.2 using the SPECS Interaction Kit. **LEAF** tests cover the done criteria.
- The kaiju is a licensed Synty POLYGON Kaiju model, auto-rigged in Mixamo with nine animation clips (walk, climb, climb-over, dive, swim, tread water, roar, shake off, idle). We merged the clips in Blender and pinned the tail so it stays rigid. Sounds come from licensed SFX packs.

## Challenges
- No real-mug recognition or thermometer in the preview, so the design fakes the sensing and keeps the response.
- Making something "inside dark coffee" visible on an additive display (see above).
- Mixamo auto-rigging stretched the kaiju's tail, so we reweighted it in Blender.

## What's next
- Auto-detect the real mug with an on-device object-detection model, so there's no need to pinch.
- Different drinks: tea steeping, cafetière brewing.
- More kaiju behaviours while you wait.

## Disclosure
The kaiju model and sounds are licensed third-party assets (Synty, Mixamo, SFX packs). Their raw files are not in the public repo, because the licences forbid sharing source files; the code and project are.
