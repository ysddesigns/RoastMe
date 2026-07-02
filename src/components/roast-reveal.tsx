import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { color, font, unit } from "@/constants/theme";
import type { Tone } from "@/constants/tones";

// PRD §7.3 — the reveal matches the tone the roast labeled itself with, so the
// animation lands the joke instead of fighting it. `savage` is the original
// hard-hit spec; the others soften, wobble, or withhold accordingly.
const TONE_REVEAL = {
  savage: {
    fromScale: 0.85,
    spring: { damping: 12, stiffness: 180 },
    rotate: 0,
    haptic: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  },
  playful: {
    fromScale: 0.9,
    spring: { damping: 9, stiffness: 180 }, // bouncier — the jab is affectionate
    rotate: 0,
    haptic: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  },
  absurd: {
    fromScale: 0.85,
    spring: { damping: 7, stiffness: 150 }, // loose overshoot + a tilt it recovers from
    rotate: -2,
    haptic: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  },
  deadpan: {
    fromScale: 1, // no overshoot at all — the reveal underplays, like the line
    spring: null,
    rotate: 0,
    haptic: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),
  },
} as const;

export function RoastReveal({ roast, tone }: { roast: string; tone: Tone }) {
  const reducedMotion = useReducedMotion();
  const reveal = TONE_REVEAL[tone];
  const animate = !reducedMotion && reveal.spring !== null;
  const scale = useSharedValue(animate ? reveal.fromScale : 1);
  const rotate = useSharedValue(animate ? reveal.rotate : 0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Haptic and animation start in the same callback — never fired from two places.
    if (process.env.EXPO_OS !== "web") {
      reveal.haptic();
    }
    if (animate && reveal.spring) {
      scale.value = withSpring(1, reveal.spring);
      rotate.value = withSpring(0, reveal.spring);
      opacity.value = withTiming(1, { duration: 180 });
    } else {
      // §7.5 reduced-motion path, and deadpan's deliberate non-event.
      opacity.value = withTiming(1, { duration: 150 });
    }
  }, [animate, reveal, scale, rotate, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  const fontSize = roast.length > 120 ? 4 * unit : roast.length > 60 ? 5 * unit : 6 * unit;

  return (
    <Animated.Text
      selectable
      style={[
        {
          color: color.accent,
          fontFamily: font.display,
          fontSize,
          lineHeight: fontSize * 1.15,
        },
        style,
      ]}
    >
      {roast}
    </Animated.Text>
  );
}
