"use client";

import GlobalChatUnreadBadge from "./components/GlobalChatUnreadBadge";
import ProfileChangePassword from "./components/ProfileChangePassword";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalChatUnreadBadge />
      <ProfileChangePassword />
      {children}
    </>
  );
}
