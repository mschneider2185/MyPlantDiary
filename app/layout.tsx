import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "MyPlantDiary",
  description: "Identify plants, track care, and grow your collection.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
