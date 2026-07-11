const features = [
  { icon: "▦", title: "Календарь игр и тренировок", text: "Планируйте события, получайте уведомления и контролируйте посещаемость." },
  { icon: "◌", title: "Командный чат", text: "Общайтесь внутри команды, делитесь новостями и важной информацией." },
  { icon: "◎", title: "Управление составом", text: "Профили игроков, роли, статистика и актуальный состав команды." },
  { icon: "▣", title: "Финансы команды", text: "Взносы, расходы, доходы и прозрачный контроль бюджета." },
  { icon: "⌁", title: "Сервисы и стадионы", text: "Лёд, экипировка, ремонт амуниции и полезные хоккейные сервисы." },
  { icon: "⌕", title: "Поиск команды и игроков", text: "Находите команды, игроков и новые возможности для развития." },
];

const roles = [
  { title: "Игрокам", text: "Расписание, уведомления, подтверждение участия, статистика и общение с командой.", className: "role-player" },
  { title: "Тренерам", text: "Планирование тренировок и игр, управление составом и посещаемостью.", className: "role-coach" },
  { title: "Администраторам", text: "Финансы, заявки, документы, доступы и управление всей командой.", className: "role-admin" },
];

const steps = [
  ["01", "Скачайте приложение", "Установите XM 5.1 на смартфон или откройте веб-версию."],
  ["02", "Создайте команду", "Добавьте игроков, тренеров и администраторов."],
  ["03", "Настройте работу", "Заполните календарь, состав, финансы и командные данные."],
  ["04", "Управляйте проще", "Планируйте, общайтесь и развивайте команду в одном месте."],
];

const plans = [
  { name: "Стартовый", price: "Бесплатно", badge: "Для знакомства", items: ["Тестовый период 7 дней", "Полный функционал", "Одна команда"] },
  { name: "Персональный", price: "Бесплатно весь год", badge: "Популярный", items: ["Администрирование 1 команды", "Полный функционал", "Техническая поддержка"] },
  { name: "Клубный", price: "Бесплатно весь год", badge: "Для клуба", items: ["До 5 хоккейных команд", "Единое управление", "Техническая поддержка"] },
];

function PhoneMockup() {
  return (
    <div className="phone-stage" aria-hidden="true">
      <div className="phone phone-back phone-chat">
        <div className="phone-top">Чат команды</div>
        <div className="chat-row"><b>Тренер</b><span>Парни, сегодня тренировка в 19:00</span></div>
        <div className="chat-row"><b>Андрей</b><span>Буду 👍</span></div>
        <div className="chat-row"><b>Иван</b><span>Я тоже</span></div>
      </div>
      <div className="phone phone-main">
        <div className="phone-top">Календарь <span>•••</span></div>
        <div className="month">Май 2026</div>
        <div className="calendar-grid">
          {["Пн","Вт","Ср","Чт","Пт","Сб","Вс","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31"].map((day) => <span className={day === "18" ? "active-day" : ""} key={day}>{day}</span>)}
        </div>
        <div className="event-card training"><b>Тренировка</b><span>18 мая, 19:00–21:00</span><small>Ледовая арена «Север»</small></div>
        <div className="event-card game"><b>Игра с «Северными волками»</b><span>20 мая, 18:30</span><small>Ледовый дворец</small></div>
        <div className="phone-nav"><span>▦</span><span>◌</span><span>◎</span><span>▣</span><span>•••</span></div>
      </div>
      <div className="phone phone-back phone-team">
        <div className="phone-top">Состав команды</div>
        <p className="group-label">Вратари</p>
        <div className="player"><i>30</i><span>Иванов И.</span></div>
        <div className="player"><i>1</i><span>Петров А.</span></div>
        <p className="group-label">Нападающие</p>
        <div className="player"><i>12</i><span>Смирнов Д.</span></div>
        <div className="player"><i>17</i><span>Кузнецов М.</span></div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="XM 5.1">
          <span className="brand-mark"><i /></span>
          <span><strong>XM 5.1</strong><small>ХОККЕЙНЫЙ МЕНЕДЖЕР</small></span>
        </a>
        <nav className="desktop-nav">
          <a href="#about">О приложении</a><a href="#features">Возможности</a><a href="#pricing">Тарифы</a><a href="#contacts">Контакты</a>
        </nav>
        <div className="header-actions">
          <a className="button button-ghost header-web" href="https://app.hm5-1.ru">Веб-версия</a>
          <a className="button button-primary header-download" href="https://play.google.com/store/apps/details?id=ru.hokkey.hokkeyApp&pcampaignid=web_share">Скачать приложение</a>
          <details className="mobile-menu"><summary aria-label="Открыть меню"><span /><span /><span /></summary><div><a href="#about">О приложении</a><a href="#features">Возможности</a><a href="#pricing">Тарифы</a><a href="#contacts">Контакты</a><a href="https://app.hm5-1.ru">Веб-версия</a></div></details>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="ice-glow ice-glow-one" /><div className="ice-glow ice-glow-two" />
        <div className="hero-copy" id="about">
          <p className="eyebrow">Единая цифровая платформа для хоккейных команд</p>
          <h1>Вся жизнь хоккейной команды — <span>в одном приложении</span></h1>
          <p className="hero-text">XM 5.1 помогает игрокам, тренерам и администраторам управлять расписанием, составом, посещаемостью, финансами и общением команды.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="https://play.google.com/store/apps/details?id=ru.hokkey.hokkeyApp&pcampaignid=web_share">↓&nbsp; Скачать приложение</a>
            <a className="button button-ghost" href="https://app.hm5-1.ru">▣&nbsp; Открыть веб-версию</a>
          </div>
          <div className="store-row"><span>Google Play</span><span>App Store</span><span>AppGallery</span></div>
        </div>
        <PhoneMockup />
      </section>

      <section className="quick-features" aria-label="Основные функции">
        {["Календарь","Чат","Состав","Финансы","Сервисы","Поиск команды"].map((item, index) => <div key={item}><i>{["▦","◌","◎","▣","⌁","⌕"][index]}</i>{item}</div>)}
      </section>

      <section className="section" id="features">
        <div className="section-heading"><p className="eyebrow">Возможности</p><h2>Всё, что нужно для управления командой</h2><p>Инструменты XM 5.1 объединены в одной современной и понятной системе.</p></div>
        <div className="feature-grid">{features.map((feature, index) => <article className="feature-card reveal-card" style={{ animationDelay: `${index * 70}ms` }} key={feature.title}><i>{feature.icon}</i><h3>{feature.title}</h3><p>{feature.text}</p><span>Подробнее →</span></article>)}</div>
      </section>

      <section className="section roles-section">
        <div className="section-heading"><p className="eyebrow">Для каждого участника</p><h2>Свои возможности для каждой роли</h2></div>
        <div className="role-grid">{roles.map((role) => <article className={`role-card ${role.className}`} key={role.title}><div><h3>{role.title}</h3><p>{role.text}</p><a href="#features">Узнать больше →</a></div></article>)}</div>
      </section>

      <section className="section steps-section">
        <div className="section-heading"><p className="eyebrow">Простой старт</p><h2>Как это работает</h2></div>
        <div className="steps-grid">{steps.map(([num,title,text]) => <article key={num}><span>{num}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="section pricing-section" id="pricing">
        <div className="section-heading"><p className="eyebrow">Тарифы</p><h2>Начните пользоваться уже сегодня</h2><p>Выберите формат, который соответствует вашей команде или клубу.</p></div>
        <div className="pricing-grid">{plans.map((plan, index) => <article className={`price-card ${index === 1 ? "featured-plan" : ""}`} key={plan.name}><span className="plan-badge">{plan.badge}</span><div className="puck-mini" /><h3>{plan.name}</h3><strong>{plan.price}</strong><ul>{plan.items.map((item) => <li key={item}>✓ {item}</li>)}</ul><a className={index === 1 ? "button button-pink" : "button button-outline"} href="mailto:office@codberry.ru?subject=Тариф XM 5.1">Выбрать тариф</a></article>)}</div>
      </section>

      <section className="final-cta"><div><p className="eyebrow">Хоккей начинается с команды</p><h2>Управляйте ей быстрее, удобнее и современнее</h2></div><div className="hero-actions"><a className="button button-primary" href="https://play.google.com/store/apps/details?id=ru.hokkey.hokkeyApp&pcampaignid=web_share">Скачать XM 5.1</a><a className="button button-ghost" href="https://app.hm5-1.ru">Открыть веб-версию</a></div></section>

      <footer id="contacts">
        <a className="brand footer-brand" href="#top"><span className="brand-mark"><i /></span><span><strong>XM 5.1</strong><small>ХОККЕЙНЫЙ МЕНЕДЖЕР</small></span></a>
        <div className="footer-links"><a href="mailto:office@codberry.ru">office@codberry.ru</a><a href="tel:+79581745943">+7 (958) 174-59-43</a><a href="https://hm5-1.ru">hm5-1.ru</a></div>
        <div className="codberry"><small>Разработка и поддержка</small><strong>Codberry</strong></div>
      </footer>
    </main>
  );
}
