type TeamMessagePayloadSource = {
  clientId: string;
  teamId: string;
  text: string;
  quote?: {
    messageId?: string;
    id?: string;
  };
};

export function buildTeamMessageRequest(token: string, message: TeamMessagePayloadSource) {
  return {
    token,
    teamId: message.teamId,
    text: message.text.trim(),
    clientId: message.clientId,
    replyTo: message.quote?.messageId || message.quote?.id || "",
  };
}
