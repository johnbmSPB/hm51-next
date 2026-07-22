"use client";

import { useMemo, type ReactNode } from "react";
import { useAppData } from "../lib/AppDataProvider";

type BoundaryScope = "profile" | "events" | "teams" | "calendar" | "all";

export default function DataRevisionBoundary({
  children,
  scope,
}: {
  children: ReactNode;
  scope: BoundaryScope;
}) {
  const { profileRevision, eventsRevision, teamsRevision } = useAppData();

  const revisionKey = useMemo(() => {
    if (scope === "profile") return `profile-${profileRevision}`;
    if (scope === "events") return `events-${eventsRevision}`;
    if (scope === "teams") return `teams-${teamsRevision}-${profileRevision}`;
    if (scope === "calendar") {
      return `calendar-${profileRevision}-${eventsRevision}-${teamsRevision}`;
    }
    return `all-${profileRevision}-${eventsRevision}-${teamsRevision}`;
  }, [scope, profileRevision, eventsRevision, teamsRevision]);

  return <div key={revisionKey}>{children}</div>;
}
