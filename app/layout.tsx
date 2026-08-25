import type { Metadata, Viewport } from "next";
import NotificationBootstrap from "./NotificationBootstrap";
import PlayerCoachProfileAction from "./components/PlayerCoachProfileAction";
import GlobalTopicSync from "./components/GlobalTopicSync";
import DeduplicateInstallText from "./DeduplicateInstallText";
import "./globals.css";
import AuthTokenGuard from "./components/AuthTokenGuard";
import PwaStartRedirect from "./components/PwaStartRedirect";
import { AppDataProvider } from "./lib/AppDataProvider";
import "./landing-extra.css";
import "./cosmic-landing.css";
import "./landing-label-fixes.css";
import "./pricing-promo.css";

const IOS_SUPPORT_WARNING_SCRIPT = String.raw`
(function () {
  var userAgent = navigator.userAgent || "";
  var isAppleMobileDevice = /iPhone|iPad|iPod/i.test(userAgent);

  if (!isAppleMobileDevice) return;

  var versionMatch = userAgent.match(/OS (\d+)[._](\d+)/i);
  if (!versionMatch) return;

  var major = parseInt(versionMatch[1], 10);
  var minor = parseInt(versionMatch[2], 10);
  var supported = major > 16 || (major === 16 && minor >= 4);

  if (supported) return;

  function showUnsupportedIosWarning() {
    if (document.getElementById("hm51-unsupported-ios-warning")) return;

    var overlay = document.createElement("div");
    overlay.id = "hm51-unsupported-ios-warning";
    overlay.setAttribute("role", "alertdialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "hm51-ios-warning-title");
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483647",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:24px",
      "padding-top:max(24px, env(safe-area-inset-top))",
      "padding-bottom:max(24px, env(safe-area-inset-bottom))",
      "background:#07110c",
      "color:#ffffff",
      "font-family:Arial,Helvetica,sans-serif",
      "text-align:center"
    ].join(";");

    var card = document.createElement("div");
    card.style.cssText = [
      "width:100%",
      "max-width:420px",
      "padding:28px 22px",
      "border:1px solid rgba(255,255,255,0.14)",
      "border-radius:24px",
      "background:#17201b",
      "box-shadow:0 24px 70px rgba(0,0,0,0.45)"
    ].join(";");

    var badge = document.createElement("div");
    badge.textContent = "iOS " + major + "." + minor;
    badge.style.cssText = [
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "min-height:36px",
      "padding:0 14px",
      "border-radius:999px",
      "background:rgba(255,10,138,0.16)",
      "color:#ff7abf",
      "font-size:14px",
      "font-weight:800"
    ].join(";");

    var title = document.createElement("h1");
    title.id = "hm51-ios-warning-title";
    title.textContent = "Необходимо обновить iOS";
    title.style.cssText = "margin:20px 0 0;font-size:27px;line-height:1.15;font-weight:900";

    var text = document.createElement("p");
    text.textContent = "Для работы XM 5.1 требуется iOS 16.4 или новее. На старой версии страницы могут открываться, но кнопки и вход работать не будут.";
    text.style.cssText = "margin:16px 0 0;color:rgba(255,255,255,0.72);font-size:16px;line-height:1.55";

    var instruction = document.createElement("div");
    instruction.textContent = "Откройте: Настройки → Основные → Обновление ПО";
    instruction.style.cssText = [
      "margin-top:22px",
      "padding:16px",
      "border-radius:16px",
      "background:rgba(36,215,179,0.12)",
      "color:#24d7b3",
      "font-size:16px",
      "line-height:1.45",
      "font-weight:800"
    ].join(";");

    var note = document.createElement("p");
    note.textContent = "После обновления удалите старый ярлык XM 5.1 с экрана и добавьте веб-приложение заново через Safari.";
    note.style.cssText = "margin:18px 0 0;color:rgba(255,255,255,0.48);font-size:13px;line-height:1.45";

    card.appendChild(badge);
    card.appendChild(title);
    card.appendChild(text);
    card.appendChild(instruction);
    card.appendChild(note);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showUnsupportedIosWarning);
  } else {
    showUnsupportedIosWarning();
  }
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL("https://hm51-next.vercel.app"),
  title: {
    default: "XM 5.1 — Хоккейный менеджер",
    template: "%s | XM 5.1",
  },
  description: "Управление хоккейной командой: календарь, состав, посещаемость, чат, финансы и сервисы в одном приложении.",
  keywords: ["хоккейный менеджер", "управление хоккейной командой", "XM 5.1", "календарь тренировок", "состав команды"],
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://hm51-next.vercel.app",
    siteName: "XM 5.1",
    title: "XM 5.1 — вся жизнь хоккейной команды в одном приложении",
    description: "Календарь, состав, посещаемость, чат, финансы и сервисы для игроков, тренеров и администраторов.",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: { capable: true, title: "ХМ 5.1", statusBarStyle: "black-translucent" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#07110c",
  colorScheme: "dark"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <script dangerouslySetInnerHTML={{ __html: IOS_SUPPORT_WARNING_SCRIPT }} />
        <PwaStartRedirect />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function openPolicy(){if(window.location.hash==='#rec2400340101'){window.location.replace('/privacy-policy');}}openPolicy();window.addEventListener('hashchange',openPolicy);})();`,
          }}
        />
        <AppDataProvider>
          <GlobalTopicSync />
          <AuthTokenGuard>
            <NotificationBootstrap />
            <PlayerCoachProfileAction />
            <DeduplicateInstallText />
            {children}
          </AuthTokenGuard>
        </AppDataProvider>
      </body>
    </html>
  );
}
