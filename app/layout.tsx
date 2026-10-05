import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { InstallServiceWorker } from "@/components/InstallServiceWorker";

export const metadata: Metadata = {
  title: "Kannada Buddy",
  description: "A personal Bengaluru Kannada survival coach.",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon.svg" },
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
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <InstallServiceWorker />
        <div className="app-shell">
          <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
