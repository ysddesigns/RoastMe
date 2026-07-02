import Anthropic from "@anthropic-ai/sdk";
import { TONES, type Tone } from "@/constants/tones";

// PRD §9 — one short, brutal, funny line, plus an honest tone label the client
// uses to pick the reveal animation (§7.3). Iterate on this prompt more than on UI.
const SYSTEM_PROMPT =
  "You are a savage, witty roast comedian. Given the user's input, respond with exactly ONE short, " +
  "brutal, funny line. Maximum 20 words. No preamble, no disclaimers, no \"here's your roast\" — " +
  "output only the roast line itself. Be clever, not cruel — the target should laugh, not feel " +
  "actually hurt. Never reference self-harm, appearance, race, or anything punching at a protected " +
  "trait — keep it about the situation they described, not who they are.\n\n" +
  "Also label the tone of the line you wrote. Label it honestly — by how the line actually reads, " +
  "not by what you were aiming for. Exactly one of:\n" +
  "- savage: a hard, direct hit — no softness, meant to sting a little\n" +
  "- playful: light, silly, clearly affectionate under the jab\n" +
  "- absurd: surreal or nonsensical, funny because it's unexpected/weird\n" +
  "- deadpan: dry, flat, underplayed — funny because of what it withholds, not what it says";

// PRD §10 — refuse to roast clearly sensitive input, with a graceful fallback instead of a forced joke.
const SENSITIVE_PATTERNS = [
  /suicid/i,
  /self[\s-]?harm/i,
  /kill(ing)?\s+(myself|me)\b/i,
  /\bkms\b/i,
  /end(ing)?\s+(my|it\s+all)\s*(life)?\b/i,
  /hurt(ing)?\s+myself/i,
  /\bcutting myself\b/i,
];

const GRACEFUL_FALLBACK =
  "Not roasting that one. Some things deserve a real conversation, not a punchline. Be kind to yourself.";

const GENERIC_FALLBACK = "You broke the roast machine. Honestly? That tracks.";

export async function POST(request: Request) {
  let input: unknown;
  try {
    ({ input } = await request.json());
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof input !== "string" || input.trim().length === 0) {
    return Response.json({ error: "input must be a non-empty string" }, { status: 400 });
  }

  const text = input.trim().slice(0, 300);

  if (SENSITIVE_PATTERNS.some((re) => re.test(text))) {
    return Response.json({ roast: GRACEFUL_FALLBACK, tone: "deadpan" satisfies Tone });
  }

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      // Structured output guarantees a parseable {roast, tone} — no regex scraping.
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              roast: { type: "string", description: "The single roast line, max 20 words" },
              tone: { type: "string", enum: [...TONES] },
            },
            required: ["roast", "tone"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: text }],
    });

    if (message.stop_reason === "refusal") {
      return Response.json({ roast: GRACEFUL_FALLBACK, tone: "deadpan" satisfies Tone });
    }

    const block = message.content.find((b) => b.type === "text");
    const parsed = block?.type === "text" ? JSON.parse(block.text) : null;
    const roast = typeof parsed?.roast === "string" ? parsed.roast.trim() : "";
    const tone: Tone = TONES.includes(parsed?.tone) ? parsed.tone : "savage";

    if (!roast) {
      return Response.json({ roast: GENERIC_FALLBACK, tone: "deadpan" satisfies Tone });
    }
    return Response.json({ roast, tone });
  } catch (error) {
    console.error("Roast generation failed:", error);
    return Response.json(
      { roast: GENERIC_FALLBACK, tone: "deadpan" satisfies Tone },
      { status: 200 },
    );
  }
}
