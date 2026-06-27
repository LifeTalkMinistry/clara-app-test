import { playUploadedDailyTipSound } from "@/lib/dailyTipUploadedSound";

export function primeDailyTipFlipSound() {
  return true;
}

export function playDailyTipFlipSound() {
  playUploadedDailyTipSound();
}
