import type { ReactNode } from "react";
import DataRevisionBoundary from "../components/DataRevisionBoundary";
import CoachAccessBoundary from "./components/CoachAccessBoundary";

export default function CoachLayout({ children }: { children: ReactNode }) {
  return (
    <CoachAccessBoundary>
      <DataRevisionBoundary scope="calendar">{children}</DataRevisionBoundary>
    </CoachAccessBoundary>
  );
}
