import type { ReactNode } from "react";
import DataRevisionBoundary from "../components/DataRevisionBoundary";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return <DataRevisionBoundary scope="teams">{children}</DataRevisionBoundary>;
}
