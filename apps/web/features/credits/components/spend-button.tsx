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
import { useWallet } from "../api";
import { useCreditsMessages } from "../messages";

export interface SpendButtonProps {
  /** Credits this costs; undefined while the price loads. */
  price: number | undefined;
  label: string;
  icon?: LucideIcon;
  confirmTitle: string;
  onConfirm: () => void;
  pending?: boolean;
  disabled?: boolean;
  variant?: "default" | "outline";
  size?: "default" | "sm";
  className?: string;
}

/** Every credit spend goes through here: price on the button, a confirm with the balance after, and a top-up link when short. */
export function SpendButton({ price, label, icon: Icon, confirmTitle, onConfirm, pending, disabled, variant = "default", size = "default", className }: SpendButtonProps) {
  const { t } = useCreditsMessages();
  const wallet = useWallet().data;

  if (wallet && price !== undefined && wallet.balance < price) {
    return (
      <Button asChild variant="outline" size={size} className={className}>
        <Link href="/wallet">
          <Coins className="text-coin" /> {t("spendShort", { price })}
        </Link>
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className={className} disabled={pending || disabled || !wallet || price === undefined}>
          {Icon && <Icon />} {label}{" "}
          {price !== undefined && <span className="tabular-nums opacity-70">· {t("credits", { count: price })}</span>}
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
