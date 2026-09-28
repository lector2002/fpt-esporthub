"use client";

import Link from "next/link";
import { Coins } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWallet } from "../api";
import { useCreditsMessages } from "../messages";

/** Gold outline for credit links: wallet balance, "top up" when short. */
export const COIN_OUTLINE = "border-coin/50 bg-coin/10 text-coin hover:bg-coin/20 hover:text-coin";
/** Tint for a card or panel whose main action spends credits. */
export const SPEND_SURFACE = "border-coin/30 bg-coin/5";

export interface SpendButtonProps {
  /** Credits this costs; undefined while the price loads. */
  price: number | undefined;
  label: string;
  icon?: LucideIcon;
  confirmTitle: string;
  onConfirm: () => void;
  pending?: boolean;
  disabled?: boolean;
  size?: "default" | "sm";
  className?: string;
}

/** Every credit spend goes through here: gold button with the price, a confirm with the balance after, and a top-up link when short. */
export function SpendButton({ price, label, icon: Icon = Coins, confirmTitle, onConfirm, pending, disabled, size = "default", className }: SpendButtonProps) {
  const { t } = useCreditsMessages();
  const wallet = useWallet().data;

  if (wallet && price !== undefined && wallet.balance < price) {
    return (
      <Button asChild variant="outline" size={size} className={cn(COIN_OUTLINE, "font-semibold", className)}>
        <Link href="/wallet">
          <Coins /> {t("spendShort", { price })}
        </Link>
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size={size}
          className={cn("bg-coin font-semibold text-coin-foreground shadow-sm shadow-coin/20 hover:bg-coin/90", className)}
          disabled={pending || disabled || !wallet || price === undefined}
        >
          <Icon /> {label}{" "}
          {price !== undefined && (
            <span className="rounded-md bg-coin-foreground/10 px-1.5 py-0.5 text-xs tabular-nums">
              <span className="sr-only">· </span>
              {t("credits", { count: price })}
            </span>
          )}
        </Button>
      </AlertDialogTrigger>
      {wallet && price !== undefined && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t("spendBody", { price, after: wallet.balance - price })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>{t("spendConfirm", { price })}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
