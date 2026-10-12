import type { Metadata, Viewport } from "next";
import { Pwa } from "@/components/pwa";
import "./globals.css";
export const metadata: Metadata = {
  title: "Ħabib · Small steps. Bright minds.",
  description:
    "Parent-controlled mathematics learning in Maltese and English for Years 4–6.",
  icons: { icon: "/icon.svg" },
  appleWebApp: { capable: true, title: "Ħabib", statusBarStyle: "default" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#456e52",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Pwa />
        {children}
      </body>
    </html>
  );
}
