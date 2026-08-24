"use client";

import GlobalChatUnreadBadge from "./components/GlobalChatUnreadBadge";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalChatUnreadBadge />
      {children}
    </>
  );
}
