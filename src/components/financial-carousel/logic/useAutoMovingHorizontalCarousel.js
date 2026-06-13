import { useCallback, useEffect, useRef, useState } from "react";

const SWIPE_THRESHOLD_PX = 42;
const SLIDE_SETTLE_DELAY_MS = 560;

const clampIndex = (index, length) => {
  if (!length) return 0;
  return Math.max(0, Math.min(length - 1, Number(index) || 0));
};

export default function useAutoMovingHorizontalCarousel({
  itemCount = 0,
  defaultIndex = 0,
  autoMove = true,
  autoMoveMs = 5200,
  resumeDelayMs = 4200,
} = {}) {
  return null;
}
