"use client";

import Link from "next/link";
import { CalendarClock, MessagesSquare, Users } from "lucide-react";
import { BrandMark as Logo } from "@/components/shell/brand-mark";
import { useAuthMessages } from "../messages";

export function BrandMark({ name }: { name: string }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <Logo />
      {name}
    </Link>
  );
}

/** Left column on large screens: brand, value points, disclaimer. */
export function BrandPanel() {
  const { t } = useAuthMessages();
  const points = [
    { icon: Users, text: t("brandPointMatch") },
    { icon: CalendarClock, text: t("brandPointSchedule") },
    { icon: MessagesSquare, text: t("brandPointChat") },
  ];

  return (
    <aside className="relative isolate hidden flex-col justify-between overflow-hidden border-r border-border bg-card p-10 lg:flex">
      <img src="/images/auth.webp" alt="" className="absolute inset-0 -z-10 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-card via-card/70 to-card/30" aria-hidden />
      <BrandMark name={t("brandName")} />
      <div className="flex max-w-md flex-col gap-6">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">{t("brandHeadline")}</h1>
        <ul className="flex flex-col gap-3">
          {points.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-muted-foreground">
              <Icon className="size-4 text-primary" aria-hidden />
              {text}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">{t("notAffiliated")}</p>
    </aside>
  );
}

/** Brand + disclaimer shown around the form below the lg breakpoint. */
export function MobileBrand() {
  const { t } = useAuthMessages();
  return (
    <div className="lg:hidden">
      <BrandMark name={t("brandName")} />
    </div>
  );
}

export function MobileFootnote() {
  const { t } = useAuthMessages();
  return <p className="text-xs text-muted-foreground lg:hidden">{t("notAffiliated")}</p>;
}
