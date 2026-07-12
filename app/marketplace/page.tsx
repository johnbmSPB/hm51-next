import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#121715] px-5 pb-28 pt-8 text-white">
      <div className="mx-auto max-w-md">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-white/40">ХМ 5.1</p>
            <h1 className="text-3xl font-black">Барахолка</h1>
          </div>

          <Link
            href="/menu"
            className="mt-4 flex h-10 min-w-[86px] items-center justify-center rounded-[22px] bg-[#2d332f] px-5 text-xs font-black text-white/60"
          >
            Назад
          </Link>
        </header>

        <section className="mt-6 rounded-3xl bg-[#2d332f] p-5">
          <p className="text-sm font-bold leading-6 text-white/55">
            Здесь будет хоккейная барахолка.
          </p>
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
