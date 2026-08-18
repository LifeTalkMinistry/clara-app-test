import { useCallback, useEffect, useRef, useState } from "react";
import {
  getLocalDailyTipReaction,
  hydrateDailyTipFeedback,
  persistDailyTipReaction,
  recordDailyTipImpression,
} from "@/lib/daily-tip-feedback";
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
  tipRevision = 1,
  enabled = true,
  revealed = false,
} = {}) {
  const revision = normalizeRevision(tipRevision);
  const [reaction, setReaction] = useState(() =>
    enabled ? getLocalDailyTipReaction(userId, tipId, revision) : null,
  );
  const [saving, setSaving] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  const noticeTimerRef = useRef(null);
  const actionVersionRef = useRef(0);

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
