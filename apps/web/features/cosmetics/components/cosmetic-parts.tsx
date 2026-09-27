"use client";

import { Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { BANNER_LOOK, FRAME_LOOK, NAME_COLOR_LOOK } from "../looks";
import { type CosmeticsMessageKey, useCosmeticsMessages } from "../messages";

/** Gradient ring around an avatar; renders the avatar alone without a frame. */
export function CosmeticFrame({ frame, children, className }: { frame: string | null | undefined; children: React.ReactNode; className?: string }) {
  const look = frame ? FRAME_LOOK[frame] : undefined;
  if (!look) return <>{children}</>;
  return (
    <div className={cn("shrink-0 rounded-full p-[3px]", look, className)} data-frame={frame}>
      <div className="rounded-full bg-background p-[2px]">{children}</div>
    </div>
  );
}

export function CosmeticBanner({ banner, className }: { banner: string | null | undefined; className?: string }) {
  const look = banner ? BANNER_LOOK[banner] : undefined;
  if (!look) return null;
  return <div className={cn("h-24 w-full", look, className)} data-banner={banner} aria-hidden />;
}

export function nameColorClass(nameColor: string | null | undefined) {
  return nameColor ? NAME_COLOR_LOOK[nameColor] : undefined;
}

export function CosmeticTitle({ title, className }: { title: string | null | undefined; className?: string }) {
  const { t } = useCosmeticsMessages();
  if (!title) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-primary", className)} data-title={title}>
      <Award className="size-3.5" aria-hidden />
      {t(title as CosmeticsMessageKey)}
    </span>
  );
}
