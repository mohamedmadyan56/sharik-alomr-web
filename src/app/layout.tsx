import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProviders } from "./providers";

const siteUrl = (
  process.env.SITE_URL ?? "https://sharik-alomr.com"
).replace(/\/$/, "");

const siteDescription =
  "منصة زواج مصرية للتعارف الجاد، بترشيحات مدروسة وخصوصية حقيقية وخطوات تحترم القيم.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "شريك العمر | زواج جاد بخطوات محترمة",
    template: "%s | شريك العمر",
  },
  description: siteDescription,
  applicationName: "شريك العمر",
  keywords: [
    "شريك العمر",
    "زواج",
    "تعارف جاد",
    "خطوبة",
    "زواج مصر",
    "منصة زواج",
    "Sharik Alomr",
  ],
  authors: [{ name: "شريك العمر" }],
  creator: "شريك العمر",
  publisher: "شريك العمر",
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    locale: "ar_EG",
    alternateLocale: ["en_US"],
    siteName: "شريك العمر",
    title: "شريك العمر | زواج جاد بخطوات محترمة",
    description: siteDescription,
  },
  twitter: {
    card: "summary",
    title: "شريك العمر | زواج جاد بخطوات محترمة",
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#401438" },
    { media: "(prefers-color-scheme: dark)", color: "#120e12" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
