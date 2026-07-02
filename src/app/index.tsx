import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { captureRef } from "react-native-view-shot";
import { RoastButton } from "@/components/roast-button";
import { RoastReveal } from "@/components/roast-reveal";
import { SHARE_CARD_SIZE, ShareCard } from "@/components/share-card";
import { color, font, unit } from "@/constants/theme";
import { TONES, type Tone } from "@/constants/tones";

const MAX_INPUT_LENGTH = 300;

// Three states, two screens' worth of UI, one route (PRD §4). Result is UI
// state, not a navigation — the button morphs in place instead of a page change.
type Phase = "input" | "roasting" | "result";

export default function RoastScreen() {
  const [phase, setPhase] = useState<Phase>("input");
  const [input, setInput] = useState("");
  const [roast, setRoast] = useState("");
  const [tone, setTone] = useState<Tone>("savage");
  const [error, setError] = useState("");
  const cardRef = useRef<View>(null);

  async function requestRoast() {
    setError("");
    setPhase("roasting");
    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim().slice(0, MAX_INPUT_LENGTH) }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as { roast?: string; tone?: Tone };
      if (!data.roast) {
        throw new Error("Empty roast");
      }
      setRoast(data.roast);
      setTone(data.tone && TONES.includes(data.tone) ? data.tone : "savage");
      setPhase("result");
    } catch {
      setError("The roast got away. Check your connection and try again.");
      setPhase("input");
    }
  }

  async function shareRoast() {
    if (!(await Sharing.isAvailableAsync())) {
      return;
    }
    const uri = await captureRef(cardRef, {
      format: "png",
      quality: 1,
      width: SHARE_CARD_SIZE,
      height: SHARE_CARD_SIZE,
    });
    await Sharing.shareAsync(uri, { mimeType: "image/png" });
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            padding: 3 * unit,
            justifyContent: "center",
            gap: 4 * unit,
          }}
        >
          {phase === "result" ? (
            <View style={{ gap: 6 * unit }}>
              <View style={{ gap: unit }}>
                <Text
                  style={{
                    color: color.muted,
                    fontFamily: font.bodyBold,
                    fontSize: 1.5 * unit,
                    letterSpacing: 3,
                    textTransform: "uppercase",
                  }}
                >
                  {tone}
                </Text>
                <RoastReveal roast={roast} tone={tone} />
              </View>
              <View style={{ gap: 2 * unit }}>
                <ShareButton onPress={shareRoast} />
                <Pressable
                  onPress={requestRoast}
                  accessibilityRole="button"
                  style={{ minHeight: 44, justifyContent: "center", alignItems: "center" }}
                >
                  <Text
                    style={{
                      color: color.muted,
                      fontFamily: font.body,
                      fontSize: 2 * unit,
                    }}
                  >
                    Roast again
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Animated.View entering={FadeIn.duration(150)} style={{ gap: 4 * unit }}>
              <Text
                style={{
                  color: color.text,
                  fontFamily: font.display,
                  fontSize: 5 * unit,
                  lineHeight: 5.5 * unit,
                }}
              >
                Say something.{"\n"}Regret it.
              </Text>
              <TextInput
                multiline
                value={input}
                onChangeText={setInput}
                maxLength={MAX_INPUT_LENGTH}
                editable={phase === "input"}
                placeholder="Tell me something about your day. I'll be honest."
                placeholderTextColor={color.muted}
                style={{
                  minHeight: 15 * unit,
                  color: color.text,
                  fontFamily: font.body,
                  fontSize: 2.25 * unit,
                  lineHeight: 3.25 * unit,
                  borderWidth: 2,
                  borderColor: color.muted,
                  padding: 2 * unit,
                  textAlignVertical: "top",
                }}
              />
              {error ? (
                <Text style={{ color: color.muted, fontFamily: font.body, fontSize: 1.75 * unit }}>
                  {error}
                </Text>
              ) : null}
              <RoastButton
                loading={phase === "roasting"}
                disabled={input.trim().length === 0}
                onPress={requestRoast}
              />
              <Text
                style={{
                  color: color.muted,
                  fontFamily: font.body,
                  fontSize: 1.5 * unit,
                  textAlign: "center",
                }}
              >
                Nothing you type is stored. Read, roasted, forgotten.
              </Text>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Off-screen at export resolution for view-shot capture (PRD §6, §8). */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: -2 * SHARE_CARD_SIZE, top: 0 }}
      >
        <ShareCard ref={cardRef} roast={roast} tone={tone} />
      </View>
    </View>
  );
}

// PRD §7.4 — the one deliberately generic micro-interaction in the app.
function ShareButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withTiming(0.96, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 100 });
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Share roast"
    >
      <Animated.View
        style={[
          {
            height: 7 * unit,
            backgroundColor: color.text,
            alignItems: "center",
            justifyContent: "center",
          },
          style,
        ]}
      >
        <Text
          style={{
            color: color.bg,
            fontFamily: font.bodyBold,
            fontSize: 2.25 * unit,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Share
        </Text>
      </Animated.View>
    </Pressable>
  );
}
