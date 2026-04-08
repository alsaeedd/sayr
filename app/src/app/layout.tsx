import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sayr",
  description: "Walk your day with purpose — Al-Ghazali's six-step framework",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col relative">
        <div className="islamic-pattern" />
        <div className="relative z-10 flex flex-col flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
