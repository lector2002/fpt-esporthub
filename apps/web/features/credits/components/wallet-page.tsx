"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, CircleCheck, CircleX, Coins, Crown, FlaskConical, Loader2, Megaphone, Palette, Rocket } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { ListSkeleton, QueryState } from "@/components/common/query-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatVnd } from "@/features/coaching/format";
import { useCosmetics } from "@/features/cosmetics/api";
import { usePremium } from "@/features/guides/api";
import { cn } from "@/lib/utils";
import { useCreateTopUp, useTopUp, useWallet } from "../api";
import { useCreditsMessages } from "../messages";
import type { Wallet } from "../types";

export function WalletPage() {
  const { t } = useCreditsMessages();
  const wallet = useWallet();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} image="/images/hero-wallet.webp" />
      <TopUpReturn />
      <QueryState query={wallet} skeleton={<ListSkeleton rows={3} />}>
        {(data) => (
          <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-6">
              <BalanceCard wallet={data} />
              <TopUpCard wallet={data} />
            </div>
            <div className="flex flex-col gap-6">
              <SpendCard wallet={data} />
              <HistoryCard wallet={data} />
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}

function BalanceCard({ wallet }: { wallet: Wallet }) {
  const { t } = useCreditsMessages();
  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("balance")}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-3xl tabular-nums" data-testid="credit-balance">
          <Coins className="size-6 text-coin" aria-hidden />
          {wallet.balance}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{t("creditValue")}</p>
      </CardContent>
    </Card>
  );
}

const CUSTOM = "custom";

/** Pick one package or type an amount, then one pay button. The server prices the amount again. */
function TopUpCard({ wallet }: { wallet: Wallet }) {
  const { t } = useCreditsMessages();
  const create = useCreateTopUp();
  const [selected, setSelected] = useState(String(wallet.packages[0]?.credits ?? ""));
  const [typed, setTyped] = useState("");
  const { min, max, creditVnd } = wallet.customTopUp;
  const typedCredits = Number(typed);
  const typedValid = Number.isInteger(typedCredits) && typedCredits >= min && typedCredits <= max;
  const pack =
    selected === CUSTOM
      ? typedValid
        ? { credits: typedCredits, amountVnd: typedCredits * creditVnd }
        : undefined
      : wallet.packages.find((item) => String(item.credits) === selected);
  const pay = () =>
    pack &&
    create.mutate(pack.credits, {
      onSuccess: ({ topUp }) => {
        if (topUp.checkoutUrl) window.location.assign(topUp.checkoutUrl);
      },
      onError: (error) => toast.error(error.message),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("topUp")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {wallet.provider === "mock" && (
          <Alert>
            <FlaskConical />
            <AlertDescription>{t("mockProvider")}</AlertDescription>
          </Alert>
        )}
        {wallet.provider ? (
          <>
            <RadioGroup value={selected} onValueChange={setSelected} aria-label={t("topUp")} className="gap-2">
              {wallet.packages.map((item) => (
                <Label
                  key={item.credits}
                  htmlFor={`pack-${item.credits}`}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
                >
                  <RadioGroupItem value={String(item.credits)} id={`pack-${item.credits}`} />
                  <span className="flex-1 font-semibold tabular-nums">{t("credits", { count: item.credits })}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">{formatVnd(item.amountVnd)}</span>
                </Label>
              ))}
              <Label
                htmlFor="pack-custom"
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
              >
                <RadioGroupItem value={CUSTOM} id="pack-custom" />
                <span className="flex-1 font-semibold">{t("customAmount")}</span>
              </Label>
            </RadioGroup>
            {selected === CUSTOM && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="topup-custom">{t("customLabel")}</Label>
                <Input
                  id="topup-custom"
                  type="number"
                  inputMode="numeric"
                  min={min}
                  max={max}
                  step={1}
                  autoFocus
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  aria-invalid={typed !== "" && !typedValid}
                  aria-describedby="topup-custom-range"
                  className="tabular-nums"
                />
                <p id="topup-custom-range" className={cn("text-xs text-muted-foreground", typed !== "" && !typedValid && "text-destructive")}>
                  {t("customRange", { min, max })}
                </p>
              </div>
            )}
            <Button disabled={!pack || create.isPending} onClick={pay}>
              {create.isPending && <Spinner />}
              {pack ? t("payAmount", { amount: formatVnd(pack.amountVnd) }) : t("topUp")}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("topUpOff")}</p>
        )}
      </CardContent>
    </Card>
  );
}

/** What credits buy, with the live prices and a link to each place you spend them. */
function SpendCard({ wallet }: { wallet: Wallet }) {
  const { t } = useCreditsMessages();
  const premium = usePremium().data?.price;
  const catalog = useCosmetics().data?.catalog;
  const cheapestCosmetic = catalog?.length ? Math.min(...catalog.map((item) => item.credits)) : undefined;
  const rows = [
    { icon: Crown, label: t("useGuides"), price: premium && t("credits", { count: premium.credits }), href: "/guides" },
    { icon: Rocket, label: t("useBoost", { hours: wallet.promotions.boost.hours }), price: t("credits", { count: wallet.promotions.boost.credits }), href: "/dashboard" },
    { icon: Megaphone, label: t("useFeature", { hours: wallet.promotions.feature.hours }), price: t("credits", { count: wallet.promotions.feature.credits }), href: "/teams" },
    { icon: Palette, label: t("useCosmetics"), price: cheapestCosmetic !== undefined && t("fromCredits", { count: cheapestCosmetic }), href: "/shop" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("usesTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border" data-testid="credit-uses">
          {rows.map((row) => (
            <li key={row.href}>
              <Link href={row.href} className="flex items-center gap-3 px-6 py-3 text-sm transition-colors hover:bg-accent">
                <row.icon className="size-4 text-muted-foreground" aria-hidden />
                <span className="flex-1">{row.label}</span>
                {row.price && <span className="font-medium tabular-nums text-coin">{row.price}</span>}
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function HistoryCard({ wallet }: { wallet: Wallet }) {
  const { t, language } = useCreditsMessages();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("history")}</CardTitle>
      </CardHeader>
      <CardContent>
        {wallet.transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-border sm:hidden">
              {wallet.transactions.map((tx) => (
                <li key={tx.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{t(`kind_${tx.kind}`)}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt, language)}</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className={cn("text-sm font-medium", tx.amount > 0 && "text-success")}>{tx.amount > 0 ? `+${tx.amount}` : tx.amount}</p>
                    <p className="text-xs text-muted-foreground">{t("afterShort", { count: tx.balanceAfter })}</p>
                  </div>
                </li>
              ))}
            </ul>
            <HistoryTable wallet={wallet} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** From `sm:`; phones get the list above. */
function HistoryTable({ wallet }: { wallet: Wallet }) {
  const { t, language } = useCreditsMessages();
  return (
    <Table className="hidden sm:table">
      <TableHeader>
        <TableRow>
          <TableHead>{t("date")}</TableHead>
          <TableHead>{t("detail")}</TableHead>
          <TableHead className="text-right">{t("change")}</TableHead>
          <TableHead className="text-right">{t("after")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {wallet.transactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(tx.createdAt, language)}</TableCell>
            <TableCell>{t(`kind_${tx.kind}`)}</TableCell>
            <TableCell className={cn("text-right font-medium tabular-nums", tx.amount > 0 ? "text-success" : "text-foreground")}>
              {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
            </TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">{tx.balanceAfter}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Back from checkout with `?topup=<orderCode>`: show the outcome, then drop the param. */
function TopUpReturn() {
  const { t } = useCreditsMessages();
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("topup");
  const orderCode = raw && /^\d+$/.test(raw) ? Number(raw) : null;
  const topUp = useTopUp(orderCode);
  const status = topUp.data?.status;
  const credits = topUp.data?.credits;

  useEffect(() => {
    if (!status || status === "PENDING") return;
    // The id keeps a re-run from toasting twice.
    if (status === "PAID") toast.success(t("topUpPaid", { count: credits ?? 0 }), { id: `topup-${orderCode}` });
    else toast(t("topUpCancelled"), { id: `topup-${orderCode}` });
    router.replace("/wallet", { scroll: false });
  }, [status, credits, orderCode, router, t]);

  if (!orderCode || !status) return null;
  const Icon = status === "PENDING" ? Loader2 : status === "PAID" ? CircleCheck : CircleX;
  return (
    <Alert role="status">
      <Icon className={cn(status === "PENDING" && "animate-spin")} />
      <AlertDescription>
        {status === "PENDING" ? t("topUpPending") : status === "PAID" ? t("topUpPaid", { count: topUp.data!.credits }) : t("topUpCancelled")}
      </AlertDescription>
    </Alert>
  );
}
