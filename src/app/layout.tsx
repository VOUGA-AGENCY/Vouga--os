import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vouga OS", template: "%s · Vouga OS" },
  description: "Sistema operativo interno da Vouga.",
  icons: {
    icon: "/1.png",
    apple: "/1.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-theme="light" lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
