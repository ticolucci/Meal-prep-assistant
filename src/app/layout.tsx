import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meal Prep Assistant",
  description: "Plan your weekly meals, prep smarter, shop faster.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} bg-zinc-50 font-sans antialiased dark:bg-zinc-950`}
      >
        <main className="min-h-screen pb-16">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
