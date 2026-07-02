// Day 1 tone-accuracy validation (PRD §11).
// Runs varied inputs through the /roast endpoint, then has a judge model check
// whether each returned `tone` honestly matches how the roast reads.
//
// Usage: start the dev server (`npx expo start`), then `npm run validate-tones`.
// Needs ANTHROPIC_API_KEY (read from .env if present) for both the endpoint and the judge.

import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

// Load .env so the judge works without exporting the key manually.
if (!process.env.ANTHROPIC_API_KEY && fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const API_URL = process.env.ROAST_API_URL ?? "http://localhost:8081/api/roast";
const MISMATCH_THRESHOLD = 0.15; // PRD pass bar: mismatch rate under ~10-15%

const TEST_INPUTS = [
  "I spent my whole day debugging a semicolon",
  "I meal prepped for the week and ate all of it by Tuesday",
  "I have 47 unread books and I just bought another one",
  "I said 'you too' when the waiter said enjoy your meal",
  "I've been learning guitar for three years and know four chords",
  "My houseplants keep dying no matter what I do",
  "I set six alarms and still overslept",
  "I opened the fridge five times hoping new food would appear",
  "I practiced my order in my head and still messed it up",
  "I bought a gym membership in January, it's July",
  "I watched an entire series instead of writing my thesis",
  "I texted 'on my way' from my bed",
  "My code works and I have no idea why",
  "I organized my desktop by making a folder called 'stuff 2'",
  "I told everyone I'm a morning person, I am not a morning person",
  "I clapped when the plane landed",
  "I re-read my own old tweets and laughed",
  "I put the empty milk carton back in the fridge",
];

// Judge prompt — used verbatim from the PRD's tone-accuracy validation spec.
const judgePrompt = (roast, tone) => `You are reviewing a roast-generator's self-labeled tone for consistency.

You will be given a short roast line and the tone it labeled itself as:
savage, playful, absurd, or deadpan.

Definitions:
- savage: a hard, direct hit — no softness, meant to sting a little
- playful: light, silly, clearly affectionate under the jab
- absurd: surreal or nonsensical, funny because it's unexpected/weird
- deadpan: dry, flat, underplayed — funny because of what it withholds, not what it says

Roast: "${roast}"
Labeled tone: ${tone}

Does the labeled tone honestly match how this roast actually reads?
Answer with only one word: MATCH or MISMATCH.
If MISMATCH, on a second line, state which tone it should have been instead.`;

const client = new Anthropic();

async function getRoast(input) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) throw new Error(`${API_URL} -> HTTP ${res.status}`);
  return res.json();
}

async function judge(roast, tone) {
  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 50,
    messages: [{ role: "user", content: judgePrompt(roast, tone) }],
  });
  const text = message.content.find((b) => b.type === "text")?.text.trim() ?? "";
  const [verdictLine, ...rest] = text.split("\n");
  return {
    match: verdictLine.trim().toUpperCase().startsWith("MATCH"),
    shouldBe: rest.join(" ").trim().toLowerCase() || null,
  };
}

const results = [];
for (const input of TEST_INPUTS) {
  const { roast, tone } = await getRoast(input);
  const verdict = await judge(roast, tone);
  results.push({ input, roast, tone, ...verdict });
  const flag = verdict.match ? "  ok " : ">> X ";
  console.log(`${flag}[${tone}] ${roast}${verdict.match ? "" : `  (judge: ${verdict.shouldBe})`}`);
}

const mismatches = results.filter((r) => !r.match);
const rate = mismatches.length / results.length;

// PRD: if mismatches cluster on one tone, that tone's definition in the system
// prompt is too close to a neighbor — tighten the prompt, don't add a fifth tone.
const byTone = {};
for (const m of mismatches) byTone[m.tone] = (byTone[m.tone] ?? 0) + 1;

console.log(`\n${results.length} roasts, ${mismatches.length} mismatches — rate ${(rate * 100).toFixed(0)}%`);
if (mismatches.length > 0) {
  console.log("Mismatches by labeled tone:", byTone);
}
if (rate > MISMATCH_THRESHOLD) {
  console.log(
    `FAIL: above the ~${MISMATCH_THRESHOLD * 100}% pass bar. Fix the system prompt's tone-classification wording first — don't compensate in animation code.`,
  );
  process.exit(1);
}
console.log("PASS: tone labels are consistent enough for the §7.3 reveal to trust them.");
