// Shared between the /api/roast route (labels the tone) and the client
// (picks the §7.3 reveal animation from it). Keep dependency-free — this is
// imported by both the server bundle and the app bundle.
export const TONES = ["savage", "playful", "absurd", "deadpan"] as const;
export type Tone = (typeof TONES)[number];
