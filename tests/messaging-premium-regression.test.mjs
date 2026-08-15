import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const read = (path) => fs.readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("message surfaces and unread pollers use the delete-aware view", async () => {
  const [page, notificationSplit, searchRuntime] = await Promise.all([
    read("src/pages/MessagesBackend.jsx"),
    read("src/runtime/installCommunityMessageNotificationSplit.js"),
    read("src/runtime/installMessagesSearchCancel.js"),
  ]);

  assert.match(page, /backendRequest\("\/api\/messages\/view"/);
  assert.match(notificationSplit, /backendRequest\("\/api\/messages\/view"/);
  assert.match(searchRuntime, /backendRequest\("\/api\/messages\/view"/);
  assert.doesNotMatch(notificationSplit, /backendRequest\("\/api\/messages", \{ token \}\)/);
  assert.doesNotMatch(searchRuntime, /backendRequest\("\/api\/messages", \{ token \}\)/);
});

test("premium message bubbles remain keyboard operable and preserve delete-for-me semantics", async () => {
  const source = await read(
    "src/components/fresh/messages/MessageConversationActions.jsx"
  );

  assert.match(source, /handleBubbleKeyDown/);
  assert.match(source, /event\.key === "Enter"/);
  assert.match(source, /event\.key === "ContextMenu"/);
  assert.match(source, /event\.shiftKey && event\.key === "F10"/);
  assert.match(source, /tabIndex=\{isTemporary \? -1 : 0\}/);
  assert.match(source, /Delete for you/);
  assert.match(source, /The other person keeps their copy\./);
});

test("conversation presentation groups messages, separates days, and exposes a single delivery receipt", async () => {
  const [page, bubble] = await Promise.all([
    read("src/pages/MessagesBackend.jsx"),
    read("src/components/fresh/messages/MessageConversationActions.jsx"),
  ]);

  assert.match(page, /MESSAGE_GROUP_WINDOW_MS/);
  assert.match(page, /messageGroupPosition/);
  assert.match(page, /formatMessageDayLabel/);
  assert.match(page, /showReceipt=/);
  assert.match(bubble, /groupPosition = "single"/);
  assert.match(bubble, /message\.is_read\s*\?\s*"Seen"\s*:\s*"Sent"/);
});
