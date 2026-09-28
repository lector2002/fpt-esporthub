"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "@/features/auth/components/brand-panel";
import { useShellMessages } from "@/features/shell/messages";
import { useLanguage, type Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useLandingMessages } from "../messages";

const FACEBOOK_URL = "https://www.facebook.com/fptesporthub";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
];

type FooterLink = { href: string; label: string; external?: boolean };

/** Site footer in the usual shape: brand + socials, link columns, then copyright and language. */
export function LandingFooter() {
  const { t } = useLandingMessages();
  const { t: nav } = useShellMessages();

  const columns: { title: string; links: FooterLink[] }[] = [
    {
      title: t("footerProduct"),
      links: [
        { href: "/find-match", label: nav("findMatch") },
        { href: "/teams", label: nav("teams") },
        { href: "/events", label: nav("events") },
        { href: "/guides", label: nav("guides") },
      ],
    },
    {
      title: t("footerCommunity"),
      links: [
        { href: "/communities", label: nav("communities") },
        { href: "/events?type=offline", label: t("footerCafeCups") },
        { href: "/shop", label: nav("shop") },
        { href: FACEBOOK_URL, label: t("footerFanpage"), external: true },
      ],
    },
    {
      title: t("footerPartners"),
      links: [
        { href: "/coaches", label: nav("coaching") },
        { href: "/coaches/me", label: t("footerBecomeCoach") },
        { href: "/host", label: t("footerHostCup") },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-12 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-4">
          <BrandMark name="FPT EsportHub" />
          <p className="max-w-xs text-sm text-muted-foreground">{t("footerTagline")}</p>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("footerFacebook")}
            className="flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
          >
            <FacebookIcon className="size-4" />
          </a>
        </div>
        <nav aria-label={t("footerNav")} className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <p className="text-sm font-medium">{column.title}</p>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <FooterAnchor {...link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} FPT EsportHub · {t("notAffiliated")}
          </p>
          <LanguageToggle />
        </div>
      </div>
    </footer>
  );
}

const LINK_CLASS = "inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground";

function FooterAnchor({ href, label, external }: FooterLink) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
        {label}
        <ArrowUpRight className="size-3.5" aria-hidden />
      </a>
    );
  }
  return (
    <Link href={href} className={LINK_CLASS}>
      {label}
    </Link>
  );
}

function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Language">
      {LANGUAGES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          lang={value}
          aria-pressed={language === value}
          onClick={() => setLanguage(value)}
          className={cn(
            "rounded-md px-2 py-1 transition-colors hover:text-foreground",
            language === value && "bg-muted font-medium text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Lucide dropped brand icons, so the Facebook "f" is drawn here. */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M13.5 21v-7.5h2.53l.38-2.94H13.5V8.68c0-.85.24-1.43 1.45-1.43h1.55V4.62a20.6 20.6 0 0 0-2.26-.12c-2.24 0-3.77 1.37-3.77 3.88v2.18H7.94v2.94h2.53V21h3.03Z" />
    </svg>
  );
}
