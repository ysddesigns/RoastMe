import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { color, font, unit } from "@/constants/theme";

const CIRCLE_SIZE = 64;

type Props = {
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
};

// PRD §7.1–7.2: button collapses in place into a circle, then a spark pulses
// inside it while the roast generates. No navigation, no spinner.
export function RoastButton({ loading, disabled, onPress }: Props) {
  const reducedMotion = useReducedMotion();
  const [fullWidth, setFullWidth] = useState(0);
  const morph = useSharedValue(0);
  const textOpacity = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (loading) {
      // Text fades first (100ms), then the shape morphs (200ms) — §7.1.
      textOpacity.value = withTiming(0, { duration: 100 });
      morph.value = withDelay(
        100,
        withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
      );
      if (!reducedMotion) {
        // §7.2 "thinking" pulse — stays as-is no matter how long the wait.
        pulse.value = withRepeat(
          withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        );
      }
    } else {
      cancelAnimation(pulse);
      pulse.value = 1;
      morph.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
      textOpacity.value = withDelay(150, withTiming(1, { duration: 100 }));
    }
  }, [loading, reducedMotion, morph, textOpacity, pulse]);

  const shapeStyle = useAnimatedStyle(() => ({
    width:
      fullWidth > 0
        ? interpolate(morph.value, [0, 1], [fullWidth, CIRCLE_SIZE])
        : undefined,
    borderRadius: interpolate(morph.value, [0, 1], [0, CIRCLE_SIZE / 2]),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const glyphStyle = useAnimatedStyle(() => ({
    opacity: morph.value,
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View
      style={{ alignItems: "center" }}
      onLayout={(e) => setFullWidth(e.nativeEvent.layout.width)}
    >
      <Pressable
        disabled={disabled || loading}
        onPressIn={() => {
          // §7.1: haptic fires on tap-down, before anything animates or loads.
          if (process.env.EXPO_OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Roast me"
        style={{ width: "100%", alignItems: "center" }}
      >
        <Animated.View
          style={[
            {
              height: CIRCLE_SIZE,
              width: "100%",
              backgroundColor: color.accent,
              opacity: disabled && !loading ? 0.35 : 1,
              alignItems: "center",
              justifyContent: "center",
              borderCurve: "continuous",
            },
            shapeStyle,
          ]}
        >
          <Animated.Text
            style={[
              {
                color: color.bg,
                fontFamily: font.bodyBold,
                fontSize: 2.25 * unit,
                letterSpacing: 1,
                textTransform: "uppercase",
              },
              labelStyle,
            ]}
          >
            Roast me
          </Animated.Text>
          <Animated.View style={[{ position: "absolute" }, glyphStyle]}>
            <Text style={{ color: color.text, fontSize: 3 * unit }}>✦</Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}
