# YoXperience — Full Experience Demo Script

**Runtime:** ~3 minutes
**Audience takeaway:** An AI that adapts your interface to your workflow, not the other way around.

---

## Setup (before the demo)

1. LM Studio is running with **Gemma 4 e4b** loaded. Context size ≥ 8192.
2. `.env` has real Google OAuth + Slack bot token configured. Demo mode OFF (`DEMO_MODE=false`).
3. Backend running: `npm run dev:mvp` → `http://localhost:3457/health` returns `{ok:true}`
4. Dashboard running: `npm -w @yoxperience/dashboard run dev` → `http://localhost:5174/dashboard/mvp`
5. Gmail and Calendar are OAuth-connected. Slack shows as enabled.
6. Hit **↻ Render** once beforehand to warm the LM.
7. Click **▶ Run Demo Tour** (see footer) to auto-play, OR drive manually per script below.

---

## Scene 1 — "It learns what you want to do" *(40s)*

**You say:** *"Open the browser. Look — no dashboards, no menus. Just a canvas."*

Point to empty Mind Map area.

**You say (to the agent, voice):** *"Show me my unread emails."*

**Audience sees:**
- Your words appear as a blue chip at top: "Show me my unread emails 🎤"
- Small caption: `→ EMAIL OPTIONS READY`
- A mind map spawns: center intent node + 2-3 action nodes, animated dashed line to the recommended one

**You say:** *"It heard me, understood the intent, and proposed the exact action I'd need — not five screens to navigate."*

Click **Check Unread Emails** action node.

**Audience sees:**
- Result node spawns below, showing a real list of your emails (sender, subject, preview, time)

**You say:** *"And it doesn't just tell me the count — I see the actual inbox right here."*

---

## Scene 2 — "It plans multi-step workflows" *(50s)*

**You say (to the agent, voice):** *"Check my emails, then message the team on Slack that I'm running 10 minutes late."*

**Audience sees:**
- Caption changes: `→ 2-STEP WORKFLOW READY`
- The mind map vanishes. A **playbook view** takes over: step chips at top, a focus card in the middle, neighbor previews on the sides.
- Step 1 is "current" — a dark Run button is visible.

**You say:** *"One compound ask, and it decomposes into an ordered plan. Step 1 first, then step 2. I work one at a time."*

Click **Run step** on Step 1.

**Audience sees:**
- Emails render inline in the step card
- Step 1 goes green (✓)
- Stepper auto-advances to Step 2

**You say:** *"Now look at step 2."*

Zoom in on Step 2's form. The LM pre-filled `channel` and `text` with something reasonable like `channel: team, text: I'm running 10 minutes late.`

**You say:** *"It drafted the message for me. I can tweak anything before it sends."*

Edit the channel to `#social` (safe test channel). Then click **⚠ Send** (red button).

**Audience sees:**
- Brief confirmation step → ✅ sent
- Step 2 turns green
- Real Slack message posts to #social

**You say:** *"Real API call. Real message posted. The agent ran the whole play."*

---

## Scene 3 — "The UI mutates as you work" *(30s)*

**You say (voice):** *"What's on my calendar today?"*

Wait for render (~15-30s).

**Audience sees:**
- Caption: `→ CALENDAR VIEW`
- Workflow view disappears, replaced by mind map
- Single action node: "View upcoming events" with animated suggestion edge

Click it.

**Audience sees:**
- Result node shows today's events inline (title, time, meet link)

**You say:** *"Same screen, different task, different UI. No configuration. The AI reshapes what's on screen based on what I asked."*

---

## Scene 4 — "Write actions are safe by default" *(20s)*

**You say (voice):** *"Send an email to sara@example.com about the demo tomorrow."*

**Audience sees:**
- Caption: `→ EMAIL DRAFTED`
- Action node: **Send email** with chevron (editable)

Click the action. It expands into a form:
- `to: sara@example.com`
- `subject: Demo tomorrow`
- `body: Looking forward to the demo tomorrow — let me know if the timing still works.` *(LM-drafted)*

**You say:** *"Everything is pre-filled from what I said. I can edit any field. Write actions require me to explicitly click Send — nothing fires behind my back."*

Click **Cancel** (don't actually send to a fake address).

**You say:** *"That's YoXperience. Intent in, interface out, I stay in control."*

---

## Cheat sheet (what to say if things go wrong)

| Glitch | What to say |
|---|---|
| LM takes >30s | "Local model — no data leaves this laptop. That's why it's a touch slower than cloud." |
| Panel looks generic | "The LM hints the shape; integrations supply the data. Both are local." |
| Wrong action proposed | Click 🎤 again and rephrase. "Even with a 4B param model, it's usually right — and when it's not, I just talk to it." |
| Something errors | "Real APIs — real failure modes. The agent surfaces them instead of hiding them." |

---

## Key phrases to drop

- "Intent in, interface out."
- "The UI is an output of the AI, not a scaffold around it."
- "One canvas. Any workflow. Your data stays local."
- "This is what a post-app-chrome world looks like."
