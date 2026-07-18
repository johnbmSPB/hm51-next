# Android: исправление командного чата

Основано на текущих `HockeyFirebaseService.kt` и `ChatRepository.kt`.

## 1. ChatRepository.sendTeamMessageToServer

Заменить сигнатуру и формирование формы:

```kotlin
suspend fun sendTeamMessageToServer(
    text: String,
    clientId: String,
    teamId: Int,
    replyToMessageId: String? = null,
    replyText: String? = null,
    replySender: String? = null
): String? {
    return withContext(Dispatchers.IO) {
        val token = DataStoreManager(context).savedToken.firstOrNull()
            ?: return@withContext null

        val form = FormBody.Builder()
            .add("token", token)
            .add("TEXT", encodeSafe(text))
            .add("CLIENT_ID", clientId)
            .add("MESS_ID", clientId) // временная совместимость со старым PHP
            .add("TEAM_ID", teamId.toString())
            .add("REPLY_TO", replyToMessageId ?: ".")
            .add("REPLY_TEXT", replyText?.let(::encodeSafe) ?: ".")
            .add("REPLY_SENDER", replySender?.let(::encodeSafe) ?: ".")

        val request = Request.Builder()
            .url("https://itandsports.ru/chats/send_team_chat.php")
            .post(form.build())
            .build()

        val raw = executeRequest(request) ?: return@withContext null

        try {
            val json = JSONObject(raw)
            json.optString("message_id").takeIf { it.isNotBlank() }
                ?: json.optString("MESSAGE_ID").takeIf { it.isNotBlank() }
        } catch (_: Exception) {
            null
        }
    }
}
```

Во всех местах вызова передавать полный reply:

```kotlin
val serverMessageId = chatRepository.sendTeamMessageToServer(
    text = message.text,
    clientId = message.id,
    teamId = teamId,
    replyToMessageId = message.replyToMessageId,
    replyText = message.replyToText,
    replySender = message.replyToSender
)
```

## 2. HockeyFirebaseService: заменить блок TEAM CHAT

```kotlin
if (
    event == "TEAM CHAT" ||
    event == "TEAM CHAT MESSAGE DELETED" ||
    event == "TEAM CHAT MESSAGE EDITED"
) {
    val teamId = remoteMessage.data["team"]?.toIntOrNull()
        ?: remoteMessage.data["TEAM_ID"]?.toIntOrNull()
        ?: return@launch

    val serverMessageId = (
        remoteMessage.data["message_id"]
            ?: remoteMessage.data["MESSAGE_ID"]
    )?.takeIf { it.isNotBlank() && it != "." }

    val clientId = (
        remoteMessage.data["client_id"]
            ?: remoteMessage.data["CLIENT_ID"]
            ?: remoteMessage.data["MESS_ID"]
    )?.takeIf { it.isNotBlank() && it != "." }

    val family = remoteMessage.data["family"] ?: ""
    val name = remoteMessage.data["name"] ?: ""
    val senderName = "$family $name".trim().ifBlank { "User" }
    val chatType = DataStoreManager.ChatStore.ChatType.Team(teamId)
    notificationsEnabled = chatStore.isNotificationsEnabled(chatType)

    val timestamp = parseTimestamp(
        remoteMessage.data["message_date"] ?: "",
        remoteMessage.data["message_time"] ?: ""
    )

    if (event == "TEAM CHAT MESSAGE DELETED") {
        val targetId = serverMessageId ?: return@launch
        val old = chatStore.getMessagesOnce(chatType)
        val updated = old.filterNot {
            it.messID == targetId || it.id == targetId
        }
        chatStore.saveMessages(chatType, updated)
        return@launch
    }

    if (event == "TEAM CHAT MESSAGE EDITED") {
        val targetId = serverMessageId ?: return@launch
        val newText = decodeSafe(remoteMessage.data["new_text"] ?: "")
        val old = chatStore.getMessagesOnce(chatType)
        val updated = old.map { message ->
            if (message.messID == targetId || message.id == targetId) {
                message.copy(text = newText, isEdited = true)
            } else {
                message
            }
        }
        chatStore.saveMessages(chatType, updated)
        return@launch
    }

    val resolvedLocalId = clientId ?: serverMessageId ?: UUID.randomUUID().toString()
    val resolvedServerId = serverMessageId ?: resolvedLocalId
    val decodedText = decodeSafe(text)
    val old = chatStore.getMessagesOnce(chatType)

    val localReply = replyTo?.let { replyId ->
        old.firstOrNull { it.messID == replyId || it.id == replyId }
    }

    val resolvedReplyText = replyText ?: localReply?.text
    val resolvedReplySender = replySender ?: localReply?.senderName

    val incoming = ChatMessage(
        id = resolvedLocalId,
        messID = resolvedServerId,
        senderId = senderID,
        senderName = senderName,
        text = decodedText,
        timestamp = timestamp,
        isMine = senderID == myGamerId,
        replyToMessageId = replyTo,
        replyToText = resolvedReplyText,
        replyToSender = resolvedReplySender,
        isEdited = false,
        status = MessageStatus.DELIVERED
    )

    val localOwnMessage = old.firstOrNull { saved ->
        (clientId != null && saved.id == clientId) ||
        (serverMessageId != null && saved.messID == serverMessageId) ||
        (serverMessageId != null && saved.id == serverMessageId)
    }

    if (senderID == myGamerId && localOwnMessage != null) {
        val updated = old.map { saved ->
            if (saved.id == localOwnMessage.id && saved.messID == localOwnMessage.messID) {
                saved.copy(
                    id = resolvedLocalId,
                    messID = resolvedServerId,
                    text = decodedText,
                    replyToMessageId = replyTo,
                    replyToText = resolvedReplyText,
                    replyToSender = resolvedReplySender,
                    status = MessageStatus.DELIVERED
                )
            } else {
                saved
            }
        }
        chatStore.saveMessages(chatType, updated)
    } else {
        // В том числе сообщение с другого устройства того же аккаунта.
        val duplicate = old.any {
            it.messID == resolvedServerId ||
            (clientId != null && it.id == clientId)
        }
        if (!duplicate) {
            chatStore.addMessage(chatType, incoming)
        }
    }

    if (senderID == myGamerId) return@launch
}
```

## Что исправляет патч

- `id` и `messID` больше не получают два разных UUID.
- `clientId` остаётся локальным идентификатором отправки.
- `message_id` остаётся серверным идентификатором.
- Сообщение с веба под тем же аккаунтом добавляется на Android, если локальной копии нет.
- Reply передаёт и принимает `REPLY_TO`, `REPLY_TEXT`, `REPLY_SENDER`.
- Edit/delete ищут сообщение и по `id`, и по `messID`.
