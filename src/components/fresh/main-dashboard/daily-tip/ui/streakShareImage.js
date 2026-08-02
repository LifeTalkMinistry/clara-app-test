const SHAREABLE_STREAK_EVENTS = new Set([
  "daily_check_in_completed",
  "streak_7_day",
  "streak_14_day",
  "streak_30_completed",
  "new_longest_streak",
]);

export function isShareableStreakEvent(eventType) {
  return SHAREABLE_STREAK_EVENTS.has(eventType);
}

export function getEventStreakCount(event) {
  const streakCount = Math.max(0, Number(event?.streakCount) || 0);
  if (streakCount > 0) return streakCount;

  switch (event?.type) {
    case "streak_7_day":
      return 7;
    case "streak_14_day":
      return 14;
    case "streak_30_completed":
      return 30;
    default:
      return 1;
  }
}

function getShareCardCopy(event) {
  const streakCount = getEventStreakCount(event);

  if (event?.type === "streak_30_completed" || streakCount >= 30) {
    return {
      streakCount,
      headline: "I COMPLETED 30 DAYS OF CONSISTENCY",
      message: "I kept showing up for my money discipline, one thoughtful day at a time.",
      progressLabel: "30-DAY GOAL COMPLETE",
    };
  }

  if (streakCount === 1) {
    return {
      streakCount,
      headline: "I SHOWED UP TODAY",
      message: "Day 1 is complete. I started building a more intentional money habit.",
      progressLabel: "1/30 DAILY CHECK-INS",
    };
  }

  return {
    streakCount,
    headline: `I SHOWED UP FOR ${streakCount} DAYS STRAIGHT`,
    message: "Another day protected. Another promise to myself kept. I am building the discipline.",
    progressLabel: `${Math.min(streakCount, 30)}/30 DAILY CHECK-INS`,
  };
}

function roundedRectPath(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function fillRoundedRect(context, x, y, width, height, radius, fillStyle) {
  roundedRectPath(context, x, y, width, height, radius);
  context.fillStyle = fillStyle;
  context.fill();
}

function strokeRoundedRect(context, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
  roundedRectPath(context, x, y, width, height, radius);
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.stroke();
}

function drawSpacedText(context, text, x, y, spacing) {
  let cursorX = x;
  for (const character of text) {
    context.fillText(character, cursorX, y);
    cursorX += context.measureText(character).width + spacing;
  }
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !currentLine) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
    if (lines.length === maxLines - 1) break;
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine);

  const consumedWords = lines.join(" ").split(/\s+/).filter(Boolean).length;
  if (consumedWords < words.length && lines.length > 0) {
    let lastLine = lines[lines.length - 1];
    while (lastLine && context.measureText(`${lastLine}…`).width > maxWidth) {
      lastLine = lastLine.slice(0, -1).trimEnd();
    }
    lines[lines.length - 1] = `${lastLine}…`;
  }

  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return y + Math.max(0, lines.length - 1) * lineHeight;
}

function canvasToPngBlob(canvas) {
  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("Unable to generate the streak image.");

  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: "image/png" });
}

export function createStreakShareImage(event) {
  if (typeof document === "undefined") {
    throw new Error("Sharing is unavailable in this environment.");
  }

  const shareCopy = getShareCardCopy(event);
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare the streak image.");

  const background = context.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, "#071d35");
  background.addColorStop(0.45, "#0b3557");
  background.addColorStop(1, "#21104c");
  context.fillStyle = background;
  context.fillRect(0, 0, 1080, 1350);

  const glowOne = context.createRadialGradient(150, 120, 0, 150, 120, 420);
  glowOne.addColorStop(0, "rgba(34, 211, 238, 0.35)");
  glowOne.addColorStop(1, "rgba(34, 211, 238, 0)");
  context.fillStyle = glowOne;
  context.fillRect(0, 0, 620, 620);

  const glowTwo = context.createRadialGradient(920, 1160, 0, 920, 1160, 480);
  glowTwo.addColorStop(0, "rgba(129, 92, 246, 0.32)");
  glowTwo.addColorStop(1, "rgba(129, 92, 246, 0)");
  context.fillStyle = glowTwo;
  context.fillRect(480, 700, 600, 650);

  fillRoundedRect(context, 58, 58, 964, 1234, 62, "rgba(6, 24, 49, 0.74)");
  strokeRoundedRect(context, 58, 58, 964, 1234, 62, "rgba(165, 243, 252, 0.24)", 3);

  context.fillStyle = "#a5f3fc";
  context.font = '900 34px "Arial Black", Arial, sans-serif';
  drawSpacedText(context, "CLARA", 112, 142, 7);

  context.fillStyle = "rgba(207, 250, 254, 0.66)";
  context.font = '700 22px Arial, sans-serif';
  context.fillText("ASK BEFORE YOU SPEND", 112, 184);

  fillRoundedRect(context, 780, 102, 188, 70, 35, "rgba(165, 243, 252, 0.10)");
  strokeRoundedRect(context, 780, 102, 188, 70, 35, "rgba(165, 243, 252, 0.22)", 2);
  context.fillStyle = "#cffafe";
  context.font = '900 21px "Arial Black", Arial, sans-serif';
  context.textAlign = "center";
  context.fillText("DAILY STREAK", 874, 146);

  context.textAlign = "left";
  context.fillStyle = "rgba(165, 243, 252, 0.72)";
  context.font = '900 24px "Arial Black", Arial, sans-serif';
  drawSpacedText(context, "FINANCIAL DISCIPLINE", 112, 300, 3);

  context.fillStyle = "#ffffff";
  context.font = '900 78px "Arial Black", Arial, sans-serif';
  drawWrappedText(context, shareCopy.headline, 112, 390, 856, 88, 3);

  const ringGradient = context.createLinearGradient(316, 570, 764, 1018);
  ringGradient.addColorStop(0, "rgba(103, 232, 249, 0.86)");
  ringGradient.addColorStop(1, "rgba(167, 139, 250, 0.86)");
  context.beginPath();
  context.arc(540, 760, 206, 0, Math.PI * 2);
  context.strokeStyle = ringGradient;
  context.lineWidth = 18;
  context.stroke();

  context.beginPath();
  context.arc(540, 760, 176, 0, Math.PI * 2);
  context.fillStyle = "rgba(12, 39, 73, 0.90)";
  context.fill();

  context.textAlign = "center";
  context.fillStyle = "#ffffff";
  context.font = '900 220px "Arial Black", Arial, sans-serif';
  context.fillText(String(shareCopy.streakCount), 540, 815);

  context.fillStyle = "#a5f3fc";
  context.font = '900 31px "Arial Black", Arial, sans-serif';
  context.fillText(shareCopy.streakCount === 1 ? "DAY" : "DAYS", 540, 884);

  const progressCount = Math.min(shareCopy.streakCount, 30);
  const dotStartX = 142;
  const dotStartY = 1030;
  const dotGapX = 88;
  const dotGapY = 54;

  for (let index = 0; index < 30; index += 1) {
    const row = Math.floor(index / 10);
    const column = index % 10;
    const x = dotStartX + column * dotGapX;
    const y = dotStartY + row * dotGapY;

    context.beginPath();
    context.arc(x, y, 12, 0, Math.PI * 2);
    context.fillStyle = index < progressCount ? "#a5f3fc" : "rgba(165, 243, 252, 0.16)";
    context.fill();

    if (index === progressCount - 1 && progressCount < 30) {
      context.beginPath();
      context.arc(x, y, 21, 0, Math.PI * 2);
      context.strokeStyle = "rgba(255, 255, 255, 0.72)";
      context.lineWidth = 4;
      context.stroke();
    }
  }

  context.fillStyle = "rgba(207, 250, 254, 0.72)";
  context.font = '900 22px "Arial Black", Arial, sans-serif';
  context.fillText(shareCopy.progressLabel, 540, 1197);

  context.textAlign = "left";
  context.fillStyle = "rgba(236, 254, 255, 0.80)";
  context.font = '700 27px Arial, sans-serif';
  drawWrappedText(context, shareCopy.message, 112, 1250, 856, 38, 2);

  return canvasToPngBlob(canvas);
}

export function downloadShareImage(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
