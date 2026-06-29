import Link from "next/link";

export default function ConnectingTeamPage() {
  return (
    <main className="min-h-dvh bg-[#07110c] px-6 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-md flex-col">
        <section className="pt-8 text-center">
          <h1 className="px-4 text-[28px] font-black leading-[36px] text-white">
            Учётная запись пользователя
            <br />
            создана успешно!
          </h1>

          <p className="mt-[34px] whitespace-pre-line px-4 text-[18px] font-semibold leading-[30px] text-white">
            {`Для поиска хоккейной команды
необходимо заполнить поля
профиля, либо подключиться к
существующей команде по коду
подтверждения.
Запросите код у администратора
Вашей команды.`}
          </p>
        </section>

        <div className="flex-1" />

        <section className="space-y-4 pb-6">
          <Link
            href="/profile-setup"
            className="flex h-[64px] w-full items-center justify-center rounded-[32px] bg-[#24d7b3] text-[18px] font-black text-black"
          >
            Заполнить профиль
          </Link>

          <Link
            href="/team-code"
            className="flex h-[64px] w-full items-center justify-center rounded-[32px] bg-[#24d7b3] text-[18px] font-black text-black"
          >
            Код подтверждения
          </Link>
        </section>
      </div>
    </main>
  );
}
