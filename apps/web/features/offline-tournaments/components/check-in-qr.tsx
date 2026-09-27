"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CircleCheck, QrCode } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOfflineMessages } from "../messages";

/** The QR opens the host's check-in page with the code, so any phone camera can scan it. */
export function CheckInQr({ code, checkedIn }: { code: string; checkedIn: boolean }) {
  const { t } = useOfflineMessages();
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/host/check-in?code=${encodeURIComponent(code)}`;
    let active = true;
    void QRCode.toDataURL(url, { width: 240, margin: 1 }).then((data) => active && setImage(data));
    return () => {
      active = false;
    };
  }, [code]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="size-4" aria-hidden /> {t("myQrTitle")}
        </CardTitle>
        <CardDescription>{t("myQrHint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        {checkedIn ? (
          <p className="flex items-center gap-2 py-6 font-medium text-emerald-400">
            <CircleCheck className="size-5" aria-hidden /> {t("checkedIn")}
          </p>
        ) : image ? (
          <img src={image} alt={t("myQrTitle")} width={240} height={240} className="rounded-md bg-white p-2" />
        ) : (
          <Skeleton className="size-60" />
        )}
        {!checkedIn && <code className="select-all text-xs text-muted-foreground">{code}</code>}
      </CardContent>
    </Card>
  );
}
