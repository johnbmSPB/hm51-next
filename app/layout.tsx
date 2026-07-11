import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hm5-1.ru"),
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
    url: "https://hm5-1.ru",
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
  themeColor: "#07110c"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
