import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sayr — Walk Your Day with Purpose",
  description: "A productivity app based on Imam Al-Ghazali's six-step framework for managing time",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <div className="islamic-pattern" />
        {children}
      </body>
    </html>
  );
}
