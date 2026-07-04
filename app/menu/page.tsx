import Link from "next/link";

const menuItems = [
  {
    title: "Час хоккея",
    description: "Свободный лёд и игровые часы.",
    href: "/hockey-hour",
  },
  {
    title: "Подкати с тренером",
    description: "Индивидуальные и групповые занятия.",
    href: "/coach-training",
  },
  {
    title: "Ремонт амуниции",
    description: "Заточка, ремонт и обслуживание экипировки.",
    href: "/equipment-repair",
  },
  {
    title: "Барахолка",
    description: "Покупка и продажа хоккейной экипировки.",
    href: "/marketplace",
  },
  {
    title: "Найти тренировку",
    description: "Поиск тренировок рядом с вами.",
    href: "/find-training",
  },
  {
    title: "Настройки",
    description: "Параметры приложения и уведомлений.",
    href: "/settings",
  },
  {
    title: "Политика",
    description: "Политика конфиденциальности приложения.",
    href: "/menu/policy",
  },
  {
    title: "Push Debug",
    description: "Диагностика уведомлений на iPhone.",
    href: "/push-debug",
  },
];

export default function MenuPage() {
  return (
    <main className="min-h-screen bg-[#121715] px-5 pb-28 pt-8 text-white">
      <div className="mx-auto max-w-md">
        <header>
          <p className="text-sm text-white/40">ХМ 5.1</p>
          <h1 className="text-3xl font-black">Меню</h1>
        </header>

        <section className="mt-6 space-y-3">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-3xl bg-[#2d332f] p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-lg font-black text-white">
                    {item.title}
                  </p>

                  <p className="mt-1 text-sm font-semibold leading-5 text-white/45">
                    {item.description}
                  </p>
                </div>

                <div className="shrink-0 text-2xl font-black text-[#20d1a8]">
                  ›
                </div>
              </div>
            </Link>
          ))}
        </section>

        <nav className="fixed bottom-5 left-1/2 grid w-[calc(100%-24px)] max-w-md -translate-x-1/2 grid-cols-5 gap-1 rounded-3xl bg-[#2d332f] p-2 shadow-2xl">
          <Link href="/calendar" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Календарь</Link>
          <Link href="/home" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Профиль</Link>
          <Link href="/find-team" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Найти</Link>
          <Link href="/chat" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Чат</Link>
          <Link href="/menu" className="rounded-2xl bg-[#20d1a8] px-1 py-3 text-center text-[10px] font-black text-[#121715]">Меню</Link>
        </nav>
      </div>
    </main>
  );
}
