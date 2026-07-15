const WEB_APP_URL = "https://hm51-next.vercel.app";
const ANDROID_URL = "https://play.google.com/store/apps/details?id=ru.hokkey.hokkeyApp&pcampaignid=web_share";
const WINDOWS_APP_URL = "mailto:office@codberry.ru?subject=Получить XM 5.1 для Windows";
const ARENA_REQUEST_URL = "mailto:office@codberry.ru?subject=Заявка ледовой арены на подключение к XM 5.1&body=Название арены:%0AГород:%0AКонтактное лицо:%0AТелефон:%0AEmail:";

const features = [
  ["▦", "Календарь игр и тренировок", "Планируйте события, получайте уведомления и контролируйте посещаемость.", "Администратор создаёт игры и тренировки в Windows-программе, указывает дату, время, стадион, соперника, продолжительность и комментарий. Игроки, тренеры и вратари видят события в веб-версии или Android-приложении, подтверждают участие и получают уведомления об изменениях."],
  ["◌", "Командный чат", "Общайтесь внутри команды, делитесь новостями и важной информацией.", "У каждой команды есть собственный закрытый чат. В нём можно быстро сообщить об изменении времени тренировки, обсудить состав, передать организационную информацию и сохранить важные сообщения в одном месте."],
  ["◎", "Управление составом", "Профили игроков, тренеров, вратарей и актуальный состав команды.", "Администратор ведёт состав в Windows-программе: добавляет участников, распределяет роли, рассматривает заявки и обновляет данные команды. Игроки и вратари видят свой профиль, номер, амплуа, команды и статус участия в событиях."],
  ["▣", "Финансы команды", "Взносы, расходы, доходы и прозрачный контроль бюджета.", "Финансовый модуль доступен администраторам в версии для Windows. Он помогает учитывать командные взносы, оплаты льда, турниров, судей, формы и другие расходы, а также контролировать задолженности участников."],
  ["⌁", "Сервисы для хоккеистов", "Свободный лёд, тренировки, ремонт амуниции и хоккейная барахолка.", "Игроки, тренеры и вратари могут пользоваться разделами «Час хоккея», «Подкаты с тренером», «Ремонт амуниции», «Барахолка» и поиском тренировок рядом с собой."],
  ["⌕", "Поиск команды", "Игроки и вратари находят команды, смотрят условия набора и отправляют заявки.", "Игрок или вратарь может найти подходящую команду на карте или в списке, посмотреть сведения о наборе, уровне, стадионе и расписании, а затем отправить заявку. Администратор получает заявку в Windows-программе."],
];

const roles = [
  ["Игрокам", "Расписание, подтверждение участия, профиль, командный чат и хоккейные сервисы.", "Игрок открывает XM 5.1 в браузере на iPhone или устанавливает Android-приложение из Google Play. Все функции для игрока предоставляются бесплатно.", "role-player"],
  ["Тренерам", "Состав на игру, посещаемость, календарь и быстрая связь с командой.", "Тренер использует бесплатную веб-версию на iPhone и компьютере либо Android-приложение. Он видит подтверждения участников, ближайшие события и информацию по команде.", "role-coach"],
  ["Вратарям", "Поиск команд и подкаток, заявки, календарь и дополнительные хоккейные часы.", "Вратарь пользуется XM 5.1 бесплатно через веб-версию или Android-приложение, может вступать в команды, подтверждать участие и находить дополнительные игры и тренировки.", "role-goalie"],
  ["Администраторам", "Полное управление командой через отдельную программу XM 5.1 для Windows.", "Администратор скачивает Windows-программу XM 5.1 и управляет расписанием, составом, заявками, стадионами, финансами и настройками команды. Тарифы относятся только к административной Windows-версии.", "role-admin"],
];

const adminSteps = [
  ["01", "Установите программу", "Получите административную версию XM 5.1 для Windows."],
  ["02", "Создайте команду", "Заполните данные команды, стадион, расписание и контакты."],
  ["03", "Добавьте участников", "Пригласите игроков, тренеров и вратарей или обработайте заявки."],
  ["04", "Управляйте работой", "Создавайте события, формируйте состав и контролируйте финансы."],
];

const memberSteps = [
  ["01", "Выберите платформу", "На iPhone откройте веб-версию, на Android установите приложение."],
  ["02", "Зарегистрируйтесь", "Выберите роль игрока, тренера или вратаря и заполните профиль."],
  ["03", "Вступите в команду", "Найдите команду, отправьте заявку или примите приглашение."],
  ["04", "Пользуйтесь бесплатно", "Следите за календарём, общайтесь и подтверждайте участие."],
];

const arenaFeatures = [
  ["❄", "Продажа свободного льда", "Публикация свободных интервалов, цен и условий аренды для хоккейных команд."],
  ["◷", "Запись на «Час хоккея»", "Создание открытых хоккейных часов и индивидуальная запись игроков и вратарей."],
  ["₽", "Разовая аренда", "Продажа отдельных свободных окон командам, тренерам и организаторам мероприятий."],
];

const plans = [
  ["Команда", "0 ₽", "Бесплатный", ["Одна команда", "Календарь", "Подтверждение участия", "Базовый состав", "Командный чат", "Уведомления", "Приглашение игроков", "Поиск команды"]],
  ["Команда Pro", "790 ₽ / месяц", "Рекомендуемый", ["7 900 ₽ при оплате за год", "Расширенные финансы", "Аналитика посещаемости", "Несколько администраторов", "Экспорт в Excel", "История изменений", "Шаблоны регулярных тренировок", "Автоматические напоминания должникам", "Синхронизация с лигой", "Приоритетная поддержка", "Расширенная статистика"]],
  ["Клуб", "24 900 ₽ / год", "До 5 команд", ["До пяти команд", "Единая база участников", "Общие сотрудники и тренеры", "Сводные финансы", "Централизованные уведомления", "Управление несколькими составами", "Клубная аналитика"]],
];

const qrUrl = (url: string) => `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(url)}`;

function AnimatedIceBackground() {
  return (
    <div className="animated-ice-background" aria-hidden="true">
      <div className="animated-grid" />
      <div className="animated-glow animated-glow-one" />
      <div className="animated-glow animated-glow-two" />
      <div className="animated-glow animated-glow-three" />
      <div className="animated-noise" />
      <div className="animated-trail animated-trail-one" />
      <div className="animated-trail animated-trail-two" />
      <div className="animated-trail animated-trail-three" />
      <div className="animated-snow">{Array.from({ length: 28 }, (_, index) => <span key={index} />)}</div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="phone-stage" aria-hidden="true">
      <div className="phone phone-back phone-chat"><div className="phone-top">Чат команды</div><div className="chat-row"><b>Тренер</b><span>Сегодня тренировка в 19:00</span></div><div className="chat-row"><b>Вратарь</b><span>Буду на льду</span></div></div>
      <div className="phone phone-main"><div className="phone-top">Календарь <span>•••</span></div><div className="month">Июль 2026</div><div className="calendar-grid">{["Пн","Вт","Ср","Чт","Пт","Сб","Вс","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26"].map((day) => <span className={day === "11" ? "active-day" : ""} key={day}>{day}</span>)}</div><div className="event-card training"><b>Тренировка</b><span>11 июля, 19:00</span></div><div className="event-card game"><b>Игра</b><span>13 июля, 18:30</span></div></div>
      <div className="phone phone-back phone-team"><div className="phone-top">Роли команды</div>{["Игрок","Тренер","Вратарь","Администратор"].map((item) => <div className="player" key={item}><i>{item[0]}</i><span>{item}</span></div>)}</div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="landing-page">
      <AnimatedIceBackground />
      <header className="site-header">
        <a className="brand" href="#top"><img src="/xm-logo.svg?v=5" alt="Логотип XM 5.1" className="brand-logo" /><span><strong>XM 5.1</strong><small>ХОККЕЙНЫЙ МЕНЕДЖЕР</small></span></a>
        <nav className="desktop-nav"><a href="#features">Возможности</a><a href="#roles">Роли</a><a href="#admin-workflow">Администраторам</a><a href="#members-workflow">Участникам</a><a href="#arenas">Аренам</a><a href="#pricing">Тарифы</a><a href="/privacy-policy">Политика</a></nav>
        <div className="header-actions"><a className="button button-ghost header-web" href={WEB_APP_URL}>Веб-версия</a><a className="button button-primary header-download" href={ANDROID_URL}>Google Play</a><details className="mobile-menu"><summary><span/><span/><span/></summary><div><a href="#features">Возможности</a><a href="#roles">Роли</a><a href="#admin-workflow">Администраторам</a><a href="#members-workflow">Участникам</a><a href="#arenas">Ледовым аренам</a><a href="#pricing">Тарифы</a><a href="/privacy-policy">Политика обработки персональных данных</a></div></details></div>
      </header>

      <section className="hero" id="top"><div className="ice-glow ice-glow-one" /><div className="ice-glow ice-glow-two" /><div className="hero-copy"><p className="eyebrow">Единая цифровая платформа для хоккейных команд</p><h1>Вся жизнь хоккейной команды — <span>в одной системе</span></h1><p className="hero-text">Администратор управляет командой в программе для Windows. Игроки, тренеры и вратари бесплатно пользуются веб-версией на iPhone и компьютере или приложением для Android.</p><div className="hero-actions"><a className="button button-primary" href={ANDROID_URL}>Скачать для Android</a><a className="button button-ghost" href={WEB_APP_URL}>Открыть на iPhone</a><a className="button button-outline" href={WINDOWS_APP_URL}>Версия для Windows</a></div></div><PhoneMockup /></section>

      <section className="quick-features">{["Календарь","Чат","Состав","Финансы","Сервисы","Поиск команды"].map((item,index)=><div key={item}><i>{["▦","◌","◎","▣","⌁","⌕"][index]}</i>{item}</div>)}</section>

      <section className="section" id="features"><div className="section-heading"><p className="eyebrow">Возможности</p><h2>Всё, что нужно хоккейной команде</h2></div><div className="feature-grid">{features.map(([icon,title,text,details])=><article className="feature-card" key={title}><i>{icon}</i><h3>{title}</h3><p>{text}</p><details><summary>Подробнее →</summary><p>{details}</p></details></article>)}</div></section>

      <section className="section roles-section" id="roles"><div className="section-heading"><p className="eyebrow">Для каждого участника</p><h2>Четыре роли — одна команда</h2></div><div className="role-grid role-grid-four">{roles.map(([title,text,details,className])=><article className={`role-card ${className}`} key={title}><div><h3>{title}</h3><p>{text}</p><details><summary>Узнать больше →</summary><p>{details}</p></details></div></article>)}</div></section>

      <section className="section workflow-section" id="admin-workflow"><div className="workflow-heading admin-heading"><div><p className="eyebrow">Отдельная программа для Windows</p><h2>Как это работает для администратора</h2><p>Администратор получает полный набор инструментов управления командой в настольной программе XM 5.1.</p></div><a className="button button-primary" href={WINDOWS_APP_URL}>Получить XM 5.1 для Windows</a></div><div className="steps-grid">{adminSteps.map(([num,title,text])=><article key={num}><span>{num}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>

      <section className="section workflow-section" id="members-workflow"><div className="workflow-heading"><div><p className="eyebrow">Бесплатно для участников</p><h2>Как это работает для игроков, тренеров и вратарей</h2><p>На iPhone сервис открывается как веб-приложение, на Android устанавливается из Google Play.</p></div><div className="hero-actions workflow-actions"><a className="button button-primary" href={ANDROID_URL}>Google Play</a><a className="button button-ghost" href={WEB_APP_URL}>Веб-версия</a></div></div><div className="steps-grid">{memberSteps.map(([num,title,text])=><article key={num}><span>{num}</span><h3>{title}</h3><p>{text}</p></article>)}</div><div className="member-install-block"><div className="section-heading member-install-heading"><p className="eyebrow">Установка на телефон</p><h2>Сканируйте QR-код и установите XM 5.1</h2><p>Выберите свою платформу. Для iPhone используется веб-версия, для Android — приложение из Google Play.</p></div><div className="qr-grid"><article className="qr-card"><span className="qr-platform">Веб / iPhone</span><img src={qrUrl(WEB_APP_URL)} alt="QR-код веб-версии XM 5.1" /><h3>Для iPhone и браузера</h3><p>Откройте сайт в Safari, нажмите «Поделиться», затем выберите «На экран Домой».</p><a className="button button-ghost" href={WEB_APP_URL}>Открыть веб-версию</a></article><article className="qr-card qr-card-android"><span className="qr-platform">Android</span><img src={qrUrl(ANDROID_URL)} alt="QR-код Google Play XM 5.1" /><h3>Приложение для Android</h3><p>Отсканируйте QR-код — откроется страница XM 5.1 в Google Play.</p><a className="button button-primary" href={ANDROID_URL}>Открыть Google Play</a></article></div><div className="install-rules"><div><b>1</b><span><strong>iPhone</strong>Откройте веб-версию → «Поделиться» → «На экран Домой».</span></div><div><b>2</b><span><strong>Android</strong>Откройте Google Play → нажмите «Установить».</span></div><div><b>3</b><span><strong>После установки</strong>Веб-версия запускается с экрана телефона как обычное приложение.</span></div></div></div></section>

      <section className="section arena-section" id="arenas"><div className="workflow-heading"><div><p className="eyebrow">Модуль для ледовых арен</p><h2>Продавайте свободный лёд через XM 5.1</h2><p>Публикуйте свободное время, принимайте заявки от команд, организуйте «Час хоккея» и продавайте разовую аренду.</p></div><a className="button button-primary" href={ARENA_REQUEST_URL}>Оставить заявку</a></div><div className="feature-grid">{arenaFeatures.map(([icon,title,text])=><article className="feature-card" key={title}><i>{icon}</i><h3>{title}</h3><p>{text}</p></article>)}</div></section>

      <section className="section pricing-section" id="pricing"><div className="section-heading"><p className="eyebrow">Тарифы XM 5.1</p><h2>Бесплатно для участников. Платит администратор, клуб или партнёр</h2><p>Основные функции для игроков, тренеров и вратарей остаются бесплатными.</p></div><article className="pilot-offer"><div className="pilot-offer-main"><span className="pilot-badge">Специальная программа запуска</span><h3>Первые 50 команд XM 5.1</h3><p className="pilot-price"><del>Обычная стоимость — 7 900 ₽ в год</del><strong>Для первых 50 команд Санкт-Петербурга — бесплатно до 31 мая 2027 года</strong></p><p>Команда проходит полноценное подключение, добавляет не менее 15 участников, создаёт события в XM 5.1 и назначает ответственного администратора.</p><a className="button button-primary" href="mailto:office@codberry.ru?subject=Первые 50 команд XM 5.1">Подать заявку</a></div><div className="pilot-conditions"><h4>Условия участия</h4><ul><li>Не менее 15 участников в команде</li><li>Регулярное создание игр и тренировок</li><li>Ответственный администратор</li><li>Обратная связь по работе системы</li><li>Разрешение использовать отзыв и обезличенные результаты внедрения</li><li>Не менее трёх коротких интервью в течение сезона</li></ul></div></article><div className="pricing-grid">{plans.map(([name,price,badge,items],index)=><article className={`price-card ${index===1?"featured-plan":""}`} key={name as string}><span className="plan-badge">{badge as string}</span><div className="puck-mini"/><h3>{name as string}</h3><strong>{price as string}</strong><ul>{(items as string[]).map(item=><li key={item}>✓ {item}</li>)}</ul><a className={index===1?"button button-pink":"button button-outline"} href={`mailto:office@codberry.ru?subject=Тариф XM 5.1 — ${encodeURIComponent(name as string)}`}>Выбрать тариф</a></article>)}</div></section>

      <section className="final-cta"><div><p className="eyebrow">Выберите свою версию</p><h2>Администратору — Windows. Команде — веб и Android.</h2></div><div className="hero-actions"><a className="button button-primary" href={WINDOWS_APP_URL}>Windows</a><a className="button button-ghost" href={WEB_APP_URL}>Веб-версия</a><a className="button button-outline" href={ANDROID_URL}>Google Play</a></div></section>

      <footer id="contacts"><a className="brand footer-brand" href="#top"><img src="/xm-logo.svg?v=5" alt="Логотип XM 5.1" className="brand-logo"/><span><strong>XM 5.1</strong><small>ХОККЕЙНЫЙ МЕНЕДЖЕР</small></span></a><div className="footer-links"><a href="mailto:office@codberry.ru">office@codberry.ru</a><a href="tel:+79581745943">+7 (958) 174-59-43</a><a href="https://hm5-1.ru">hm5-1.ru</a></div><a className="codberry" href="https://www.codberry.ru" target="_blank" rel="noopener noreferrer"><small>Разработка и поддержка</small><strong>Codberry</strong></a></footer>
    </main>
  );
}
