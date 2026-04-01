import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PwaRegister from "./pwa-register";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gemeindefeuerwehr Felm",
  description: "Rückmeldungen zu Diensten und Terminen der Gemeindefeuerwehr Felm.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gemeindefeuerwehr Felm",
  },
};

export const viewport: Viewport = {
  themeColor: "#081120",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
