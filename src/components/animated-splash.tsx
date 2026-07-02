import { Blur, Canvas, Circle, Group, RadialGradient, vec } from "@shopify/react-native-skia";
import { useEffect, useMemo } from "react";
import { Dimensions, Platform, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { color, font } from "@/constants/theme";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const ORB_RADIUS = SCREEN_W * 0.2;
const ORB_CENTER = { x: SCREEN_W / 2, y: SCREEN_H / 2 };
const PARTICLE_COUNT = 26;
const PARTICLE_COLORS = [color.text, color.text, color.muted, color.accent];

type Props = {
  onFinish: () => void;
};

// Scatter -> glass-orb reveal -> pop, then hard-cut to the Home screen
// already mounted underneath. Kept short (~2.7s) — PRD targets <10s from
// cold open to first roast, so the splash can't eat that budget.
export function AnimatedSplash({ onFinish }: Props) {
  const reducedMotion = useReducedMotion();
  const particlesOpacity = useSharedValue(1);
  const glyphScale = useSharedValue(0.6);
  const glyphOpacity = useSharedValue(1);
  const orbScale = useSharedValue(0);
  const highlight = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  const particles = useMemo(() => makeParticles(), []);

  useEffect(() => {
    if (reducedMotion) {
      containerOpacity.value = withTiming(0, { duration: 150 }, (finished) => {
        if (finished) runOnJS(onFinish)();
      });
      return;
    }

    particlesOpacity.value = withDelay(800, withTiming(0, { duration: 300 }));

    orbScale.value = withDelay(
      850,
      withSequence(
        withTiming(1, { duration: 550, easing: Easing.out(Easing.back(1.2)) }),
        withTiming(1.04, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        // pop
        withTiming(1.2, { duration: 140, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 180, easing: Easing.in(Easing.cubic) }),
      ),
    );

    glyphScale.value = withDelay(
      850,
      withTiming(1, { duration: 550, easing: Easing.out(Easing.back(1.2)) }),
    );

    highlight.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.linear }), -1);

    glyphOpacity.value = withDelay(2650, withTiming(0, { duration: 120 }));

    containerOpacity.value = withDelay(
      2780,
      withTiming(0, { duration: 120 }, (finished) => {
        if (finished) runOnJS(onFinish)();
      }),
    );
  }, [reducedMotion, onFinish, particlesOpacity, orbScale, glyphScale, glyphOpacity, highlight, containerOpacity]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const particlesStyle = useAnimatedStyle(() => ({ opacity: particlesOpacity.value }));
  const glyphStyle = useAnimatedStyle(() => ({
    opacity: glyphOpacity.value,
    transform: [{ scale: 0.5 + glyphScale.value * 0.9 }],
  }));
  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, containerStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, particlesStyle]}>
        {particles.map((p) => (
          <Particle key={p.id} particle={p} paused={reducedMotion} />
        ))}
      </Animated.View>

      {!reducedMotion && (
        <Animated.View style={[StyleSheet.absoluteFill, orbStyle]}>
          {Platform.OS === "web" ? (
            // react-native-skia needs LoadSkiaWeb() + a wasm asset on web; RoastMe
            // targets iOS/Android, so web gets a plain glow instead of the shader orb.
            <View style={styles.orbFallback} />
          ) : (
            <Canvas style={StyleSheet.absoluteFill}>
              <Group>
                <Circle cx={ORB_CENTER.x} cy={ORB_CENTER.y} r={ORB_RADIUS}>
                  <RadialGradient
                    c={vec(ORB_CENTER.x, ORB_CENTER.y)}
                    r={ORB_RADIUS}
                    colors={["#262626", "#0A0A0A"]}
                  />
                </Circle>
                <SpecularHighlight highlight={highlight} />
              </Group>
            </Canvas>
          )}
        </Animated.View>
      )}

      <Animated.Text style={[styles.glyph, glyphStyle]}>✦</Animated.Text>
    </Animated.View>
  );
}

function SpecularHighlight({ highlight }: { highlight: SharedValue<number> }) {
  // Two soft blurred highlights sweep opposite arcs around the orb rim —
  // the "moving light on glass" cue, restrained to off-white + one red glint.
  const ax = useDerivedValue(
    () => ORB_CENTER.x + Math.cos(highlight.value * Math.PI * 2) * ORB_RADIUS * 0.62,
  );
  const ay = useDerivedValue(
    () => ORB_CENTER.y + Math.sin(highlight.value * Math.PI * 2) * ORB_RADIUS * 0.62,
  );
  const bx = useDerivedValue(
    () => ORB_CENTER.x + Math.cos(highlight.value * Math.PI * 2 + Math.PI * 0.85) * ORB_RADIUS * 0.62,
  );
  const by = useDerivedValue(
    () => ORB_CENTER.y + Math.sin(highlight.value * Math.PI * 2 + Math.PI * 0.85) * ORB_RADIUS * 0.62,
  );

  return (
    <>
      <Circle cx={ax} cy={ay} r={ORB_RADIUS * 0.22} color={color.text} opacity={0.16}>
        <Blur blur={18} />
      </Circle>
      <Circle cx={bx} cy={by} r={ORB_RADIUS * 0.14} color={color.accent} opacity={0.14}>
        <Blur blur={16} />
      </Circle>
    </>
  );
}

type ParticleData = {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  drift: number;
};

function makeParticles(): ParticleData[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, id) => ({
    id,
    x: Math.random() * SCREEN_W,
    y: SCREEN_H * 0.08 + Math.random() * SCREEN_H * 0.44,
    size: 4 + Math.random() * 6,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    duration: 2600 + Math.random() * 1400,
    drift: (Math.random() - 0.5) * 40,
  }));
}

function Particle({ particle, paused }: { particle: ParticleData; paused: boolean }) {
  const rise = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (paused) return;
    rise.value = withRepeat(
      withTiming(1, { duration: particle.duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    rotate.value = withRepeat(
      withTiming(1, { duration: particle.duration * 1.4, easing: Easing.linear }),
      -1,
    );
  }, [paused, particle.duration, rise, rotate]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -rise.value * 60 },
      { translateX: rise.value * particle.drift },
      { rotate: `${rotate.value * 90}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: particle.x,
          top: particle.y,
          width: particle.size,
          height: particle.size,
          backgroundColor: particle.color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: color.bg,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  orbFallback: {
    position: "absolute",
    left: ORB_CENTER.x - ORB_RADIUS,
    top: ORB_CENTER.y - ORB_RADIUS,
    width: ORB_RADIUS * 2,
    height: ORB_RADIUS * 2,
    borderRadius: ORB_RADIUS,
    backgroundColor: "#262626",
  },
  glyph: {
    position: "absolute",
    left: 0,
    right: 0,
    top: ORB_CENTER.y - 24,
    textAlign: "center",
    color: color.text,
    fontFamily: font.bodyBold,
    fontSize: 32,
  },
});
