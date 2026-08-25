import type { ReactNode } from "react";
import PasswordRestoreDialog from "./PasswordRestoreDialog";
import "./profile-selector-center.css";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PasswordRestoreDialog />
    </>
  );
}
