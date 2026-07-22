import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../public/hm51-push-sw.js", import.meta.url), "utf8");

function workerContext() {
  const listeners = new Map();
  const self = {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    clients: {
      claim: async () => {},
      matchAll: async () => [],
    },
    location: { origin: "https://hm51-next.vercel.app" },
    registration: { showNotification: async () => {} },
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
  return context;
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
