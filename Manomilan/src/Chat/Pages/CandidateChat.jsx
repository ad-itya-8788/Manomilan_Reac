import { useMemo } from "react";
import CandidateLayout from "../../candidate/components/CandidateLayout";
import ChatPanel from "../Components/ChatPanel";
import { getCachedHomeData } from "../../auth";
import "../Styles/chat.css";

export default function CandidateChat() {
  const cached = useMemo(() => getCachedHomeData(), []);
  const candidateInfo = {
    name: cached?.profile?.full_name || cached?.user?.name || cached?.user?.username,
    id: cached?.profile?.registration_number || cached?.profile?.profile_id || cached?.user?.username,
    photo: cached?.profile?.photo_url || "",
  };

  return (
    <CandidateLayout currentPath="/candidate/chat" candidateInfo={candidateInfo}>
      <div className="chat-page">
        <header className="chat-page-head">
          <div>
            <span className="chat-page-eyebrow">We are here to help</span>
            <h1>Help</h1>
            <p>Chat with our team about your profile, matches, verification or payments.</p>
          </div>
        </header>
        <ChatPanel embedded fullScreen />
      </div>
    </CandidateLayout>
  );
}
