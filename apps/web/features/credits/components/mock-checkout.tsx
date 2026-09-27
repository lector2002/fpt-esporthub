"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ListSkeleton } from "@/components/common/query-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatVnd } from "@/features/coaching/format";
import { useMockCheckout, useTopUp } from "../api";
import { useCreditsMessages } from "../messages";

/** Dev stand-in for the payOS checkout page. The API refuses these calls unless it runs the mock provider. */
export function MockCheckout() {
  const { t } = useCreditsMessages();
  const router = useRouter();
  const raw = useSearchParams().get("order");
  const orderCode = raw && /^\d+$/.test(raw) ? Number(raw) : null;
  const topUp = useTopUp(orderCode);
  const checkout = useMockCheckout();

  if (topUp.isPending && orderCode) return <ListSkeleton rows={2} />;
  if (!orderCode || !topUp.data) {
    return (
      <EmptyState
        icon={FlaskConical}
        title={t("notFound")}
        action={
          <Button asChild variant="outline">
            <Link href="/wallet">{t("backToWallet")}</Link>
          </Button>
        }
      />
    );
  }

  const finish = (action: "pay" | "cancel") =>
    checkout.mutate(
      { orderCode, action },
      { onSuccess: () => router.push(`/wallet?topup=${orderCode}`), onError: (error) => toast.error(error.message) },
    );

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="size-5 text-primary" aria-hidden />
          {t("checkoutTitle")}
        </CardTitle>
        <CardDescription>{t("checkoutHint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{t("order", { code: topUp.data.orderCode })}</p>
        <p className="text-2xl font-semibold tabular-nums">{formatVnd(topUp.data.amountVnd)}</p>
        <p className="text-sm">{t("credits", { count: topUp.data.credits })}</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" disabled={checkout.isPending} onClick={() => finish("cancel")}>
          {t("cancel")}
        </Button>
        <Button className="flex-1" disabled={checkout.isPending || topUp.data.status !== "PENDING"} onClick={() => finish("pay")}>
          {t("pay")}
        </Button>
      </CardFooter>
    </Card>
  );
}
