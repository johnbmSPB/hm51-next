# Backend endpoints для редактирования и удаления сообщений XM 5.1

Эти файлы нужно положить на сервер `itandsports.ru` в папку:

```text
/chats/
```

## 1. Редактирование сообщения

Файл:

```text
https://itandsports.ru/chats/edit_team_message.php
```

Метод: `POST`, `application/x-www-form-urlencoded`

Параметры:

```text
token    — токен пользователя
TEAM_ID  — ID команды
MESS_ID  — ID сообщения
TEXT     — новый текст сообщения
```

Что должен сделать сервер:

```text
1. Проверить token.
2. Определить пользователя по token.
3. Проверить, что сообщение MESS_ID принадлежит этому пользователю.
4. Проверить, что сообщение относится к TEAM_ID.
5. Обновить текст сообщения в базе.
6. Отправить Firebase push в topic team_<TEAM_ID>.
```

Ответ:

```json
{"result": true, "message_id": "123"}
```

Push payload после редактирования:

```json
{
  "message": {
    "topic": "team_65",
    "data": {
      "event": "TEAM CHAT EDIT",
      "TEAM_ID": "65",
      "MESS_ID": "123",
      "TEXT": "Новый текст сообщения",
      "GAMER_ID": "289"
    },
    "webpush": {
      "fcm_options": {
        "link": "https://hm51-next.vercel.app/chat"
      }
    }
  }
}
```

## 2. Удаление сообщения

Файл:

```text
https://itandsports.ru/chats/delete_team_message.php
```

Метод: `POST`, `application/x-www-form-urlencoded`

Параметры:

```text
token    — токен пользователя
TEAM_ID  — ID команды
MESS_ID  — ID сообщения
```

Что должен сделать сервер:

```text
1. Проверить token.
2. Определить пользователя по token.
3. Проверить, что сообщение MESS_ID принадлежит этому пользователю.
4. Проверить, что сообщение относится к TEAM_ID.
5. Лучше не удалять физически, а поставить флаг deleted=1.
6. Отправить Firebase push в topic team_<TEAM_ID>.
```

Ответ:

```json
{"result": true, "message_id": "123"}
```

Push payload после удаления:

```json
{
  "message": {
    "topic": "team_65",
    "data": {
      "event": "TEAM CHAT DELETE",
      "TEAM_ID": "65",
      "MESS_ID": "123",
      "GAMER_ID": "289"
    },
    "webpush": {
      "fcm_options": {
        "link": "https://hm51-next.vercel.app/chat"
      }
    }
  }
}
```

## 3. Цитирование / ответ на сообщение

В существующем файле:

```text
https://itandsports.ru/chats/send_team_chat.php
```

Нужно принимать дополнительные поля:

```text
REPLY_TO      — ID цитируемого сообщения
REPLY_TEXT    — текст цитируемого сообщения
REPLY_AUTHOR  — автор цитируемого сообщения
```

Эти значения нужно сохранить вместе с новым сообщением и отправлять в push:

```json
{
  "message": {
    "topic": "team_65",
    "notification": {
      "title": "Новое сообщение",
      "body": "Ответ пользователя"
    },
    "data": {
      "event": "TEAM CHAT",
      "TEAM_ID": "65",
      "MESS_ID": "124",
      "TEXT": "Ответ пользователя",
      "REPLY_TO": "123",
      "REPLY_TEXT": "Исходное сообщение",
      "REPLY_AUTHOR": "Иванов Иван",
      "GAMER_ID": "289"
    },
    "webpush": {
      "fcm_options": {
        "link": "https://hm51-next.vercel.app/chat"
      }
    }
  }
}
```

## Уже подключено во фронте

В веб-приложении добавлены proxy endpoints:

```text
/api/chat/team-edit
/api/chat/team-delete
```

Они уже отправляют запросы на:

```text
https://itandsports.ru/chats/edit_team_message.php
https://itandsports.ru/chats/delete_team_message.php
```

Когда серверные PHP-файлы появятся, фронт начнёт передавать редактирование и удаление на сервер.
