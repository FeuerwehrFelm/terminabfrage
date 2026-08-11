import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "./pwa-register";

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
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
