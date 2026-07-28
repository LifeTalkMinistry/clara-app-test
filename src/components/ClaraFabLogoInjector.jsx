// The old implementation polled the entire document every 800ms, measured every
// button with getBoundingClientRect(), and mutated whichever button happened to
// be near the bottom center of the screen. On mobile PWAs—especially the dense
// Settings panel—that forced repeated layout work and could alter unrelated
// buttons while scrolling.
//
// Keep this compatibility component as a no-op until the intended CLARA FAB logo
// is rendered directly by its owning React component.
export default function ClaraFabLogoInjector() {
  return null;
}
