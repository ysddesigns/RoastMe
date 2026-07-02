// Design tokens per PRD §6 — brutalist, high contrast, one accent.
export const color = {
  bg: "#0A0A0A",
  text: "#F5F5F0",
  // Reserved ONLY for the roast text and the primary button.
  accent: "#FF3B30",
  muted: "#6B6B6B",
} as const;

export const font = {
  // Loaded in app/_layout.tsx via @expo-google-fonts/inter.
  display: "Inter_900Black",
  body: "Inter_400Regular",
  bodyBold: "Inter_700Bold",
} as const;

export const radius = 0;

export const unit = 8;
