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
  title: "lgOS-wolfdenOS — wolfdenOS Glass Dock Launcher & wolf OS Core Patcher",
  description:
    "Plug-and-play wolfdenOS & wolf OS suite for LG webOS TVs (OLED65G3PUA / webOS 25 10.3.0) with a purplish horizontal glass dock, debloated wolf OS core home, and ad/ACR sinkhole.",
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
