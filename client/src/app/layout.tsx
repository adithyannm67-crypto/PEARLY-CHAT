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
  title: "Peerly — Conversations Without Boundaries",
  description:
    "A modern peer-to-peer messaging application. Connect, communicate, and collaborate with end-to-end encrypted messaging.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: 'resizes-content',
};

import { AuthProvider } from '@/context/AuthProvider';
import OfflineBanner from '@/components/OfflineBanner';
import { NotificationProvider } from '@/context/NotificationContext';
import NotificationCenter from '@/components/NotificationCenter';

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-bg-main text-text-primary font-sans no-pull-to-refresh">
        <NotificationProvider>
          <AuthProvider>{children}</AuthProvider>
          <OfflineBanner />
          <NotificationCenter />
        </NotificationProvider>
      </body>
    </html>
  );
}


