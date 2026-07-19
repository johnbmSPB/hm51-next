export type VersionedQueueOperation = {
  id: string;
  kind: "send" | "edit" | "delete";
  teamId: string;
  messageId: string;
  createdAt: number;
  revision: string;
};

export function upsertVersionedOperation<T extends VersionedQueueOperation>(
  current: T[],
  operation: T
) {
  const existing = current.find((item) => item.id === operation.id);
  return [
    ...current.filter((item) => item.id !== operation.id),
    existing ? { ...operation, createdAt: existing.createdAt } : operation,
  ];
}

export function removeOperationIfRevision<T extends VersionedQueueOperation>(
  current: T[],
  operationId: string,
  revision: string
) {
  const matching = current.find((item) => item.id === operationId);
  if (!matching || matching.revision !== revision) {
    return { operations: current, removed: false };
  }
  return {
    operations: current.filter((item) => item.id !== operationId),
    removed: true,
  };
}

export function cancelEditsBeforeDelete<T extends VersionedQueueOperation>(
  current: T[],
  teamId: string,
  messageId: string
) {
  return current.filter(
    (item) =>
      !(
        item.kind === "edit" &&
        item.teamId === teamId &&
        item.messageId === messageId
      )
  );
}
