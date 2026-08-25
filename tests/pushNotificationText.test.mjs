import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../public/hm51-push-sw.js", import.meta.url), "utf8");

function workerHarness({ clients = [] } = {}) {
  const listeners = new Map();
  const notifications = [];
  const self = {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    clients: {
      claim: async () => {},
      matchAll: async () => clients,
    },
    location: { origin: "https://hm51-next.vercel.app" },
    registration: {
      showNotification: async (title, options) => {
        notifications.push({ title, ...options });
      },
    },
    skipWaiting() {},
  };
  const context = vm.createContext({
    console,
    Date,
    indexedDB: {},
    Promise,
    self,
    clients: self.clients,
    URL,
  });
  vm.runInContext(source, context);
  return { context, listeners, notifications };
}

function workerContext() {
  return workerHarness().context;
}

function makeNotification(payload) {
  const context = workerContext();
  context.testPayload = payload;
  return vm.runInContext("makeNotification(testPayload)", context);
}

test("builds a detailed Russian training notification from data-only FCM payload", () => {
  const notification = makeNotification({
    data: {
      event: "NEW TRAINING",
      team_name: "ЦМКБ АЛМАЗ",
      t_date: "2026-08-11",
      t_time: "20:15:00",
      ice: "без льда",
      stadium: "Пулковские Высоты",
      stad_addr: "СПб, Петербургское шоссе, 60к6",
      note: "Бросковая",
    },
  });

  assert.equal(notification.title, "ЦМКБ АЛМАЗ");
  assert.equal(
    notification.body,
    [
      "Новая тренировка",
      "11 августа (во вторник)",
      "в 20:15 (без льда)",
      'на стадионе "Пулковские Высоты"',
      "(СПб, Петербургское шоссе, 60к6)",
      "P.S. Бросковая",
    ].join("\n")
  );
});

test("keeps explicit notification text when the backend already supplies it", () => {
  const notification = makeNotification({
    notification: { title: "Команда", body: "Готовый текст" },
    data: { event: "NEW TRAINING", t_date: "2026-08-11" },
  });

  assert.equal(notification.title, "Команда");
  assert.equal(notification.body, "Готовый текст");
});

test("keeps chat notification formatting unchanged", () => {
  const notification = makeNotification({
    data: {
      event: "TEAM CHAT",
      family: "Иванов",
      name: "Иван",
      text: "Буду на тренировке",
    },
  });

  assert.equal(notification.title, "Сообщение от Иванов Иван");
  assert.equal(notification.body, "Буду на тренировке");
});

test("does not mistake a team system notification for a chat message", () => {
  const notification = makeNotification({
    data: {
      event: "KICK FROM TEAM",
      team: "64",
      body: "Вас исключили из команды",
    },
  });

  assert.equal(notification.title, "ХМ 5.1");
  assert.equal(notification.body, "Вас исключили из команды");
});

test("builds an approval notification for a game", () => {
  const notification = makeNotification({
    data: {
      event: "GAMER CONFIRMATION",
      GAMER_ID: "42",
      game_id: "501",
      CONFIRMED: "true",
    },
  });

  assert.equal(notification.title, "ХМ 5.1");
  assert.equal(notification.body, "Вы утверждены на игру");
});

test("builds a training approval with line, position and shirt color", () => {
  const notification = makeNotification({
    data: {
      event: "TRAINING CONFIRMATION",
      GAMER_ID: "42",
      training_id: "701",
      confirmed: true,
      body: "Вы утверждены на тренировку",
      LINE_NUMBER: "2",
      POSITION_IN_LINE: "left_forward",
      JERSEY_COLOR: "white",
    },
  });

  assert.equal(notification.title, "ХМ 5.1");
  assert.equal(
    notification.body,
    [
      "Вы утверждены на тренировку",
      "Звено: 2 звено",
      "Позиция: Левый нападающий",
      "Цвет майки: Белая",
    ].join("\n")
  );
});

test("builds a rejection notification for a training", () => {
  const notification = makeNotification({
    data: {
      event: "TRAINING CONFIRMATION",
      GAMER_ID: "42",
      training_id: "701",
      confirmed: false,
    },
  });

  assert.equal(notification.title, "ХМ 5.1");
  assert.equal(notification.body, "Вы не утверждены на тренировку");
});

test("shows a confirmation push even when its gamer id is the active user and chat is visible", async () => {
  const visibleChatClient = {
    url: "https://hm51-next.vercel.app/chat",
    visibilityState: "visible",
    postMessage() {},
  };
  const { context, notifications } = workerHarness({ clients: [visibleChatClient] });
  context.testGamerId = "42";
  context.testPayload = {
    data: {
      event: "GAMER CONFIRMATION",
      GAMER_ID: "42",
      game_id: "501",
      confirmed: true,
    },
  };

  vm.runInContext(
    "chatContext = { gamerId: testGamerId, teamId: '', chatOpen: true }",
    context
  );
  await vm.runInContext("handlePush(testPayload)", context);

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].body, "Вы утверждены на игру");
});

test("does not show a chat notification when any app screen is visible", async () => {
  const visibleAppClient = {
    url: "https://hm51-next.vercel.app/calendar",
    visibilityState: "visible",
    postMessage() {},
  };
  const { context, notifications } = workerHarness({ clients: [visibleAppClient] });
  context.testPayload = {
    data: {
      event: "TEAM CHAT",
      team: "64",
      GAMER_ID: "99",
      family: "Иванов",
      name: "Иван",
      text: "Новое сообщение",
    },
  };

  await vm.runInContext("handlePush(testPayload)", context);
  assert.equal(notifications.length, 0);
});

test("shows a chat notification when the app is hidden", async () => {
  const hiddenAppClient = {
    url: "https://hm51-next.vercel.app/chat",
    visibilityState: "hidden",
    postMessage() {},
  };
  const { context, notifications } = workerHarness({ clients: [hiddenAppClient] });
  context.testPayload = {
    data: {
      event: "TEAM CHAT",
      team: "64",
      GAMER_ID: "99",
      family: "Иванов",
      name: "Иван",
      text: "Новое сообщение",
    },
  };

  await vm.runInContext("handlePush(testPayload)", context);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].body, "Новое сообщение");
});
