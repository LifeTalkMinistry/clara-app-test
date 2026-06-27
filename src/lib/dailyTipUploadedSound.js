import dailyMoneyTipSoundUrl from "@/assets/sounds/daily-money-tip.mp3.wav";

let dailyTipAudio = null;

export function playUploadedDailyTipSound() {
  if (typeof window === "undefined") return false;

  if (!dailyTipAudio) {
    dailyTipAudio = new window.Audio(dailyMoneyTipSoundUrl);
    dailyTipAudio.preload = "auto";
  }

  dailyTipAudio.pause();
  dailyTipAudio.currentTime = 0;
  dailyTipAudio.volume = 1;
  void dailyTipAudio.play();
  return true;
}
