"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "lib/api";
import { useLanguage } from "lib/i18n";

const navLinks = [
  { href: "/dashboard", labelKey: "dashboard", short: "Home", icon: "📊" },
  { href: "/find-match", labelKey: "findMatch", short: "Match", icon: "🔍" },
  { href: "/teams", labelKey: "teams", short: "Teams", icon: "👥" },
  { href: "/events", labelKey: "events", short: "Events", icon: "🏆" },
  { href: "/profile/me", labelKey: "profile", short: "Profile", icon: "👤" },
];

export function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();

  useEffect(() => {
    const handleSessionExpired = () => router.push("/login?expired=1");
    window.addEventListener("fpt-esporthub:session-expired", handleSessionExpired);
    return () => window.removeEventListener("fpt-esporthub:session-expired", handleSessionExpired);
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
      <nav className="app-nav neon-app-nav">
        <a href="/dashboard" className="nav-brand neon-brand"><span className="brand-mark">🎮</span> FPT EsportHub</a>
        <div className="nav-links">
          {navLinks.map((link) => {
            const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <a key={link.href} href={link.href} className={`nav-link neon-nav-link ${active ? "active" : ""}`}>
                <span>{link.icon}</span> {t(link.labelKey as Parameters<typeof t>[0])}
              </a>
            );
          })}
          <button type="button" className="nav-link neon-nav-link" onClick={handleLogout}>{t("logout")}</button>
        </div>
      </nav>
      <nav className="mobile-tabbar">
        {navLinks.map((link) => (
          <a key={link.href} href={link.href} className={`mobile-tab ${pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href)) ? "active" : ""}`}>
            <span>{link.icon}</span>
            <small>{link.short}</small>
          </a>
        ))}
      </nav>
    </>
  );
}
