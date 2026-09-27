"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Crosshair, Gauge, MessagesSquare, Search, Target, UserPlus, Users } from "lucide-react";
import { BrandMark } from "@/features/auth/components/brand-panel";
import { Button } from "@/components/ui/button";
import { GAMES } from "@/lib/contracts";
import { useSession } from "@/lib/session";
import { useLandingMessages } from "../messages";

type LandingT = ReturnType<typeof useLandingMessages>["t"];

export function LandingPage() {
  const { t } = useLandingMessages();
  const { status } = useSession();
  const authenticated = status === "authenticated";

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <BrandMark name="FPT EsportHub" />
          <nav className="flex items-center gap-2">
            {authenticated ? (
              <Button size="sm" asChild>
                <Link href="/dashboard">{t("openApp")}</Link>
              </Button>
            ) : (
              <>
                {/* Below sm the hero already shows the login button; hiding this keeps the brand on one line. */}
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link href="/login">{t("login")}</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">{t("register")}</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-14 px-4 py-12 lg:py-16">
        <Hero t={t} authenticated={authenticated} />
        <HowItWorks t={t} />
        <SupportedGames t={t} />
      </main>

      <footer className="border-t border-border">
        <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-muted-foreground">{t("notAffiliated")}</p>
      </footer>
    </div>
  );
}

function Hero({ t, authenticated }: { t: LandingT; authenticated: boolean }) {
  const criteria = [
    { icon: Gauge, text: t("criteriaRank") },
    { icon: Crosshair, text: t("criteriaRole") },
    { icon: CalendarClock, text: t("criteriaSchedule") },
    { icon: Target, text: t("criteriaStyle") },
  ];

  return (
    <section className="relative isolate grid items-center gap-8 overflow-hidden rounded-2xl p-6 ring-1 ring-foreground/10 sm:p-10 lg:min-h-[28rem] lg:grid-cols-[1.4fr_1fr]">
      <img src="/images/landing-hero.webp" alt="" className="absolute inset-0 -z-10 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/85 to-background/40 lg:bg-gradient-to-r lg:via-background/70 lg:to-background/10" aria-hidden />
      <div className="flex flex-col gap-5">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t("heroTitle")}</h1>
        <p className="max-w-xl text-muted-foreground">{t("heroSubtitle")}</p>
        <div className="on-picture flex flex-wrap gap-3">
          {authenticated ? (
            <Button size="lg" asChild>
              <Link href="/dashboard">
                {t("openApp")} <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button size="lg" asChild>
                <Link href="/register">
                  {t("register")} <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">{t("login")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card/85 p-5 backdrop-blur">
        <p className="mb-4 text-sm font-medium">{t("criteriaTitle")}</p>
        <ul className="flex flex-col gap-3">
          {criteria.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HowItWorks({ t }: { t: LandingT }) {
  const steps = [
    { icon: UserPlus, image: "/images/step-profile.webp", title: t("stepProfileTitle"), text: t("stepProfileText") },
    { icon: Search, image: "/images/step-match.webp", title: t("stepMatchTitle"), text: t("stepMatchText") },
    { icon: MessagesSquare, image: "/images/step-chat.webp", title: t("stepChatTitle"), text: t("stepChatText") },
  ];

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{t("howTitle")}</h2>
      <ol className="grid gap-3 sm:grid-cols-3">
        {steps.map(({ icon: Icon, image, title, text }) => (
          <li key={title} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
            <img src={image} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" onError={(event) => { event.currentTarget.hidden = true; }} />
            <div className="flex flex-col gap-2 p-4">
              <Icon className="size-5 text-primary" aria-hidden />
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SupportedGames({ t }: { t: LandingT }) {
  const games = [
    { label: GAMES.valorant.label, roles: t("valorantRoles"), tone: "text-valorant", image: "/images/event-valorant.webp" },
    { label: GAMES.league_of_legends.label, roles: t("lolRoles"), tone: "text-lol", image: "/images/event-league_of_legends.webp" },
  ];

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{t("gamesTitle")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {games.map((game) => (
          <div key={game.label} className="relative isolate flex min-h-40 items-end gap-3 overflow-hidden rounded-xl border border-border bg-card p-4">
            <img src={game.image} alt="" loading="lazy" className="absolute inset-0 -z-10 size-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-card via-card/70 to-transparent" aria-hidden />
            <Users className={`size-5 shrink-0 ${game.tone}`} aria-hidden />
            <div className="flex flex-col">
              <span className={`font-medium ${game.tone}`}>{game.label}</span>
              <span className="text-sm text-muted-foreground">{game.roles}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
