
import type { Metadata } from "next";
import "./globals.css";

import AuthProvider from "@/components/auth/AuthProvider";
import LanguageProvider from "@/components/providers/LanguageProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import RTLToaster from "@/components/providers/RTLToaster";

export const metadata: Metadata = {
  title: "ALRRAKB Mailer",
  description: "Professional Email Marketing System",
  icons: {
    icon: [
      { url: '/favicon.png', href: '/favicon.png' },
    ],
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <LanguageProvider>
            <AuthProvider>
              {children}
              <RTLToaster />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
