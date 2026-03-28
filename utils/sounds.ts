// utils/sounds.ts
import { Audio } from "expo-av";

export async function playCorrect() {
  const { sound } = await Audio.Sound.createAsync(
    require("../assets/sounds/correct.mp3")
  );
  await sound.playAsync();
}

export async function playWrong() {
  const { sound } = await Audio.Sound.createAsync(
    require("../assets/sounds/wrong.mp3")
  );
  await sound.playAsync();
}