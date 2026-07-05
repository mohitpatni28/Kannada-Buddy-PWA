import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { InstallServiceWorker } from "@/components/InstallServiceWorker";

export const metadata: Metadata = {
  title: "Kannada Buddy",
  description: "A personal Bengaluru Kannada survival coach.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kannada Buddy"
  }
};

export const viewport: Viewport = {
  themeColor: "#183a37",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <InstallServiceWorker />
        <div className="app-shell">
          <main className="main-content">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
