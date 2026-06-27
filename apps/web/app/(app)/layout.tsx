import { AppNav } from "./app-nav";
import { FloatingHub } from "./floating-hub";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <AppNav />
      <main className="app-main">{children}</main>
      <FloatingHub />
    </div>
  );
}
