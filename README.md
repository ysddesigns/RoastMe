# Roast Me

Type something, get roasted, share the roast. One screen, one loop, built to be screen-recorded. See [PRD.md](./PRD.md) for the full spec.

Built on **Expo SDK 57** (React Native 0.86, React 19.2, Reanimated 4.5, expo-router with API routes).

## Setup

```sh
npm install
cp .env.example .env   # then paste your Anthropic API key into .env
npx expo start
```

- Press `w` for web, or scan the QR code with Expo Go on a device.
- The backend is an Expo API route at [src/app/api/roast+api.ts](./src/app/api/roast+api.ts) — no separate server. It reads `ANTHROPIC_API_KEY` from `.env` (server-side only, never bundled into the client) and calls `claude-haiku-4-5`.

Without a key the route still responds — you'll just always get the fallback line instead of a fresh roast.

## Where things live

| Piece | File |
| --- | --- |
| The single screen (input → roasting → result) | `src/app/index.tsx` |
| Button collapse + pulsing loading glyph (PRD §7.1–7.2) | `src/components/roast-button.tsx` |
| Roast reveal spring + haptic (PRD §7.3) | `src/components/roast-reveal.tsx` |
| 1080×1080 share card captured by view-shot (PRD §6) | `src/components/share-card.tsx` |
| Design tokens (PRD §6) | `src/constants/theme.ts` |
| Roast endpoint + content-safety guardrail (PRD §9–10) | `src/app/api/roast+api.ts` |
| Tone labels shared by server and client | `src/constants/tones.ts` |
| Day 1 tone-accuracy validation (PRD §11, Appendix A) | `scripts/validate-tones.mjs` |

## Tone validation (Day 1 gate)

Each roast comes back labeled `savage`, `playful`, `absurd`, or `deadpan`, and the reveal animation adapts to it. Before trusting that in the demo, run the batch check with the dev server up:

```sh
npm run validate-tones
```

It sends ~18 varied inputs through `/api/roast` and has a judge model verify each label against how the line actually reads. Pass bar is a mismatch rate under ~15% — above that, fix the tone definitions in the system prompt, not the animation code.

## Deploying

API routes deploy to EAS Hosting: `npx eas-cli deploy`. For a production **native** build, set the deployed URL as the router origin in `app.json` so `fetch("/api/roast")` resolves:

```json
"plugins": [["expo-router", { "origin": "https://your-app.expo.app" }]]
```

Set the key in production with `eas env:create --name ANTHROPIC_API_KEY --environment production`.

## Notes

- Haptics are skipped on web; reduced motion swaps the reveal spring for a plain fade (PRD §7.5).
- Nothing the user types is stored server-side beyond the request.
