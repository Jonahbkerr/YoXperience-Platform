# Hero Motion-Graphics Storyboard — "The Understanding Loop"

**Deliverable:** seamless background video loop for the yoxperience.com hero (`/hero-loop.mp4`)
**Duration:** 16s @ 24fps, seamless loop (frame 384 == frame 1)
**Aspect:** 16:9 master (2560×1440), center-safe — the HTML headline sits ON TOP of this video
**Audio:** none (autoplay muted)
**Status:** ready to produce — blocked only on `higgsfield auth login`

---

## 1. Concept

One continuous cycle, told without a single word on screen: **raw human behavior flows into an
intelligence that genuinely understands it, and the interface itself reshapes in response — fluidly,
personally, endlessly.** The loop structure *is* the message: adaptation never finishes; it breathes.

The viewer shouldn't "watch" this video — they should *feel* it while reading the headline. Motion is
slow (nothing crosses the frame in under 4 seconds), contrast is low, and all detail lives in the outer
thirds of the frame, leaving the center calm for text.

## 2. Style frame

- **World:** deep-space violet void `#12081f`, not black — warm and alive, matching the shipped CSS fallback.
- **Palette:** brand purple `#6D29D9` (intelligence), brand pink/magenta `#E64FA9` (human signal), soft cyan `#22d3ee` (the interface), all as glow — no saturated fills.
- **Materials:** translucent glass panels with 1px luminous edges; particles as soft bokeh points, not sharp dots; the LLM core as a slow-churning nebula of fine filament strands — organic, neural, never a "robot brain," never a literal chip.
- **Camera:** single locked wide shot with an imperceptible 2% push-in across the whole loop (resets invisibly at the loop point inside a defocused moment).
- **Forbidden:** text, logos, cursors, faces, screenshots of real UI, lens flares, fast cuts.

## 3. Scene-by-scene

### Scene A — "Signals" · 0:00–0:04 · *behavior arrives*
- **Visual:** From the lower-left and right edges, thin streams of magenta bokeh particles drift inward — unhurried, like dust in sunlight. Each stream has subtle rhythm variations (a burst, a pause, a steady trickle): three *different people's* behavioral cadences, distinguishable by tempo alone.
- **Meaning:** clicks, scrolls, hesitations, daily routines — telemetry as something human, not data-grid cold.
- **Motion notes:** particle speed ≤ 60px/s at 1440p; streams curve gently (bezier, no straight lines).

### Scene B — "Understanding" · 0:04–0:08 · *the LLM comprehends*
- **Visual:** The particle streams reach a violet nebula low in the frame (bottom 30%, never center). On contact, particles don't vanish — they're *absorbed along filament paths*, and the nebula's internal strands re-braid themselves, glowing faintly brighter where a stream's rhythm repeats. One slow pulse travels through the whole filament network, left to right.
- **Meaning:** not counting events — *recognizing patterns*. The re-braiding is comprehension; the pulse is an insight forming.
- **Motion notes:** the pulse takes a full 2.5s to cross; nebula churn is glacial (full internal rotation would take ~90s if extrapolated).

### Scene C — "Adaptation" · 0:08–0:13 · *the UI becomes fluid*
- **Visual:** In the upper thirds, five glass panels — abstract UI blocks in faint cyan outline — respond to the nebula's pulse: one panel widens as another yields space; two panels trade positions in a smooth arc; one dissolves as a new, differently-proportioned panel condenses from the same light. The choreography reads as *rearranging itself around someone's workflow*, deliberate and calm — furniture rearranging itself for the person walking in, not a glitch effect.
- **Meaning:** the fluid UI — layout, emphasis, and structure adapting to the understood need.
- **Motion notes:** every panel move uses ease-in-out over ≥2s; at most two panels in motion simultaneously; panels stay in the outer 60% of frame width.

### Scene D — "Equilibrium → Rebirth" · 0:13–0:16 · *loop closure*
- **Visual:** The new arrangement settles and its glow softens toward stillness — one breath of a completed adaptation. Then, at the frame edges, fresh magenta particles begin drifting in (identical spawn state to 0:00). The camera's push-in dissolves back to its start position inside this soft, defocused beat.
- **Meaning:** adaptation is never done; new behavior is always arriving. The loop point is invisible because equilibrium and beginning share the same visual state.
- **Loop contract:** frame 384's particle positions, nebula phase, panel layout, and camera transform must match frame 1 exactly.

## 4. Text-safety constraints (non-negotiable)

- Center 55% (horizontal) × 45% (vertical) of frame: luminance variation stays under 10% — headline sits here.
- Peak brightness anywhere ≤ 60% — the site applies its own radial scrim on top (`rgba(18,8,31,.25→.75)`).
- The shipped hero renders this video at `opacity: 0.5` over the animated CSS blobs — the video should look *designed for* that stack, not fight it.

## 5. Production plan (Higgsfield)

Generate as **two 8s clips** (models cap near 8–10s), then stitch with a 12-frame crossfade and
loop-close with a 12-frame crossfade from tail to head.

**Shot 1 (Scenes A+B) — prompt:**
> Abstract motion graphics, deep violet cosmic void (#12081f). Thin streams of soft magenta bokeh
> particles drift slowly inward from the lower left and right edges, each stream with a distinct
> gentle rhythm. The streams feed into a slow-churning nebula of fine glowing purple filament
> strands in the lower third of frame; where particles are absorbed, the filaments re-braid and
> glow subtly brighter, and one slow luminous pulse travels through the network. Extremely slow,
> meditative, elegant. Dark center of frame kept calm and empty. No text, no faces, no lens flares.
> Cinematic, 16:9, seamless ambient loop feeling.

**Shot 2 (Scenes C+D) — prompt:**
> Abstract motion graphics, deep violet cosmic void (#12081f). In the upper portion of frame, five
> translucent glass rectangles with faint cyan luminous edges rearrange themselves in slow,
> deliberate choreography: one widens while another yields space, two trade positions along smooth
> arcs, one dissolves while a new differently-proportioned rectangle condenses from light. Below,
> a dim purple filament nebula pulses softly, driving the rearrangement. Calm, premium,
> furniture-rearranging-itself elegance; ease-in-out motion, never fast. Dark empty center. Ends in
> a settled, softly-glowing equilibrium. No text, no cursors, no faces. Cinematic, 16:9.

**Assembly:**
```bash
# after downloading shot1.mp4 / shot2.mp4 from Higgsfield
ffmpeg -i shot1.mp4 -i shot2.mp4 -filter_complex \
  "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=7.5[ab]; \
   [ab]split[main][tail]; [tail]trim=start=15.5,setpts=PTS-STARTPTS[t]; \
   [main][t]xfade=transition=fade:duration=0.5:offset=15[loop]" \
  -map "[loop]" -t 15.5 -an -c:v libx264 -crf 23 -pix_fmt yuv420p \
  -movflags +faststart packages/landing/public/hero-loop.mp4
```
Target ≤ 4 MB (1080p is fine for a 0.5-opacity backdrop; downscale with `-vf scale=1920:-2` if over).

**Ship:** drop the file at `packages/landing/public/hero-loop.mp4`, `vercel --prod` — the hero's
video layer detects and fades it in automatically; no code change.

## 6. Fallback & accessibility

- Until the asset exists, the animated CSS gradient blobs (already live) are the design.
- `prefers-reduced-motion`: video layer is hidden by CSS; blobs freeze. Already shipped.

## 7. Why no literal "LLM reading your dashboard" imagery

The claim "LLMs understand and adapt your UI" is *demonstrated* by the page itself — the headline
above this video is a live YoXperience slot being A/B-served and conversion-scored. The video's job
is emotional register (calm intelligence, fluid response), not exposition. Abstract wins.
