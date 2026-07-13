const features = [
  {
    icon: "▦",
    title: "Календарь игр и тренировок",
    text: "Планируйте события, получайте уведомления и контролируйте посещаемость.",
    details: "Администратор создаёт игры и тренировки в программе для Windows, указывает дату, время, стадион, соперника, продолжительность и комментарий. Игроки, тренеры и вратари видят события в веб-версии или Android-приложении, подтверждают участие и получают уведомления об изменениях.",
  },
  {
    icon: "◌",
    title: "Командный чат",
    text: "Общайтесь внутри команды, делитесь новостями и важной информацией.",
    details: "У каждой команды есть собственный закрытый чат. В нём можно сообщить об изменении времени тренировки, обсудить состав, передать организационную информацию и быстро связаться с игроками, тренерами и вратарями.",
  },
  {
    icon: "◎",
    title: "Управление составом",
    text: "Профили игроков, тренеров, вратарей и актуальный состав команды.",
    details: "Администратор ведёт состав в Windows-программе: добавляет участников, распределяет роли, рассматривает заявки и обновляет данные команды. Игроки и вратари видят свой профиль, номер, амплуа, команды и статус участия в событиях.",
  },
  {
    icon: "▣",
    title: "Финансы команды",
    text: "Взносы, расходы, доходы и прозрачный контроль бюджета.",
    details: "Финансовый модуль доступен администраторам в версии для Windows. Он помогает учитывать командные взносы, оплаты льда, турниров, судей, формы и другие расходы, а также контролировать задолженности участников.",
  },
  {
    icon: "⌁",
    title: "Сервисы для хоккеистов",
    text: "Свободный лёд, тренировки, ремонт амуниции и хоккейная барахолка.",
    details: "Игроки, тренеры и вратари могут пользоваться разделами «Час хоккея», «Подкаты с тренером», «Ремонт амуниции», «Барахолка» и поиском тренировок рядом с собой.",
  },
  {
    icon: "⌕",
    title: "Поиск команды и игроков",
    text: "Находите команды, игроков, тренеров и вратарей.",
    details: "Игрок или вратарь может найти подходящую команду на карте или в списке, посмотреть сведения о наборе и отправить заявку. Администратор получает заявки в Windows-программе и принимает решение о добавлении участника.",
  },
];

const roles = [
  {
    title: "Игрокам",
    text: "Расписание, уведомления, подтверждение участия, профиль и командный чат.",
    details: "Игрок открывает XM 5.1 в браузере на iPhone или устанавливает Android-приложение из Google Play. Все функции для игрока предоставляются бесплатно.",
    className: "role-player",
  },
  {
    title: "Тренерам",
    text: "Состав на игру, посещаемость, расписание и связь с командой.",
    details: "Тренер использует бесплатную веб-версию на iPhone и компьютере либо Android-приложение. Он видит подтверждения участников, ближайшие события и информацию по команде.",
    className: "role-coach",
  },
  {
    title: "Вратарям",
    text: "Поиск команд и подкаток, календарь, заявки и хоккейные сервисы.",
    details: "Вратарь пользуется XM 5.1 бесплатно через веб-версию или Android-приложение, может вступать в команды, подтверждать участие и находить дополнительные игры и тренировки.",
    className: "role-goalie",
  },
  {
    title: "Администраторам",
    text: "Полное управление командой через отдельную программу для Windows.",
    details: "Администратор скачивает Windows-программу XM 5.1 и управляет расписанием, составом, заявками, стадионами, финансами и настройками команды. Тарифы относятся только к административной Windows-версии.",
    className: "role-admin",
  },
];

const adminSteps = [
  ["01", "Установите программу", "Скачайте отдельную административную версию XM 5.1 для Windows."],
  ["02", "Создайте команду", "Заполните название, контакты, стадион, расписание и основные данные."],
  ["03", "Добавьте участников", "Пригласите игроков, тренеров и вратарей или обработайте входящие заявки."],
  ["04", "Управляйте командой", "Создавайте события, формируйте состав, учитывайте финансы и контролируйте посещаемость."],
];

const memberSteps = [
  ["01", "Выберите платформу", "На iPhone откройте веб-версию, на Android установите приложение из Google Play."],
  ["02", "Зарегистрируйтесь", "Выберите роль: игрок, тренер или вратарь, затем заполните профиль."],
  ["03", "Вступите в команду", "Найдите команду и отправьте заявку либо примите приглашение администратора."],
  ["04", "Пользуйтесь бесплатно", "Следите за календарём, подтверждайте участие, общайтесь и используйте хоккейные сервисы."],
];

const arenaFeatures = [
  {
    icon: "❄",
    title: "Продажа свободного льда",
    text: "Арена публикует свободные интервалы, цену, продолжительность и условия аренды. Команды находят подходящее время и отправляют заявку на бронирование.",
  },
  {
    icon: "◷",
    title: "Запись на «Час хоккея»",
    text: "Можно создавать открытые хоккейные часы, указывать количество мест и принимать индивидуальные записи игроков и вратарей.",
  },
  {
    icon: "₽",
    title: "Разовая аренда льда",
    text: "Неиспользуемые окна выставляются на продажу для разовой аренды командой, тренером или организатором хоккейного мероприятия.",
  },
];

const plans = [
  { name: "Стартовый", price: "Бесплатно", badge: "Для знакомства", items: ["Тестовый период 7 дней", "Windows-программа администратора", "Управление одной командой"] },
  { name: "Персональный", price: "Бесплатно весь год", badge: "Популярный", items: ["Администрирование 1 команды", "Полный функционал Windows-версии", "Техническая поддержка"] },
  { name: "Клубный", price: "Бесплатно весь год", badge: "Для клуба", items: ["До 5 хоккейных команд", "Единое управление", "Техническая поддержка"] },
];

const WEB_APP_URL = "https://hm51-next.vercel.app";
const ANDROID_URL = "https://play.google.com/store/apps/details?id=ru.hokkey.hokkeyApp&pcampaignid=web_share";
const WINDOWS_APP_URL = "mailto:office@codberry.ru?subject=Получить XM 5.1 для Windows";
const ARENA_REQUEST_URL = "mailto:office@codberry.ru?subject=Заявка ледовой арены на подключение к XM 5.1&body=Название арены:%0AГород:%0AКонтактное лицо:%0AТелефон:%0AEmail:";

const logoStyle = {
  width: 52,
  height: 52,
  borderRadius: 14,
  objectFit: "cover" as const,
  boxShadow: "0 0 28px rgba(32,228,199,.22)",
};

const detailsStyle = {
  marginTop: 20,
  paddingTop: 16,
  borderTop: "1px solid rgba(255,255,255,.08)",
};

const summaryStyle = {
  color: "#20e4c7",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  listStyle: "none" as const,
};

const detailsTextStyle = {
  marginTop: 14,
  color: "#b8c8c4",
  fontSize: 14,
  lineHeight: 1.65,
};

const workflowHeadingStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  flexWrap: "wrap" as const,
  gap: 56,
  marginBottom: 44,
};

function PhoneMockup() {
  return (
    <div className="phone-stage" aria-hidden="true">
      <div className="phone phone-back phone-chat">
        <div className="phone-top">Чат команды</div>
        <div className="chat-row"><b>Тренер</b><span>Сегодня тренировка в 19:00</span></div>
        <div className="chat-row"><b>Вратарь</b><span>Буду на льду</span></div>
        <div className="chat-row"><b>Игрок</b><span>Подтверждаю участие</span></div>
      </div>
      <div className="phone phone-main">
        <div className="phone-top">Календарь <span>•••</span></div>
        <div className="month">Июль 2026</div>
        <div className="calendar-grid">
          {["Пн","Вт","Ср","Чт","Пт","Сб","Вс","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","1","2"].map((day) => <span className={day === "11" ? "active-day" : ""} key={day}>{day}</span>)}
        </div>
        <div className="event-card training"><b>Тренировка</b><span>11 июля, 19:00–21:00</span><small>Ледовая арена</small></div>
        <div className="event-card game"><b>Игра</b><span>13 июля, 18:30</span><small>Состав подтверждён</small></div>
        <div className="phone-nav"><span>▦</span><span>◌</span><span>◎</span><span>▣</span><span>•••</span></div>
      </div>
      <div className="phone phone-back phone-team">
        <div className="phone-top">Роли команды</div>
        <p className="group-label">Участники</p>
        <div className="player"><i>И</i><span>Игрок</span></div>
        <div className="player"><i>Т</i><span>Тренер</span></div>
        <div className="player"><i>В</i><span>Вратарь</span></div>
        <div className="player"><i>А</i><span>Администратор</span></div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="XM 5.1">
          <img src="/xm-logo.svg?v=4" alt="Логотип XM 5.1" style={logoStyle} />
          <span><strong>XM 5.1</strong><small>ХОККЕЙНЫЙ МЕНЕДЖЕР</small></span>
        </a>
        <nav className="desktop-nav">
          <a href="#features">Возможности</a><a href="#roles">Роли</a><a href="#admin-workflow">Администраторам</a><a href="#members-workflow">Участникам</a><a href="#arenas">Ледовым аренам</a><a href="#pricing">Тарифы</a>
        </nav>
        <div className="header-actions">
          <a className="button button-ghost header-web" href={WEB_APP_URL}>Веб-версия</a>
          <a className="button button-primary header-download" href={ANDROID_URL}>Google Play</a>
          <details className="mobile-menu"><summary aria-label="Открыть меню"><span /><span /><span /></summary><div><a href="#features">Возможности</a><a href="#roles">Роли</a><a href="#admin-workflow">Администраторам</a><a href="#members-workflow">Участникам</a><a href="#arenas">Ледовым аренам</a><a href="#pricing">Тарифы</a><a href={WEB_APP_URL}>Веб-версия</a></div></details>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="ice-glow ice-glow-one" /><div className="ice-glow ice-glow-two" />
        <div className="hero-copy" id="about">
          <p className="eyebrow">Единая цифровая платформа для хоккейных команд</p>
          <h1>Вся жизнь хоккейной команды — <span>в одной системе</span></h1>
          <p className="hero-text">Администратор управляет командой в отдельной программе для Windows. Игроки, тренеры и вратари бесплатно пользуются веб-версией на iPhone и компьютере или приложением для Android.</p>
          <div className="hero-actions">
            <a className="button button-primary" href={ANDROID_URL}>Скачать для Android</a>
            <a className="button button-ghost" href={WEB_APP_URL}>Открыть на iPhone и в браузере</a>
            <a className="button button-outline" href={WINDOWS_APP_URL}>Получить версию для Windows</a>
          </div>
          <div className="store-row"><span>Android · Google Play</span><span>iPhone · веб-версия</span><span>Windows · администратор</span></div>
        </div>
        <PhoneMockup />
      </section>

      <section className="quick-features" aria-label="Основные функции">
        {["Календарь","Чат","Состав","Финансы","Сервисы","Поиск команды"].map((item, index) => <div key={item}><i>{["▦","◌","◎","▣","⌁","⌕"][index]}</i>{item}</div>)}
      </section>

      <section className="section" id="features">
        <div className="section-heading"><p className="eyebrow">Возможности</p><h2>Всё, что нужно хоккейной команде</h2><p>Административные инструменты собраны в Windows-программе, а участники получают удобный бесплатный доступ со смартфона или через браузер.</p></div>
        <div className="feature-grid">
          {features.map((feature, index) => (
            <article className="feature-card reveal-card" style={{ animationDelay: `${index * 70}ms` }} key={feature.title}>
              <i>{feature.icon}</i><h3>{feature.title}</h3><p>{feature.text}</p>
              <details style={detailsStyle}><summary style={summaryStyle}>Подробнее →</summary><p style={detailsTextStyle}>{feature.details}</p></details>
            </article>
          ))}
        </div>
      </section>

      <section className="section roles-section" id="roles">
        <div className="section-heading"><p className="eyebrow">Для каждого участника</p><h2>Четыре роли — одна команда</h2></div>
        <div className="role-grid role-grid-four">
          {roles.map((role) => (
            <article className={`role-card ${role.className}`} key={role.title}>
              <div><h3>{role.title}</h3><p>{role.text}</p><details style={detailsStyle}><summary style={summaryStyle}>Узнать больше →</summary><p style={detailsTextStyle}>{role.details}</p></details></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section workflow-section admin-workflow" id="admin-workflow">
        <div className="workflow-heading" style={workflowHeadingStyle}>
          <div style={{maxWidth: 760}}><p className="eyebrow">Отдельная программа для Windows</p><h2>Как это работает для администратора</h2><p>Администратор получает полный набор инструментов управления командой в настольной программе XM 5.1.</p></div>
          <a className="button button-primary" href={WINDOWS_APP_URL}>Получить XM 5.1 для Windows</a>
        </div>
        <div className="steps-grid">{adminSteps.map(([num,title,text]) => <article key={num}><span>{num}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="section workflow-section members-workflow" id="members-workflow">
        <div className="workflow-heading" style={workflowHeadingStyle}>
          <div style={{maxWidth: 760}}><p className="eyebrow">Бесплатно для участников</p><h2>Как это работает для игроков, тренеров и вратарей</h2><p>На iPhone сервис открывается как веб-приложение, на Android устанавливается из Google Play. Оплата не требуется.</p></div>
          <div className="hero-actions workflow-actions" style={{marginTop: 0}}><a className="button button-primary" href={ANDROID_URL}>Google Play</a><a className="button button-ghost" href={WEB_APP_URL}>Веб-версия для iPhone</a></div>
        </div>
        <div className="steps-grid">{memberSteps.map(([num,title,text]) => <article key={num}><span>{num}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="section arena-section" id="arenas">
        <div style={{...workflowHeadingStyle, alignItems: "center"}}>
          <div style={{maxWidth: 760}}>
            <p className="eyebrow">Новый модуль для ледовых арен</p>
            <h2 style={{margin: 0, fontSize: "clamp(34px,4vw,56px)", lineHeight: 1.04, letterSpacing: "-.045em"}}>Продавайте свободный лёд через XM 5.1</h2>
            <p style={{marginTop: 20, color: "#aebdb9", fontSize: 17, lineHeight: 1.65}}>Для ледовых арен будет создан отдельный модуль, где можно публиковать свободное время, принимать заявки от команд, организовывать «Час хоккея» и продавать разовую аренду льда.</p>
          </div>
          <a className="button button-primary" href={ARENA_REQUEST_URL}>Оставить заявку</a>
        </div>
        <div className="feature-grid">
          {arenaFeatures.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <i>{feature.icon}</i><h3>{feature.title}</h3><p>{feature.text}</p>
            </article>
          ))}
        </div>
        <div style={{marginTop: 24, padding: "24px 28px", border: "1px solid rgba(32,228,199,.25)", borderRadius: 18, background: "rgba(32,228,199,.055)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24}}>
          <div><strong style={{display: "block", fontSize: 20}}>Подключение арены начинается с заявки</strong><span style={{display: "block", marginTop: 8, color: "#aebdb9", lineHeight: 1.55}}>Укажите название арены, город и контактные данные. Мы свяжемся с вами и обсудим подключение модуля.</span></div>
          <a className="button button-outline" href={ARENA_REQUEST_URL}>Подать заявку от арены</a>
        </div>
      </section>

      <section className="section pricing-section" id="pricing">
        <div className="section-heading"><p className="eyebrow">Тарифы Windows-версии</p><h2>Тарифы только для администраторов</h2><p>Игроки, тренеры и вратари пользуются мобильной и веб-версией бесплатно. Тарифы относятся только к административной программе для Windows.</p></div>
        <div className="pricing-grid">{plans.map((plan, index) => <article className={`price-card ${index === 1 ? "featured-plan" : ""}`} key={plan.name}><span className="plan-badge">{plan.badge}</span><div className="puck-mini" /><h3>{plan.name}</h3><strong>{plan.price}</strong><ul>{plan.items.map((item) => <li key={item}>✓ {item}</li>)}</ul><a className={index === 1 ? "button button-pink" : "button button-outline"} href="mailto:office@codberry.ru?subject=Тариф административной версии XM 5.1">Выбрать тариф</a></article>)}</div>
        <div className="free-members-note"><strong>Для игроков, тренеров и вратарей — бесплатно</strong><span>Веб-версия, версия для iPhone через браузер и Android-приложение не требуют оплаты.</span></div>
      </section>

      <section className="final-cta"><div><p className="eyebrow">Выберите свою версию</p><h2>Администратору — Windows. Команде — веб и Android.</h2></div><div className="hero-actions"><a className="button button-primary" href={WINDOWS_APP_URL}>Версия для Windows</a><a className="button button-ghost" href={WEB_APP_URL}>Веб-версия</a><a className="button button-outline" href={ANDROID_URL}>Google Play</a></div></section>

      <footer id="contacts">
        <a className="brand footer-brand" href="#top"><img src="/xm-logo.svg?v=4" alt="Логотип XM 5.1" style={logoStyle} /><span><strong>XM 5.1</strong><small>ХОККЕЙНЫЙ МЕНЕДЖЕР</small></span></a>
        <div className="footer-links"><a href="mailto:office@codberry.ru">office@codberry.ru</a><a href="tel:+79581745943">+7 (958) 174-59-43</a><a href="https://hm5-1.ru">hm5-1.ru</a></div>
        <div className="codberry"><small>Разработка и поддержка</small><strong>Codberry</strong></div>
      </footer>
    </main>
  );
}
