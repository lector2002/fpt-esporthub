"use client";

import { useEffect, useState } from "react";
import { ChevronsUpDown, Coins, Scale, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, QueryState } from "@/components/common/query-state";
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
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminUsers } from "@/features/admin/api";
import { Pagination } from "@/features/admin/components/pagination";
import { STACK_ON_PHONE } from "@/features/admin/format";
import { formatDateTime } from "@/features/coaching/format";
import { cn } from "@/lib/utils";
import { useAdjustCredits, useAdminCredits, useCoachingPayments, useRecordPayout, useResolveDispute } from "../api";
import { useAdminCreditsMessages } from "../admin-messages";
import { useCreditsMessages } from "../messages";
import type { AdminCreditTransaction, CoachingPayments } from "../types";

type Target = { id: string; displayName: string; email: string };

const LEDGER_PAGE_SIZE = 20;

/** The picked user drives both the adjust form and the ledger filter. */
export function AdminCreditsTab() {
  const [target, setTarget] = useState<Target | null>(null);
  return (
    <div className="flex flex-col gap-6">
      <CoachingPaymentsCard />
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <AdjustCard target={target} onTarget={setTarget} />
        <LedgerCard target={target} onTarget={setTarget} />
      </div>
    </div>
  );
}

function LedgerCard({ target, onTarget }: { target: Target | null; onTarget: (user: Target | null) => void }) {
  const { t } = useAdminCreditsMessages();
  const ledger = useAdminCredits(target?.id ?? "");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("ledger")}</CardTitle>
        {target && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={() => onTarget(null)} aria-label={t("clearFilter")}>
              {target.displayName} <X />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <QueryState query={ledger}>
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState icon={Coins} title={t("noLedger")} />
            ) : (
              <LedgerRows key={target?.id ?? "all"} rows={rows} onTarget={onTarget} />
            )
          }
        </QueryState>
      </CardContent>
    </Card>
  );
}

function LedgerRows({ rows, onTarget }: { rows: AdminCreditTransaction[]; onTarget: (user: Target) => void }) {
  const { t } = useAdminCreditsMessages();
  const kinds = useCreditsMessages().t;
  const { language } = useCreditsMessages();
  const [page, setPage] = useState(1);
  const shown = rows.slice((page - 1) * LEDGER_PAGE_SIZE, page * LEDGER_PAGE_SIZE);
  return (
    <>
      <Table className={STACK_ON_PHONE}>
        <TableHeader>
          <TableRow>
            <TableHead>{t("when")}</TableHead>
            <TableHead>{t("user")}</TableHead>
            <TableHead>{t("kind")}</TableHead>
            <TableHead className="text-right">{t("amount")}</TableHead>
            <TableHead className="text-right">{t("after")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.createdAt, language)}</TableCell>
              <TableCell>
                <button type="button" className="text-left hover:text-primary" onClick={() => onTarget(row.user)}>
                  {row.user.displayName}
                </button>
              </TableCell>
              <TableCell title={row.note ?? undefined}>{kinds(`kind_${row.kind}`)}</TableCell>
              <TableCell className={cn("text-right tabular-nums", row.amount > 0 && "text-success")}>{row.amount > 0 ? `+${row.amount}` : row.amount}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">{row.balanceAfter}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} total={rows.length} pageSize={LEDGER_PAGE_SIZE} onPageChange={setPage} />
    </>
  );
}

/** Search admin users by name or email; replaces typing a raw user id. */
function UserPicker({ id, value, onChange }: { id: string; value: Target | null; onChange: (user: Target) => void }) {
  const { t } = useAdminCreditsMessages();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(q.trim()), 250);
    return () => clearTimeout(timer);
  }, [q]);
  const users = useAdminUsers({ q: search, page: 1 });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          <span className={cn("truncate", !value && "text-muted-foreground")}>{value?.displayName ?? t("pickUser")}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0">
        <Command shouldFilter={false}>
          <CommandInput value={q} onValueChange={setQ} placeholder={t("searchUser")} />
          <CommandList>
            {users.data && <CommandEmpty>{t("noUserFound")}</CommandEmpty>}
            <CommandGroup>
              {users.data?.items.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={() => {
                    onChange({ id: user.id, displayName: user.displayName, email: user.email });
                    setOpen(false);
                  }}
                >
                  <div className="min-w-0">
                    <p className="truncate">{user.displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function AdjustCard({ target, onTarget }: { target: Target | null; onTarget: (user: Target) => void }) {
  const { t } = useAdminCreditsMessages();
  const adjust = useAdjustCredits();
  const [form, setForm] = useState({ amount: "", note: "" });
  const [confirming, setConfirming] = useState(false);
  const amount = Number(form.amount);
  const note = form.note.trim();
  const valid = target && Number.isInteger(amount) && amount !== 0 && note.length >= 3;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (valid) setConfirming(true);
  };

  const run = () => {
    if (!target) return;
    adjust.mutate(
      { userId: target.id, amount, note },
      {
        onSuccess: () => {
          toast.success(t("adjusted"));
          setForm({ amount: "", note: "" });
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("adjustTitle")}</CardTitle>
        <CardDescription>{t("adjustHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor="adjust-user">{t("user")}</FieldLabel>
              <UserPicker id="adjust-user" value={target} onChange={onTarget} />
              {target && <FieldDescription className="truncate">{target.email}</FieldDescription>}
            </Field>
            <Field>
              <FieldLabel htmlFor="adjust-amount">{t("amount")}</FieldLabel>
              <Input id="adjust-amount" type="number" step={1} value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="adjust-note">{t("reason")}</FieldLabel>
              <Input id="adjust-note" maxLength={200} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={!valid || adjust.isPending}>
            {t("apply")}
          </Button>
        </form>
        {target && (
          <AlertDialog open={confirming} onOpenChange={setConfirming}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t(amount > 0 ? "confirmAdd" : "confirmRemove", { count: Math.abs(amount), name: target.displayName })}</AlertDialogTitle>
                <AlertDialogDescription>{t("confirmReason", { note })}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("close")}</AlertDialogCancel>
                <AlertDialogAction onClick={run}>{t("apply")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}

function CoachingPaymentsCard() {
  const { t } = useAdminCreditsMessages();
  const payments = useCoachingPayments();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("coachingTitle")}</CardTitle>
        <CardDescription>{t("coachingHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <QueryState query={payments}>
          {(data) => (
            <div className="grid gap-6 lg:grid-cols-2">
              <PayableCoaches coaches={data.coaches} />
              <Disputes disputes={data.disputes} />
            </div>
          )}
        </QueryState>
      </CardContent>
    </Card>
  );
}

function PayableCoaches({ coaches }: { coaches: CoachingPayments["coaches"] }) {
  const { t } = useAdminCreditsMessages();
  const [paying, setPaying] = useState<CoachingPayments["coaches"][number] | null>(null);
  return (
    <section className="flex flex-col gap-2" aria-label={t("payable")}>
      <h3 className="text-sm font-medium">{t("payable")}</h3>
      {coaches.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noPayable")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {coaches.map((coach) => (
            <li key={coach.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{coach.user.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{coach.user.email}</p>
                <p className="text-xs text-muted-foreground">{t("payableCount", { count: coach.payableCredits, vnd: (coach.payableCredits * 1000).toLocaleString("vi-VN") })}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setPaying(coach)}>
                {t("recordPayout")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {paying && <PayoutDialog coach={paying} onClose={() => setPaying(null)} />}
    </section>
  );
}

function PayoutDialog({ coach, onClose }: { coach: CoachingPayments["coaches"][number]; onClose: () => void }) {
  const { t } = useAdminCreditsMessages();
  const record = useRecordPayout();
  const [amount, setAmount] = useState(String(coach.payableCredits));
  const [note, setNote] = useState("");
  const value = Number(amount);
  const valid = Number.isInteger(value) && value > 0 && value <= coach.payableCredits && note.trim().length >= 3;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("payoutTitle", { name: coach.user.displayName })}</DialogTitle>
        </DialogHeader>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor="payout-amount">{t("amount")}</FieldLabel>
            <Input id="payout-amount" type="number" min={1} max={coach.payableCredits} value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="payout-note">{t("transferRef")}</FieldLabel>
            <Input id="payout-note" maxLength={200} value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("close")}
          </Button>
          <Button
            disabled={!valid || record.isPending}
            onClick={() =>
              record.mutate(
                { coachId: coach.id, amount: value, note: note.trim() },
                {
                  onSuccess: () => {
                    toast.success(t("payoutRecorded"));
                    onClose();
                  },
                  onError: (error) => toast.error(error.message),
                },
              )
            }
          >
            {t("recordPayout")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Disputes({ disputes }: { disputes: CoachingPayments["disputes"] }) {
  const { t } = useAdminCreditsMessages();
  const { language } = useCreditsMessages();
  const resolve = useResolveDispute();
  const run = (id: string, outcome: "release" | "refund") =>
    resolve.mutate({ id, outcome }, { onSuccess: () => toast.success(t("resolved")), onError: (error) => toast.error(error.message) });
  return (
    <section className="flex flex-col gap-2" aria-label={t("disputes")}>
      <h3 className="flex items-center gap-1.5 text-sm font-medium">
        <Scale className="size-4" aria-hidden /> {t("disputes")}
      </h3>
      {disputes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noDisputes")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {disputes.map((item) => {
            const line = t("disputeLine", { player: item.player.displayName, coach: item.coach.user.displayName });
            const count = item.creditHold ?? 0;
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(item.proposedStartAt, language)} · {t("heldCount", { count })}
                  </p>
                </div>
                <ConfirmMoney
                  label={t("refundPlayer")}
                  title={t("confirmRefund", { count, player: item.player.displayName })}
                  description={line}
                  variant="outline"
                  disabled={resolve.isPending}
                  onConfirm={() => run(item.id, "refund")}
                />
                <ConfirmMoney
                  label={t("payCoach")}
                  title={t("confirmRelease", { count, coach: item.coach.user.displayName })}
                  description={line}
                  disabled={resolve.isPending}
                  onConfirm={() => run(item.id, "release")}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ConfirmMoney({
  label,
  title,
  description,
  variant = "default",
  disabled,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  variant?: "default" | "outline";
  disabled: boolean;
  onConfirm: () => void;
}) {
  const { t } = useAdminCreditsMessages();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={variant} disabled={disabled}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("close")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{label}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
