import type { ReactNode } from "react";
import DataRevisionBoundary from "../components/DataRevisionBoundary";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return <DataRevisionBoundary scope="profile">{children}</DataRevisionBoundary>;
}
