export default function NotFound() {
  return (
    <main className="min-h-[100dvh] bg-[#07110c] px-6 py-20 text-white">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#20e4c7]">XM 5.1</p>
        <h1 className="mt-4 text-5xl font-bold">Страница не найдена</h1>
        <p className="mt-5 text-white/60">Вернитесь на главную страницу хоккейного менеджера.</p>
        <a href="/" className="mt-8 inline-flex rounded-xl bg-[#20e4c7] px-6 py-4 font-bold text-[#03100d]">На главную</a>
      </div>
    </main>
  );
}
