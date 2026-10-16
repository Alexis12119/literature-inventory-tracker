import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import SessionShell from "@/src/components/layout/SessionShell";
import { ShellSkeleton } from "@/src/components/layout/ShellSkeleton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Literature Inventory — Monthly Movement of Literature",
  description:
    "Shared literature inventory workspace: monthly entry, movement calculation, and six-month reports.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={<ShellSkeleton />}>
          <SessionShell>{children}</SessionShell>
        </Suspense>
      </body>
    </html>
  );
}
