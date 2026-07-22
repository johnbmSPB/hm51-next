import type { ReactNode } from "react";
import DataRevisionBoundary from "../components/DataRevisionBoundary";

export default function FindTeamLayout({ children }: { children: ReactNode }) {
  return <DataRevisionBoundary scope="teams">{children}</DataRevisionBoundary>;
}
