import { forwardRef } from "react";
import { Text, View } from "react-native";
import { color, font } from "@/constants/theme";
import type { Tone } from "@/constants/tones";

export const SHARE_CARD_SIZE = 1080;

// PRD §6: the share card is a separate artifact from the in-app display,
// rendered off-screen at export resolution (1080×1080) and captured by view-shot.
export const ShareCard = forwardRef<View, { roast: string; tone: Tone }>(function ShareCard(
  { roast, tone },
  ref,
) {
  // Scale type down as the roast gets longer so it always fits the square.
  const fontSize = roast.length > 120 ? 64 : roast.length > 60 ? 80 : 96;

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: SHARE_CARD_SIZE,
        height: SHARE_CARD_SIZE,
        backgroundColor: color.bg,
        padding: 96,
        justifyContent: "space-between",
      }}
    >
      <Text
        style={{
          color: color.muted,
          fontFamily: font.bodyBold,
          fontSize: 36,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        Roast me
      </Text>
      <View style={{ gap: 24 }}>
        <Text
          style={{
            color: color.muted,
            fontFamily: font.bodyBold,
            fontSize: 32,
            letterSpacing: 8,
            textTransform: "uppercase",
          }}
        >
          {tone}
        </Text>
        <Text
          style={{
            color: color.accent,
            fontFamily: font.display,
            fontSize,
            lineHeight: fontSize * 1.1,
          }}
        >
          {roast}
        </Text>
      </View>
      <Text
        style={{
          color: color.muted,
          fontFamily: font.body,
          fontSize: 32,
          alignSelf: "flex-end",
        }}
      >
        get roasted → roastme
      </Text>
    </View>
  );
});
