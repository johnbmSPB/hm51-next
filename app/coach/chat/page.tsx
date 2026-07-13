import ClientChatPolished from "../../chat/ClientChatPolished";
import ChatViewportFix from "../../chat/ChatViewportFix";
import CoachBottomNav from "../components/CoachBottomNav";

export default function CoachChatPage() {
  return (
    <>
      <ClientChatPolished />
      <ChatViewportFix />
      <CoachBottomNav active="chat" />
    </>
  );
}
