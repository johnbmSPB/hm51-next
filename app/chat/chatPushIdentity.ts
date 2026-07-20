function clean(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

export function stableChatPushHash(parts: unknown[]) {
  const source = parts.map(clean).join("\u001f");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(36);
}

export function deterministicChatPushId(parts: {
  accountId?: unknown;
  teamId?: unknown;
  eventName?: unknown;
  messageId?: unknown;
  clientId?: unknown;
  senderId?: unknown;
  body?: unknown;
  time?: unknown;
  replyTo?: unknown;
}) {
  return `queue_${stableChatPushHash([
    parts.accountId,
    parts.teamId,
    parts.eventName,
    parts.messageId,
    parts.clientId,
    parts.senderId,
    parts.body,
    parts.time,
    parts.replyTo,
  ])}`;
}
