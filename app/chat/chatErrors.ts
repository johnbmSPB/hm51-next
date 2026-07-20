export type ChatErrorKind = "transient" | "permanent" | "unknown-result";

export class ChatRequestError extends Error {
  kind: ChatErrorKind;
  status: number;

  constructor(message: string, kind: ChatErrorKind, status = 0) {
    super(message);
    this.name = "ChatRequestError";
    this.kind = kind;
    this.status = status;
  }
}

export function chatErrorKind(error: unknown): ChatErrorKind {
  return error instanceof ChatRequestError ? error.kind : "permanent";
}

export function isRetryableChatError(error: unknown) {
  return chatErrorKind(error) === "transient";
}

export function httpChatErrorKind(status: number): ChatErrorKind {
  if (status === 408 || status === 425 || status === 429 || status >= 500) {
    return "transient";
  }
  return "permanent";
}
