import React from 'react';
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
  title: "BMetrics OPC",
  description:
    "BMetrics OPC is a OPC Behavior Consulting dynamic and intuitive software application designed to track and analyze behavior data, specifically in the context of Applied Behavior Analysis (ABA). Aimed at behavior analysts, educators, and clinicians, BMetrics helps users efficiently monitor various behavioral metrics, such as frequency, duration, and rate, to assess intervention efficacy and track behavioral trends over time. The platform allows users to visualize their data through interactive graphs, with customizable date ranges and measurement types. With a focus on user-friendliness and flexibility, BMetrics offers tools for data aggregation, reporting, and handling missing data, making it an essential tool for professionals in the field of behavior analysis.",
  keywords: ["OPC Behavior Consulting LLC", "OPC Behavior Consulting BMetrics", "OPC BMetrics", "OPC Metrics", "OPC Behavior Consulting", "OPC Behavior Metrics", "OPC BMetrics", "OPC Metrics", "behavior analysis", "applied behavior analysis", "ABA", "behavior monitoring", "behavior tracking", "behavior data", "behavior analysis software", "behavior analysis tools", "behavior analysis reports", "behavior analysis graphs", "behavior analysis charts", "behavior analysis data visualization", "behavior analysis data reporting", "behavior analysis data handling", "behavior analysis data missing data", "behavior analysis data aggregation", "behavior analysis data reporting", "behavior analysis data handling", "behavior analysis data missing data", "behavior analysis data aggregation"],
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
