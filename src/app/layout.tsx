import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "FIT-INN Nutrition | Dein persönlicher Ernährungsplan",
  description: "Personalisierte Ernährungspläne für FIT-INN Mitglieder. Abnehmen, Muskelaufbau oder Gewicht halten - wir erstellen deinen individuellen Plan.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo.png", sizes: "192x192", type: "image/png" },
      { url: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
  openGraph: {
    title: "FIT-INN Nutrition | Dein persönlicher Ernährungsplan",
    description: "Personalisierte Ernährungspläne für FIT-INN Mitglieder",
    siteName: "FIT-INN Nutrition",
    type: "website",
    locale: "de_DE",
  },
  keywords: ["Ernährungsplan", "FIT-INN", "Fitness", "Abnehmen", "Muskelaufbau", "Kalorien", "Rezepte", "Trier"],
  authors: [{ name: "FIT-INN Trier" }],
  creator: "FIT-INN Trier",
  publisher: "FIT-INN Trier",
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FIT-INN Nutrition" />
      </head>
      <body className="font-sans antialiased bg-white text-gray-900 min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
