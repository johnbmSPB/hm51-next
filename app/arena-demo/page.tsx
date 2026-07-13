"use client";

import { useEffect, useMemo, useState } from "react";

type Screen = "overview" | "schedule" | "freeIce" | "bookings" | "arena";
type BookingStatus = "Новая" | "Подтверждена" | "Ожидает оплаты" | "Отменена";

type Booking = {
  id: number;
  team: string;
  date: string;
  time: string;
  rink: string;
  amount: number;
  status: BookingStatus;
};

type Slot = {
  id: number;
  time: string;
  title: string;
  subtitle: string;
  kind: "free" | "booking" | "service";
  price?: number;
  published?: boolean;
};

const DEMO_LOGIN = "johnbm0";
const DEMO_TOKEN = "arena-demo-local-token";

const navigation: Array<{ id: Screen; label: string; icon: string }> = [
  { id: "overview", label: "Обзор", icon: "⌂" },
  { id: "schedule", label: "Расписание", icon: "▦" },
  { id: "freeIce", label: "Свободный лёд", icon: "◷" },
  { id: "bookings", label: "Бронирования", icon: "✓" },
  { id: "arena", label: "Арена", icon: "▱" },
];

const initialSlots: Slot[] = [
  { id: 1, time: "08:00–09:30", title: "ХК Рассвет", subtitle: "Командная тренировка", kind: "booking" },
  { id: 2, time: "09:30–10:00", title: "Заливка льда", subtitle: "Техническое обслуживание", kind: "service" },
  { id: 3, time: "10:00–11:00", title: "Свободный лёд", subtitle: "Доступно для бронирования", kind: "free", price: 9500, published: true },
  { id: 4, time: "11:00–12:30", title: "Школа Ice Pro", subtitle: "Детская тренировка", kind: "booking" },
  { id: 5, time: "12:30–14:00", title: "Свободный лёд", subtitle: "Не опубликовано", kind: "free", price: 15000, published: false },
  { id: 6, time: "14:00–15:00", title: "Технический перерыв", subtitle: "Осмотр оборудования", kind: "service" },
  { id: 7, time: "15:00–16:30", title: "ХК Север", subtitle: "Товарищеский матч", kind: "booking" },
  { id: 8, time: "18:30–20:00", title: "Свободный лёд", subtitle: "Доступно для бронирования", kind: "free", price: 18000, published: true },
];

const initialBookings: Booking[] = [
  { id: 1042, team: "ХК Север", date: "14 июля", time: "20:00–21:30", rink: "Большая арена", amount: 18000, status: "Новая" },
  { id: 1041, team: "ХК Балтиец", date: "14 июля", time: "22:00–23:00", rink: "Большая арена", amount: 12000, status: "Подтверждена" },
  { id: 1039, team: "Школа Ice Pro", date: "15 июля", time: "18:30–20:00", rink: "Малая арена", amount: 13500, status: "Ожидает оплаты" },
  { id: 1037, team: "Частная тренировка", date: "16 июля", time: "10:00–11:00", rink: "Малая арена", amount: 8500, status: "Подтверждена" },
];

function money(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

function statusClass(status: BookingStatus) {
  if (status === "Подтверждена") return "bg-[#20d2aa]/15 text-[#20d2aa]";
  if (status === "Новая") return "bg-amber-400/15 text-amber-300";
  if (status === "Ожидает оплаты") return "bg-blue-400/15 text-blue-300";
  return "bg-red-400/15 text-red-300";
}

function slotClass(kind: Slot["kind"]) {
  if (kind === "free") return "border-l-[#20d2aa] bg-[#20d2aa]/5";
  if (kind === "booking") return "border-l-blue-400 bg-blue-400/5";
  return "border-l-white/25 bg-white/[0.02]";
}

export default function ArenaDemoPage() {
  const [authorized, setAuthorized] = useState(false);
  const [screen, setScreen] = useState<Screen>("overview");
  const [rink, setRink] = useState("Большая арена");
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const login = (localStorage.getItem("hm51_login") || "").trim().toLowerCase();
    const token = localStorage.getItem("hm51_token") || localStorage.getItem("auth_token") || "";

    if (login !== DEMO_LOGIN || token !== DEMO_TOKEN) {
      window.location.replace("/login");
      return;
    }

    setAuthorized(true);
  }, []);

  const pending = bookings.filter((item) => item.status === "Новая").length;
  const freeSlots = useMemo(() => slots.filter((item) => item.kind === "free"), [slots]);
  const revenue = bookings
    .filter((item) => item.status !== "Отменена")
    .reduce((sum, item) => sum + item.amount, 0);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function logout() {
    localStorage.removeItem("hm51_login");
    localStorage.removeItem("hm51_token");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("hm51_gamer_team_id");
    window.location.replace("/arena-demo/logout");
  }

  function addSlot() {
    const nextId = Math.max(...slots.map((item) => item.id)) + 1;
    setSlots((current) => [
      ...current,
      {
        id: nextId,
        time: "20:30–22:00",
        title: "Свободный лёд",
        subtitle: "Новое тестовое окно",
        kind: "free",
        price: 19500,
        published: false,
      },
    ]);
    setShowSlotModal(false);
    notify("Свободное окно создано");
  }

  function togglePublish(id: number) {
    setSlots((current) =>
      current.map((item) => item.id === id ? { ...item, published: !item.published } : item),
    );
    notify("Статус публикации изменён");
  }

  function updateBooking(id: number, status: BookingStatus) {
    setBookings((current) =>
      current.map((item) => item.id === id ? { ...item, status } : item),
    );
    setSelectedBooking(null);
    notify(status === "Подтверждена" ? "Бронирование подтверждено" : "Бронирование отклонено");
  }

  if (!authorized) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#0b100f] text-white/50">
        Проверяем доступ…
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#0b100f] text-white">
      <div className="mx-auto grid min-h-dvh max-w-[1800px] lg:grid-cols-[250px_1fr]">
        <aside className="hidden border-r border-white/10 bg-[#090e0d] p-5 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2 pb-8">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#20d2aa] font-black text-[#06251c]">XM</div>
            <div>
              <strong className="block">XM 5.1</strong>
              <span className="text-xs text-white/40">Ледовые арены</span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                className={`grid min-h-12 w-full grid-cols-[28px_1fr_auto] items-center rounded-xl px-3 text-left transition ${
                  screen === item.id
                    ? "bg-[#20d2aa]/15 text-[#20d2aa]"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
                {item.id === "bookings" && pending > 0 && (
                  <b className="grid h-6 min-w-6 place-items-center rounded-full bg-[#20d2aa] px-1 text-xs text-[#06251c]">
                    {pending}
                  </b>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-[#20d2aa]/20 bg-[#20d2aa]/10 p-4">
            <span className="text-xs text-white/45">Загрузка сегодня</span>
            <strong className="my-1 block text-3xl">78%</strong>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[78%] rounded-full bg-[#20d2aa]" />
            </div>
            <small className="text-white/40">9,5 из 12 часов</small>
          </div>

          <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 font-bold text-[#20d2aa]">Е</div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm">Евгений</strong>
              <span className="text-xs text-white/40">Администратор</span>
            </div>
            <button onClick={logout} className="text-xs text-red-300 hover:text-red-200">Выйти</button>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-30 flex min-h-[74px] items-center justify-between gap-4 border-b border-white/10 bg-[#0b100f]/90 px-4 backdrop-blur-xl md:px-7">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Портал управления</p>
              <h1 className="text-xl font-bold">{navigation.find((item) => item.id === screen)?.label}</h1>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={rink}
                onChange={(event) => setRink(event.target.value)}
                className="hidden h-11 rounded-xl border border-white/10 bg-[#151d1b] px-3 text-sm outline-none md:block"
              >
                <option>Большая арена</option>
                <option>Малая арена</option>
                <option>Тренировочная площадка</option>
              </select>
              <button
                onClick={() => setShowSlotModal(true)}
                className="h-11 rounded-xl bg-[#20d2aa] px-4 font-bold text-[#06251c]"
              >
                <span className="hidden sm:inline">+ Добавить окно</span>
                <span className="sm:hidden">+</span>
              </button>
              <button
                onClick={logout}
                className="h-11 rounded-xl border border-red-300/20 bg-red-300/10 px-3 text-sm font-semibold text-red-200"
              >
                Выйти
              </button>
            </div>
          </header>

          <div className="p-4 pb-24 md:p-7 md:pb-12">
            {screen === "overview" && (
              <div className="space-y-4">
                <section className="relative overflow-hidden rounded-[26px] border border-[#20d2aa]/20 bg-gradient-to-br from-[#102b24] to-[#111a18] p-6 md:min-h-[220px] md:p-9">
                  <div className="relative z-10 max-w-2xl">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#20d2aa]">Понедельник, 13 июля</span>
                    <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Добрый день, Евгений</h2>
                    <p className="mt-3 text-white/55">Сегодня на арене 7 бронирований и 3 свободных окна.</p>
                    <button
                      onClick={() => setScreen("schedule")}
                      className="mt-7 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold"
                    >
                      Открыть расписание →
                    </button>
                  </div>
                  <div className="pointer-events-none absolute -right-8 -top-14 text-[180px] font-black text-white/[0.025]">ICE</div>
                </section>

                <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {[
                    ["Новые заявки", String(pending), "Требуют решения"],
                    ["Подтверждено", "3", "На ближайшие дни"],
                    ["Свободных окон", String(freeSlots.length), "Можно опубликовать"],
                    ["Сумма бронирований", money(revenue), "Тестовые данные"],
                  ].map(([title, value, caption]) => (
                    <article key={title} className="rounded-2xl border border-white/10 bg-[#121918] p-4 md:p-5">
                      <span className="text-xs text-white/40">{title}</span>
                      <strong className="my-2 block text-2xl tracking-tight md:text-3xl">{value}</strong>
                      <small className="text-white/35">{caption}</small>
                    </article>
                  ))}
                </section>

                <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
                  <article className="rounded-2xl border border-white/10 bg-[#121918] p-5">
                    <div className="mb-4 flex items-end justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#20d2aa]">Ближайшие события</span>
                        <h3 className="mt-1 text-lg font-bold">Расписание на сегодня</h3>
                      </div>
                      <button onClick={() => setScreen("schedule")} className="text-sm text-[#20d2aa]">Все события</button>
                    </div>
                    <div className="divide-y divide-white/10">
                      {slots.slice(0, 5).map((slot) => (
                        <div key={slot.id} className="grid min-h-16 grid-cols-[72px_1fr_auto] items-center gap-3">
                          <time className="text-sm text-white/40">{slot.time.split("–")[0]}</time>
                          <div>
                            <strong className="block text-sm">{slot.title}</strong>
                            <span className="text-xs text-white/35">{slot.subtitle}</span>
                          </div>
                          {slot.price && <b className="text-sm text-[#20d2aa]">{money(slot.price)}</b>}
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-2xl border border-white/10 bg-[#121918] p-5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#20d2aa]">Новые заявки</span>
                    <h3 className="mt-1 text-lg font-bold">Ожидают подтверждения</h3>
                    <div className="mt-4 space-y-3">
                      {bookings.filter((item) => item.status === "Новая").map((booking) => (
                        <div key={booking.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <strong className="block">{booking.team}</strong>
                              <span className="text-xs text-white/40">{booking.date}, {booking.time}</span>
                            </div>
                            <b className="text-sm">{money(booking.amount)}</b>
                          </div>
                          <button
                            onClick={() => updateBooking(booking.id, "Подтверждена")}
                            className="mt-4 h-10 w-full rounded-lg bg-[#20d2aa]/15 font-bold text-[#20d2aa]"
                          >
                            Подтвердить
                          </button>
                        </div>
                      ))}
                      {pending === 0 && <p className="py-8 text-center text-sm text-white/35">Новых заявок нет</p>}
                    </div>
                  </article>
                </section>
              </div>
            )}

            {screen === "schedule" && (
              <div className="space-y-3">
                <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#121918] p-3">
                  <div className="flex items-center gap-2">
                    <button className="h-10 w-10 rounded-xl border border-white/10">←</button>
                    <strong className="px-2">13–19 июля 2026</strong>
                    <button className="h-10 w-10 rounded-xl border border-white/10">→</button>
                  </div>
                  <button className="h-10 rounded-xl bg-[#20d2aa]/15 px-4 text-sm font-bold text-[#20d2aa]">Сегодня</button>
                </section>

                <section className="grid grid-cols-7 gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#121918] p-2">
                  {["13", "14", "15", "16", "17", "18", "19"].map((date, index) => (
                    <button
                      key={date}
                      className={`min-w-[58px] rounded-xl px-2 py-2 ${index === 1 ? "bg-[#20d2aa]/15 text-[#20d2aa]" : "text-white/45"}`}
                    >
                      <span className="block text-[10px]">{["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"][index]}</span>
                      <strong className="mt-1 block text-lg">{date}</strong>
                    </button>
                  ))}
                </section>

                <section className="rounded-2xl border border-white/10 bg-[#121918] p-4 md:p-5">
                  <div className="mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#20d2aa]">Вторник, 14 июля</span>
                    <h3 className="mt-1 text-xl font-bold">{rink}</h3>
                  </div>
                  <div className="space-y-2">
                    {slots.map((slot) => (
                      <article
                        key={slot.id}
                        className={`grid min-h-[68px] grid-cols-[96px_1fr_auto] items-center gap-3 rounded-xl border border-white/10 border-l-[3px] p-3 ${slotClass(slot.kind)}`}
                      >
                        <time className="text-xs text-white/40">{slot.time}</time>
                        <div>
                          <strong className="block text-sm">{slot.title}</strong>
                          <span className="text-xs text-white/35">{slot.subtitle}</span>
                        </div>
                        <div className="text-right">
                          {slot.price && <b className="block text-sm">{money(slot.price)}</b>}
                          {slot.kind === "free" && (
                            <span className={`mt-1 inline-block rounded-full px-2 py-1 text-[10px] font-bold ${
                              slot.published ? "bg-[#20d2aa]/15 text-[#20d2aa]" : "bg-amber-400/15 text-amber-300"
                            }`}>
                              {slot.published ? "Опубликовано" : "Черновик"}
                            </span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {screen === "freeIce" && (
              <div>
                <section className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#20d2aa]">Управление предложениями</span>
                    <h2 className="mt-1 text-3xl font-black">Свободный лёд</h2>
                    <p className="mt-2 text-sm text-white/45">Публикуйте свободные окна для команд и тренеров XM 5.1.</p>
                  </div>
                  <button onClick={() => setShowSlotModal(true)} className="h-11 rounded-xl bg-[#20d2aa] px-4 font-bold text-[#06251c]">+ Создать окно</button>
                </section>

                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {freeSlots.map((slot) => (
                    <article key={slot.id} className="rounded-2xl border border-white/10 bg-[#121918] p-5">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        slot.published ? "bg-[#20d2aa]/15 text-[#20d2aa]" : "bg-amber-400/15 text-amber-300"
                      }`}>
                        {slot.published ? "Опубликовано" : "Черновик"}
                      </span>
                      <h3 className="mt-5 text-3xl font-black tracking-tight">{slot.time}</h3>
                      <p className="mt-1 text-sm text-white/40">14 июля · {rink}</p>
                      <strong className="my-5 block text-xl text-[#20d2aa]">{money(slot.price || 0)}</strong>
                      <button
                        onClick={() => togglePublish(slot.id)}
                        className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] text-sm font-semibold"
                      >
                        {slot.published ? "Снять с публикации" : "Опубликовать"}
                      </button>
                    </article>
                  ))}
                </section>
              </div>
            )}

            {screen === "bookings" && (
              <div>
                <section className="mb-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#20d2aa]">Заявки и бронирования</span>
                  <h2 className="mt-1 text-3xl font-black">Бронирования</h2>
                  <p className="mt-2 text-sm text-white/45">Подтверждайте заявки и контролируйте статус оплаты.</p>
                </section>

                <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#121918]">
                  <div className="hidden grid-cols-[1.2fr_1fr_1fr_.7fr_.8fr_24px] gap-4 border-b border-white/10 px-5 py-4 text-[10px] uppercase tracking-[0.12em] text-white/35 md:grid">
                    <span>Клиент</span><span>Дата и время</span><span>Площадка</span><span>Сумма</span><span>Статус</span><span />
                  </div>
                  {bookings.map((booking) => (
                    <button
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className="grid min-h-[82px] w-full grid-cols-[1fr_auto] items-center gap-3 border-b border-white/10 px-4 py-3 text-left transition hover:bg-white/[0.025] md:grid-cols-[1.2fr_1fr_1fr_.7fr_.8fr_24px] md:px-5"
                    >
                      <span>
                        <b className="block text-sm">{booking.team}</b>
                        <small className="text-white/35">№ AR-2026-{booking.id}</small>
                      </span>
                      <span className="hidden md:block">
                        <b className="block text-sm">{booking.date}</b>
                        <small className="text-white/35">{booking.time}</small>
                      </span>
                      <span className="hidden text-sm text-white/55 md:block">{booking.rink}</span>
                      <b className="hidden text-sm md:block">{money(booking.amount)}</b>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(booking.status)}`}>{booking.status}</span>
                      <span className="hidden text-white/35 md:block">›</span>
                    </button>
                  ))}
                </section>
              </div>
            )}

            {screen === "arena" && (
              <div className="space-y-4">
                <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
                  <div className="grid min-h-[250px] place-items-center rounded-[26px] border border-white/10 bg-gradient-to-br from-[#18332c] to-[#151d1b] text-center text-5xl font-black text-white/[0.08]">
                    ЛЕДОВАЯ АРЕНА
                  </div>
                  <div>
                    <span className="rounded-full bg-[#20d2aa]/15 px-2.5 py-1 text-[10px] font-bold text-[#20d2aa]">Опубликована</span>
                    <h2 className="mt-4 text-4xl font-black tracking-tight">Ледовая арена «Север»</h2>
                    <p className="mt-2 text-white/45">Санкт-Петербург, проспект Энергетиков, 12</p>
                    <div className="mt-5 flex flex-wrap gap-2 text-xs">
                      {["3 площадки", "6 раздевалок", "Парковка", "Кафе"].map((item) => (
                        <span key={item} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">{item}</span>
                      ))}
                    </div>
                    <button onClick={() => notify("Редактирование карточки открыто")} className="mt-6 h-11 rounded-xl bg-[#20d2aa] px-4 font-bold text-[#06251c]">
                      Редактировать карточку
                    </button>
                  </div>
                </section>

                <section className="grid gap-3 md:grid-cols-3">
                  {[
                    ["Большая арена", "60 × 30 м · 1200 мест", "12 000 ₽/час"],
                    ["Малая арена", "40 × 20 м · 250 мест", "9 000 ₽/час"],
                    ["Тренировочная", "28 × 15 м · без трибун", "6 500 ₽/час"],
                  ].map(([name, details, price]) => (
                    <article key={name} className="rounded-2xl border border-white/10 bg-[#121918] p-5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#20d2aa]">Площадка</span>
                      <h3 className="mt-2 text-lg font-bold">{name}</h3>
                      <p className="mt-2 text-sm text-white/40">{details}</p>
                      <strong className="mt-6 block">{price}</strong>
                    </article>
                  ))}
                </section>
              </div>
            )}
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-white/10 bg-[#0b100f]/95 backdrop-blur-xl lg:hidden">
        {navigation.map((item) => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id)}
            className={`grid place-items-center content-center gap-1 text-[9px] ${
              screen === item.id ? "text-[#20d2aa]" : "text-white/40"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {showSlotModal && (
        <div onMouseDown={() => setShowSlotModal(false)} className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-[24px] border border-white/10 bg-[#151d1b] p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#20d2aa]">Новое событие</span>
                <h3 className="mt-1 text-xl font-bold">Добавить свободное окно</h3>
              </div>
              <button onClick={() => setShowSlotModal(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-xl">×</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-white/45">Дата<input type="date" defaultValue="2026-07-14" className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0f1514] px-3 text-white" /></label>
              <label className="text-xs text-white/45">Время<input type="time" defaultValue="20:30" className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0f1514] px-3 text-white" /></label>
              <label className="text-xs text-white/45">Продолжительность<select className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0f1514] px-3 text-white"><option>1 час 30 минут</option><option>1 час</option><option>2 часа</option></select></label>
              <label className="text-xs text-white/45">Стоимость<input type="number" defaultValue="19500" className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0f1514] px-3 text-white" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowSlotModal(false)} className="h-11 rounded-xl border border-white/10 px-4">Отмена</button>
              <button onClick={addSlot} className="h-11 rounded-xl bg-[#20d2aa] px-4 font-bold text-[#06251c]">Создать окно</button>
            </div>
          </div>
        </div>
      )}

      {selectedBooking && (
        <div onMouseDown={() => setSelectedBooking(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-[24px] border border-white/10 bg-[#151d1b] p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#20d2aa]">Бронирование № AR-2026-{selectedBooking.id}</span>
                <h3 className="mt-1 text-xl font-bold">{selectedBooking.team}</h3>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-xl">×</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Дата и время", `${selectedBooking.date}, ${selectedBooking.time}`],
                ["Площадка", selectedBooking.rink],
                ["Стоимость", money(selectedBooking.amount)],
                ["Статус", selectedBooking.status],
              ].map(([title, value]) => (
                <div key={title} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <span className="block text-[10px] text-white/35">{title}</span>
                  <strong className="mt-1 block text-sm">{value}</strong>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => updateBooking(selectedBooking.id, "Отменена")} className="h-11 rounded-xl border border-red-300/20 px-4 text-red-200">Отклонить</button>
              <button onClick={() => updateBooking(selectedBooking.id, "Подтверждена")} className="h-11 rounded-xl bg-[#20d2aa] px-4 font-bold text-[#06251c]">Подтвердить</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 right-4 z-[60] rounded-xl bg-[#20d2aa] px-4 py-3 font-bold text-[#06251c] shadow-2xl lg:bottom-5">
          {toast}
        </div>
      )}
    </main>
  );
}
