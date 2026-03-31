import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthBootstrap from "../components/AuthBootstrap";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BMetrics",
  description:
    "BMetrics is a dynamic and intuitive software application designed to track and analyze behavior data, specifically in the context of Applied Behavior Analysis (ABA)...",
  icons: {
    icon: "/BMetrics-logo-removebg.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthBootstrap />
        {children}
      </body>
    </html>
  );
}
