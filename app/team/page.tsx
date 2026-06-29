import Link from "next/link";

export default function TeamPage() {
  return (
    <main className="min-h-screen bg-[#121715] px-5 pb-28 pt-8 text-white">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-black">Команда</h1>
        <p className="mt-3 text-white/50">
          Здесь будет состав команды, роли игроков и информация о клубе.
        </p>

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
