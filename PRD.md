# PRD — "Roast Me" (working title)

**A one-trick AI roast generator, built to be screen-recorded.**

Version 0.1 · Owner: Yusuff · Status: Draft for build

---

## 1. Product Thesis

This app has exactly one job: type something, get roasted, share the roast. Every design and engineering decision serves that one loop. If a feature doesn't make the 15-second demo clip better, it doesn't ship in v1.

**Success looks like:** someone screen-records themselves using it, unprompted, within their first session.

---

## 2. Goals & Non-Goals

**Goals (v1)**

- Input → roast → share, in under 3 taps
- The share artifact (image) is good enough to post without editing
- Feels _alive_ — not a form with an API call bolted on
- Buildable solo in a weekend

**Non-goals (v1)**

- Accounts, login, or any persistence
- Roast history
- Social feed / discovery inside the app
- Monetization of any kind
- Android/iOS platform-specific polish beyond what Expo gives for free

---

## 3. Success Metrics

| Metric                                                        | Target         | Why it matters                                                                 |
| ------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------ |
| Time from cold open → first roast shown                       | < 10s          | Kills hesitation before it starts                                              |
| Roast generation latency                                      | < 2.5s (p90)   | Longer than this needs a stronger loading moment, not just a spinner           |
| Share-image export success rate                               | > 99%          | The whole app's distribution model depends on this working every time          |
| Self-reported "would you post this" (informal, ask 10 people) | > 6/10 say yes | This is the real product-market signal for v1, since we're not chasing revenue |

---

## 4. Core User Flow

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  Home        │ tap  │  Roasting     │ auto │  Result      │
│  (input)     │─────▶│  (loading)    │─────▶│  (share)     │
└─────────────┘      └──────────────┘      └─────────────┘
                                                    │
                                              tap "Again"
                                                    │
                                                    ▼
                                            back to Roasting
```

Three states, two screens. No navigation stack depth beyond this — `expo-router` with a single modal-style transition between Home and Result is enough; resist the urge to add a stack.

---

## 5. Screens

### 5.1 Home

- One headline (sets the tone — funny, a little threatening, not corporate)
- One multiline text input, placeholder text does the explaining ("Tell me something about your day. I'll be honest.")
- One primary button: **"Roast me"**
- Button is disabled/muted until there's input — this alone is a small piece of emotional design: the app visibly "wants" you to type

### 5.2 Roasting (transient state, not a separate route)

- This is the moment worth the most design attention, because it's the anticipation beat — see §7
- Button collapses/morphs into a loading indicator in place, rather than navigating away (continuity keeps it feeling like one object reacting, not a page change)

### 5.3 Result

- The roast, large, centered, as the hero — bigger type than anything else in the app
- Two actions: **Share** (exports styled card) and **Roast again** (secondary, quieter)
- The share card design is a separate artifact from the in-app display — see §6

---

## 6. Emotional Design Direction

Brutalist, not cute. This is a roast app — the visual language should feel a little confrontational, not friendly-rounded-mascot energy. Sharp corners or none, high contrast, type doing the heavy lifting over illustration.

**Token system (v1 starting point — tune once real device testing starts):**

| Token          | Value                                                                                   | Note                                                                            |
| -------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `color.bg`     | `#0A0A0A`                                                                               | Near-black, not pure black — keeps OLED from looking dead                       |
| `color.text`   | `#F5F5F0`                                                                               | Warm off-white, not pure white                                                  |
| `color.accent` | `#FF3B30`                                                                               | Reserved _only_ for the roast text itself and the primary button — nowhere else |
| `color.muted`  | `#6B6B6B`                                                                               | Placeholder text, secondary button                                              |
| `type.display` | A single confident grotesk (e.g. Inter Black / Neue Haas Grotesk equiv via `expo-font`) | Used for the roast text only — this is the signature element                    |
| `type.body`    | Same family, regular weight                                                             | Input text, buttons, everything else                                            |
| `radius`       | `0px` on cards/buttons                                                                  | Sharp edges reinforce the "roast," not "cozy app" feeling                       |
| `spacing.unit` | `8px` base grid                                                                         | Standard, don't overthink this part                                             |

**The one signature element:** the roast text itself "hits" — see micro-animation spec below. Everything else in the UI stays quiet so this moment has nowhere to hide.

Don't add: gradients, illustration, mascots, confetti, or more than one accent color. The restraint is what makes the accent color mean something when it appears.

---

## 7. Micro-animation Spec

This is the actual engineering deliverable — hand these values to whoever (Claude Code) implements it, don't leave them to be improvised at build time.

### 7.1 Button → loading transition

- **Trigger:** tap "Roast me"
- **Behavior:** button width animates down to a fixed circle (fully collapsed square-to-circle morph), text fades out first (100ms), then shape morphs (200ms)
- **Timing:** `withTiming`, 200ms, `Easing.out(Easing.cubic)`
- **Haptic:** `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` on tap-down, before the animation starts — the haptic should feel instant, never wait on the network

### 7.2 Loading state ("thinking")

- Do **not** use a generic spinner. Use a pulsing scale animation on a small flame/spark glyph inside the collapsed circle:
- **Timing:** `withRepeat(withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.sin) }), -1, true)`
- If the response takes longer than ~2s, don't add a second loading state — just let this one keep pulsing. Changing states mid-wait reads as broken, not thorough.

### 7.3 Roast reveal — the signature moment

This is the single most important animation in the app. Get this right and the rest doesn't matter as much.

- **Behavior:** roast text enters with a slight overshoot scale (feels like it "lands" with force, matching the tone of a roast) combined with a fast fade-in
- **Timing:** `withSpring(1, { damping: 12, stiffness: 180 })` on scale (from 0.85 → 1.0), paired with `withTiming(1, { duration: 180 })` on opacity
- **Haptic:** `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)` fires at the exact frame the text starts animating in — a slightly harsher haptic than success, because it's a roast, not a reward
- **Sequencing:** haptic and animation start must be frame-synced (same `runOnJS` callback), not fired from two separate places — a haptic that lands 50ms after the visual reads as laggy

**Tone-aware reveal:** the backend labels each roast with a tone (see §9); the reveal adapts so the animation lands the joke instead of fighting it:

| Tone      | Reveal                                                                        | Haptic                       |
| --------- | ----------------------------------------------------------------------------- | ---------------------------- |
| `savage`  | The spec above, unchanged — the hard hit                                       | `notificationAsync(Warning)` |
| `playful` | Same spring, less damping (bouncier), scale from 0.9                           | `notificationAsync(Success)` |
| `absurd`  | Loose spring + slight rotation (-2°) it recovers from                          | `impactAsync(Medium)`        |
| `deadpan` | No overshoot at all — plain 150ms fade; the reveal underplays, like the line   | `impactAsync(Soft)`          |

### 7.4 Share button

- Standard press-scale (`withTiming` scale to 0.96 on press-in, back to 1 on release, 100ms each) — this is the one place a generic micro-interaction is fine, because it shouldn't compete with §7.3

### 7.5 Respect reduced motion

- Check `AccessibilityInfo.isReduceMotionEnabled()` on mount; if true, replace the spring overshoot in §7.3 with a plain 150ms fade, and drop the pulsing loading glyph for a static icon. Haptics stay — they're not a motion concern.

---

## 8. Tech Stack

| Layer              | Choice                                                                                                                                               | Notes                                                                                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework          | **Expo SDK 56** (React Native 0.85, React 19.2)                                                                                                      | Current stable line as of this writing — confirm with `npx expo --version` when scaffolding, since Expo ships ~3x/year and a newer stable may exist by build time                              |
| Routing            | `expo-router`                                                                                                                                        | Two routes max: `/` and implicit result state (keep Result as UI state inside `/`, not a separate route, per §4 — avoids a navigation transition undermining the continuity described in §7.1) |
| Animation          | `react-native-reanimated` (v4, ships against RN 0.85's new animation backend)                                                                        | All timings in §7 assume Reanimated's worklet-based API                                                                                                                                        |
| Haptics            | `expo-haptics`                                                                                                                                       | Built-in, no extra setup                                                                                                                                                                       |
| Fonts              | `expo-font` + a self-hosted grotesk (e.g. Inter, licensed free)                                                                                      | Load in `_layout.tsx`, block render until loaded to avoid a font-swap flash                                                                                                                    |
| Share image export | `react-native-view-shot`                                                                                                                             | Render the result card off-screen at export resolution (1080×1080 min), capture, then share via `expo-sharing`                                                                                 |
| Sharing            | `expo-sharing`                                                                                                                                       | Native share sheet — let the OS handle WhatsApp/Instagram/X targets, don't build custom share integrations                                                                                     |
| Backend            | Single serverless function (Node) or Supabase Edge Function                                                                                          | One route: `POST /roast { input: string } → { roast: string }`                                                                                                                                 |
| AI                 | Claude API (`claude-sonnet-5` or `claude-haiku-4-5` — Haiku is likely fast/cheap enough for a one-liner and keeps §3's latency target easier to hit) | See §9 for prompt                                                                                                                                                                              |

**Explicitly not needed for v1:** database, auth, analytics SDK beyond whatever's built into Expo/EAS, push notifications, offline queueing.

---

## 9. Backend / Prompt Spec

**Endpoint:** `POST /roast`
**Request:** `{ "input": string }` (client should cap input length client-side, ~300 chars, before sending)
**Response:** `{ "roast": string, "tone": "savage" | "playful" | "absurd" | "deadpan" }`

The model labels its own line with the tone it *actually reads as* (not the tone it aimed for); the client uses this to pick the §7.3 reveal variant. Tone definitions used in the prompt:

- `savage`: a hard, direct hit — no softness, meant to sting a little
- `playful`: light, silly, clearly affectionate under the jab
- `absurd`: surreal or nonsensical, funny because it's unexpected/weird
- `deadpan`: dry, flat, underplayed — funny because of what it withholds, not what it says

**System prompt (starting point, tune by testing):**

> You are a savage, witty roast comedian. Given the user's input, respond with exactly ONE short, brutal, funny line. Maximum 20 words. No preamble, no disclaimers, no "here's your roast" — output only the roast line itself. Be clever, not cruel — the target should laugh, not feel actually hurt. Never reference self-harm, appearance, race, or anything punching at a protected trait — keep it about the situation they described, not who they are.

Iterate on this prompt more than on any UI detail — per the original app concept discussion, the roast quality _is_ the product.

---

## 10. Non-functional Requirements

- **Performance:** cold start to interactive < 2s on a mid-range Android device (not just a flagship simulator)
- **Accessibility:** reduced-motion path (§7.5), minimum tap target 44×44pt, sufficient contrast on `color.accent` against `color.bg` (verify with a contrast checker — `#FF3B30` on `#0A0A0A` should pass AA for large text)
- **Privacy:** no input is stored server-side beyond the duration of the request; state this plainly in a one-line in-app note, not a full privacy policy page, for v1
- **Content safety:** basic server-side filtering to refuse roasting clearly sensitive input (self-harm mentions, etc.) with a graceful fallback message instead of a forced joke

---

## 11. Milestones (weekend build)

**Day 1**

- Scaffold Expo SDK 56 project, `expo-router` base layout, fonts loaded
- Backend roast endpoint live, prompt tuned via direct API testing until consistently funny
- Home screen UI, static (no animation yet)

### Day 1 addition: Tone-accuracy validation

Before moving to Day 2, run a batch of 15-20 varied test inputs through the
`/roast` endpoint and check whether each returned `tone` actually matches how
the roast reads (use the tone-accuracy validation prompt in Appendix A to speed
this up — `npm run validate-tones` automates the whole batch — or judge
manually; either works for a sample this small).

**Pass bar:** mismatch rate under ~10-15%. Above that, the tone system in
§7.3 will actively fight the joke instead of landing it — a `savage`-tagged
line that reads `playful` makes the hard-hitting animation feel like a false
alarm, and vice versa. Fix the system prompt's tone-classification wording
first; don't compensate for it in animation code.

**If mismatches cluster on one tone specifically** (e.g. `absurd` keeps
getting mislabeled `playful`), that tone's definition in the prompt is
probably too close to a neighbor — tighten the distinction in the prompt
rather than adding a fifth tone to disambiguate.

**Day 2**

- Wire Home → Roasting → Result flow end to end
- Implement §7 animation/haptic spec
- Implement share-card export + native share sheet
- Record the actual 15-second demo clip described in the original concept — if it's not good enough to post, that's the last thing to fix before calling v1 done

---

## 12. Risks

| Risk                                                          | Mitigation                                                                                                                                                                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roasts are consistently mid, not funny                        | Budget explicit prompt-iteration time on Day 1 before writing any UI code — don't let this slip to "polish later"                                                                                          |
| Animation feels janky on lower-end Android                    | Test on real mid-range hardware, not just simulator, before considering Day 2 done                                                                                                                         |
| App Store/Play Store review flags AI-generated insult content | Keep the content-safety guardrail in §10 tight from v1, don't add it after a rejection                                                                                                                     |
| Nobody actually screen-records it                             | This is the real test of the whole concept — if the first 5-10 people who try it don't spontaneously want to share it, that's signal to rework §7 before investing more time, not a reason to add features |

---

## Appendix A — Tone-accuracy validation prompt

Used by `scripts/validate-tones.mjs` (`npm run validate-tones`) to judge each
roast/tone pair from the Day 1 validation batch. `{roast}` and `{tone}` are
substituted per sample.

> You are reviewing a roast-generator's self-labeled tone for consistency.
>
> You will be given a short roast line and the tone it labeled itself as:
> savage, playful, absurd, or deadpan.
>
> Definitions:
> - savage: a hard, direct hit — no softness, meant to sting a little
> - playful: light, silly, clearly affectionate under the jab
> - absurd: surreal or nonsensical, funny because it's unexpected/weird
> - deadpan: dry, flat, underplayed — funny because of what it withholds, not what it says
>
> Roast: "{roast}"
> Labeled tone: {tone}
>
> Does the labeled tone honestly match how this roast actually reads?
> Answer with only one word: MATCH or MISMATCH.
> If MISMATCH, on a second line, state which tone it should have been instead.
