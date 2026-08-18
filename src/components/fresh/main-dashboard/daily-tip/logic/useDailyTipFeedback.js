import { useCallback, useEffect, useRef, useState } from "react";
import {
  getLocalDailyTipReaction,
  hydrateDailyTipFeedback,
  persistDailyTipReaction,
  recordDailyTipImpression,
} from "@/lib/daily-tip-feedback";
import {
  fetchDailyTipLibrary,
  getCachedDailyTipRevision,
} from "@/lib/daily-tip-library";
import "../ui/daily-tip-feedback.css";

const NOTICE_DURATION_MS = 2600;

function reactionSuccessMessage(reaction) {
  if (reaction === "like") return "Liked ✓";
  if (reaction === "dislike") return "Disliked ✓";
  return "Feedback removed";
}

function normalizeRevision(value) {
  const revision = Number(value);
  return Number.isInteger(revision) && revision > 0 ? revision : 1;
}

export default function useDailyTipFeedback({
  userId,
  tipId,
  tipRevision,
  enabled = true,
  revealed = false,
} = {}) {
  const explicitRevision = Number.isInteger(Number(tipRevision)) && Number(tipRevision) > 0
    ? Number(tipRevision)
    : null;
  const [resolvedRevision, setResolvedRevision] = useState(() =>
    normalizeRevision(explicitRevision || getCachedDailyTipRevision(tipId) || 1),
  );
  const revision = explicitRevision || resolvedRevision;
  const [reaction, setReaction] = useState(() =>
    enabled ? getLocalDailyTipReaction(userId, tipId, revision) : null,
  );
  const [saving, setSaving] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  const noticeTimerRef = useRef(null);
  const actionVersionRef = useRef(0);

  useEffect(() => {
    if (explicitRevision || !tipId) {
      if (explicitRevision) setResolvedRevision(explicitRevision);
      return undefined;
    }

    const cached = getCachedDailyTipRevision(tipId);
    if (cached) {
      setResolvedRevision(normalizeRevision(cached));
      return undefined;
    }

    let cancelled = false;
    fetchDailyTipLibrary()
      .then((library) => {
        if (cancelled) return;
        const current = library.find((tip) => tip.id === tipId);
        if (current?.revision) setResolvedRevision(normalizeRevision(current.revision));
      })
      .catch(() => {
        // Revision 1 remains the bundled/offline compatibility default.
      });

    return () => {
      cancelled = true;
    };
  }, [explicitRevision, tipId]);

  const showNotice = useCallback((message) => {
    setSyncNotice(message);
    if (typeof window === "undefined") return;
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => {
      setSyncNotice("");
      noticeTimerRef.current = null;
    }, NOTICE_DURATION_MS);
  }, []);

  useEffect(() => {
    setSyncNotice("");
    setReaction(enabled ? getLocalDailyTipReaction(userId, tipId, revision) : null);
    if (!enabled || !tipId) return undefined;

    const requestVersion = actionVersionRef.current;
    let cancelled = false;

    hydrateDailyTipFeedback(userId)
      .then((feedback) => {
        if (cancelled || requestVersion !== actionVersionRef.current) return;
        const state = feedback?.[tipId];
        const hydratedRevision = normalizeRevision(state?.revision);
        const hydrated = hydratedRevision === revision ? state?.reaction : null;
        setReaction(hydrated === "like" || hydrated === "dislike" ? hydrated : null);
      })
      .catch((error) => {
        console.warn("Unable to hydrate Daily Money Tip feedback:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, revision, tipId, userId]);

  useEffect(() => {
    if (!enabled || !revealed || !tipId) return;
    recordDailyTipImpression(userId, tipId, revision).catch((error) => {
      console.warn("Unable to record Daily Money Tip impression:", error);
    });
  }, [enabled, revealed, revision, tipId, userId]);

  useEffect(() => () => {
    if (typeof window !== "undefined" && noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
  }, []);

  const react = useCallback(async (requestedReaction) => {
    if (!enabled || !tipId || saving) return;
    const nextReaction = reaction === requestedReaction ? null : requestedReaction;
    actionVersionRef.current += 1;
    setReaction(nextReaction);
    setSaving(true);
    setSyncNotice("");

    try {
      await persistDailyTipReaction(userId, tipId, revision, nextReaction);
      showNotice(reactionSuccessMessage(nextReaction));
    } catch (error) {
      console.warn("Unable to sync Daily Money Tip feedback:", error);
      showNotice(reactionSuccessMessage(nextReaction));
    } finally {
      setSaving(false);
    }
  }, [enabled, reaction, revision, saving, showNotice, tipId, userId]);

  return { reaction, saving, syncNotice, react };
}
