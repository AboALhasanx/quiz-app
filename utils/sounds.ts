// utils/sounds.ts
import { Audio } from "expo-av";

const SOUND_ENABLED = true; // ✅

export async function playCorrect() {
  if (!SOUND_ENABLED) return;
  const { sound } = await Audio.Sound.createAsync(
    require("../assets/sounds/correct.mp3")
  );
  await sound.playAsync();
}

export async function playWrong() {
  if (!SOUND_ENABLED) return;
  const { sound } = await Audio.Sound.createAsync(
    require("../assets/sounds/wrong.mp3")
  );
  await sound.playAsync();
}