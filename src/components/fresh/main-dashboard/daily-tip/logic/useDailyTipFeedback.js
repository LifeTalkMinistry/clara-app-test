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

export default function useDailyTipFeedback({
  userId,
  tipId,
  enabled = true,
  revealed = false,
} = {}) {
  const [reaction, setReaction] = useState(() =>
    enabled ? getLocalDailyTipReaction(userId, tipId) : null,
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
    setReaction(enabled ? getLocalDailyTipReaction(userId, tipId) : null);
    if (!enabled || !tipId) return undefined;

    const requestVersion = actionVersionRef.current;
    let cancelled = false;

    hydrateDailyTipFeedback(userId)
      .then((feedback) => {
        if (cancelled || requestVersion !== actionVersionRef.current) return;
        const hydrated = feedback?.[tipId]?.reaction;
        setReaction(hydrated === "like" || hydrated === "dislike" ? hydrated : null);
      })
      .catch((error) => {
        console.warn("Unable to hydrate Daily Money Tip feedback:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, tipId, userId]);

  useEffect(() => {
    if (!enabled || !revealed || !tipId) return;
    recordDailyTipImpression(userId, tipId).catch((error) => {
      console.warn("Unable to record Daily Money Tip impression:", error);
    });
  }, [enabled, revealed, tipId, userId]);

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
      await persistDailyTipReaction(userId, tipId, nextReaction);
      showNotice(reactionSuccessMessage(nextReaction));
    } catch (error) {
      console.warn("Unable to sync Daily Money Tip feedback:", error);
      showNotice(reactionSuccessMessage(nextReaction));
    } finally {
      setSaving(false);
    }
  }, [enabled, reaction, saving, showNotice, tipId, userId]);

  return { reaction, saving, syncNotice, react };
}
