import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Big_Shoulders } from "next/font/google";
import "./globals.css";

const body = Atkinson_Hyperlegible_Next({ variable: "--font-body", subsets: ["latin"], adjustFontFallback: false, fallback: ["system-ui", "sans-serif"] });
const signage = Big_Shoulders({ variable: "--font-signage", subsets: ["latin"], weight: ["600", "800"], adjustFontFallback: false, fallback: ["Arial Narrow", "sans-serif"] });

export const metadata: Metadata = {
  title: { default: "Room Checker", template: "%s | Room Checker" },
  description: "Get every interview room ready before the recruiter walks in.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1411" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${signage.variable} h-full antialiased`}>
      {/* Extensions like Grammarly add attributes to body before React hydrates. */}
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
