import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "lgOS-getSlopped — LG webOS Sidebar Launcher, Seasonal Ambience & Privacy Suite",
  description:
    "Plug-and-play SlopBro edition for LG webOS TVs (OLED65G3PUA / webOS 25 10.3.0) with a seamless sidebar app dock, seasonal Fall & Pumpkin turn-on backdrop, and ad/ACR sinkhole.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
