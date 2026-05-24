// Living with Partner now routes through the main CLARA life-stage diagnosis renderer.
// This file is intentionally kept as a no-op bridge so any existing import remains safe,
// while preventing a second overlay from competing with src/life-stage-apply-diagnosis.js.

export default function installLivingWithPartnerRevealBridge() {
  return null;
}
