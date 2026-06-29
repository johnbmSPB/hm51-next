import Link from "next/link";

export default function MenuPage() {
  return (
    <main className="min-h-screen bg-[#121715] px-5 pb-28 pt-8 text-white">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-black">Меню</h1>

        <div className="mt-6 space-y-3">
          <div className="rounded-3xl bg-[#2d332f] p-5 font-bold">
            Час хоккея
          </div>
          <div className="rounded-3xl bg-[#2d332f] p-5 font-bold">
            Подкатки с тренером
          </div>
          <div className="rounded-3xl bg-[#2d332f] p-5 font-bold">
            Ремонт амуниции
          </div>
          <div className="rounded-3xl bg-[#2d332f] p-5 font-bold">
            Барахолка
          </div>
        </div>

        <Link
          href="/home"
          className="mt-8 block rounded-2xl bg-[#20d1a8] px-5 py-4 text-center font-black text-[#121715]"
        >
          На главную
        </Link>
      </div>
    </main>
  );
}
