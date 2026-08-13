/**
 * Community Profile scroll ownership compatibility module.
 *
 * The Profile screen is rendered inside Community.jsx, so it must follow the
 * same scroll architecture as the other normal Community views instead of
 * trying to convert the fixed Community shell into a document/body scroller.
 *
 * Canonical ownership:
 * - desktop/browser: the generic Community shell owns vertical scrolling;
 * - phone/Capacitor: the shared Community mobile rules delegate vertical
 *   scrolling to Layout <main>;
 * - CLARA Orb keeps its separately scoped immersive viewport behavior.
 *
 * The former implementation added classes to html/body/#root/Layout/Community
 * ancestors and applied height:auto + overflow:visible through
 * community-profile-scroll.css. That conflicted with the shared Community
 * viewport chain and could leave Profile editor content beyond the reachable
 * scroll range. It is intentionally retired here so there is only one normal
 * Community scroll authority.
 */

export function installCommunityProfileScrollOwnership() {
  // Intentionally empty. Shared Community/Layout CSS owns scrolling.
}
