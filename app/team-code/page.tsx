import Link from "next/link";

export default function TeamCodePage() {
  return (
    <main className="min-h-dvh bg-[#07110c] px-6 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-md flex-col justify-center">
        <h1 className="text-center text-[28px] font-black leading-[36px]">
          Код подтверждения
        </h1>

        <p className="mt-4 text-center text-[17px] font-semibold leading-7 text-white/60">
          Здесь будет ввод кода от администратора команды.
        </p>

        <Link
          href="/connecting-team"
          className="mt-8 flex h-[56px] w-full items-center justify-center rounded-[30px] bg-[#2b322d] text-base font-black text-white"
        >
          Назад
        </Link>
      </div>
    </main>
  );
}
