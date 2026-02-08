import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FIT-INN Nutrition | Dein persönlicher Ernährungsplan",
  description: "Personalisierte Ernährungspläne für FIT-INN Mitglieder. Abnehmen, Muskelaufbau oder Gewicht halten - wir erstellen deinen individuellen Plan.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="font-sans antialiased bg-white text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
