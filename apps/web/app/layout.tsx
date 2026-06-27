import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "FPT EsportHub",
  description: "Smart Team Finding for student gamers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
