import Link from "next/link";

export default function StartPage() {
  return (
    <main className="min-h-screen bg-[#121715] px-5 py-8 text-white">
      <div className="mx-auto flex min-h-[90vh] max-w-md flex-col justify-between">
        <section>
          <div className="mb-10 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#20d1a8] text-3xl font-black text-[#121715]">
              ХМ
            </div>

            <h1 className="text-4xl font-black tracking-tight">ХМ 5.1</h1>

            <p className="mt-3 text-base text-white/60">
              Хоккейный менеджер для игроков, тренеров и команд
            </p>
          </div>

          <div className="rounded-3xl bg-[#2d332f] p-5 shadow-xl">
            <h2 className="text-xl font-bold">Добро пожаловать</h2>

            <p className="mt-2 text-sm leading-6 text-white/60">
              Управляйте играми, тренировками, составом команды и подтверждением
              участия прямо с телефона.
            </p>

            <div className="mt-6 space-y-3">
              <Link
                href="/login"
                className="block rounded-2xl bg-[#20d1a8] px-5 py-4 text-center font-bold text-[#121715]"
              >
                Войти
              </Link>

              <Link
                href="/register"
                className="block rounded-2xl border border-white/15 px-5 py-4 text-center font-bold text-white"
              >
                Зарегистрироваться
              </Link>
            </div>
          </div>
        </section>

        <footer className="pt-8 text-center text-xs text-white/30">
          CODBERRY · Там, где код становится продуктом
        </footer>
      </div>
    </main>
  );
}
