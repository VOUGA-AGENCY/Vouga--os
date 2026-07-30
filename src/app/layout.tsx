import type { Metadata } from "next";
import Script from "next/script";

import { themeInitScript } from "@/foundation/appearance/theme-init-script";

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
    <html data-theme="light" data-theme-preference="light" lang="pt-PT" suppressHydrationWarning>
      <body>
        <Script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
          id="vouga-theme-init"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
