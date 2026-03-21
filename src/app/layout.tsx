import type { Metadata } from "next";
import "./globals.css";

export const maxDuration = 60; // Maximize Vercel timeout for Server Actions

export const metadata: Metadata = {
  title: "Citation Checker",
  description: "South African legal citation verification tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
