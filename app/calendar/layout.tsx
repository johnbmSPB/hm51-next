import type { ReactNode } from "react";
import DataRevisionBoundary from "../components/DataRevisionBoundary";

export default function CalendarLayout({ children }: { children: ReactNode }) {
  return <DataRevisionBoundary scope="calendar">{children}</DataRevisionBoundary>;
}
