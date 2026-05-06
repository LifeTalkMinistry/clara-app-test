import React from "react";

/**
 * Temporary extraction shell for Dashboard feed system.
 *
 * PURPOSE:
 * - Reduce Dashboard.jsx size
 * - Prepare full feed migration
 * - Isolate realtime/social logic from dashboard core
 *
 * NEXT PHASE:
 * - Move feed realtime logic
 * - Move composer
 * - Move comments
 * - Move media renderer
 * - Move Supabase listeners
 */

export default function DashboardFeedPanel({
  onBack,
  children,
}) {
  return (
    <div className="space-y-4">
      {children}
    </div>
  );
}
