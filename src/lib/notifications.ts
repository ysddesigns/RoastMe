import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Local re-engagement reminder only — no server, no push tokens, no accounts.
// Fits the app's "nothing is stored" ethos: the reminder lives entirely on
// the device and is cancelled the moment the user comes back.
const REMINDER_ID = "roastme-come-back";
const REMINDER_DELAY_SECONDS = 60 * 60 * 20; // ~20h after backgrounding

const REMINDER_LINES = [
  "Still stinging? One more won't kill you.",
  "I've got more where that came from.",
  "You've been suspiciously quiet. Come back and get roasted.",
  "The roast machine misses you. Concerning, but true.",
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "RoastMe",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: "#FF3B30",
  });
}

// Call after the user has actually seen a roast — asking for permission on
// cold open, before they've felt any value, just trains them to say no.
export async function requestPermissionsIfNeeded() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  if (!current.canAskAgain) {
    return false;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleComeBackReminder() {
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  // Replace, don't stack — only one reminder should ever be pending.
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  const body = REMINDER_LINES[Math.floor(Math.random() * REMINDER_LINES.length)];

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: "Roast Me",
      body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: REMINDER_DELAY_SECONDS,
      repeats: false,
    },
  });
}

export async function cancelComeBackReminder() {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
}
