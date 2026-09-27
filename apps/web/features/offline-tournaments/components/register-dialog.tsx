"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/query-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useMyTeams, useTeam } from "@/features/teams/api";
import { useRegisterEntry } from "../api";
import { useOfflineMessages } from "../messages";
import type { OfflineTournament } from "../types";

export function RegisterDialog({ tournament }: { tournament: OfflineTournament }) {
  const { t } = useOfflineMessages();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> {t("register")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("registerTitle")}</DialogTitle>
          <DialogDescription>{t("registerDescription")}</DialogDescription>
        </DialogHeader>
        {open && <RegisterForm tournament={tournament} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function RegisterForm({ tournament, onDone }: { tournament: OfflineTournament; onDone: () => void }) {
  const { t } = useOfflineMessages();
  const teams = useMyTeams(tournament.game);
  const captained = (teams.data ?? []).filter((team) => team.viewerMembership === "captain");
  const [teamId, setTeamId] = useState<string | null>(null);
  const selectedId = teamId ?? (captained.length === 1 ? captained[0].id : null);

  if (teams.isPending) return <Skeleton className="h-24 w-full" />;
  if (captained.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("noCaptainTeams")}
        action={
          <Button asChild variant="outline">
            <Link href="/teams/new">{t("createTeam")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Field>
        <FieldLabel htmlFor="register-team">{t("pickTeam")}</FieldLabel>
        <Select value={selectedId ?? ""} onValueChange={setTeamId}>
          <SelectTrigger id="register-team" className="w-full">
            <SelectValue placeholder={t("pickTeamPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {captained.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {selectedId && <RosterPicker key={selectedId} teamId={selectedId} tournament={tournament} onDone={onDone} />}
    </div>
  );
}

function RosterPicker({ teamId, tournament, onDone }: { teamId: string; tournament: OfflineTournament; onDone: () => void }) {
  const { t } = useOfflineMessages();
  const team = useTeam(teamId);
  const register = useRegisterEntry(tournament.id);
  const size = tournament.teamSize;
  const members = team.data?.members ?? [];
  const [picked, setPicked] = useState<string[] | null>(null);
  // A team that is exactly the right size starts fully selected.
  const current = picked ?? (members.length === size ? members.map((m) => m.userId) : []);

  if (team.isPending) return <Skeleton className="h-32 w-full" />;

  const toggle = (userId: string, on: boolean) => {
    if (on && current.length >= size) return;
    setPicked(on ? [...current, userId] : current.filter((id) => id !== userId));
  };

  const submit = () =>
    register.mutate(
      { teamId, playerIds: current },
      {
        onSuccess: () => {
          toast.success(t("registered"));
          onDone();
        },
        onError: (error) => toast.error(error.message),
      },
    );

  return (
    <>
      <FieldSet>
        <FieldLegend variant="label">{t("roster", { picked: current.length, size })}</FieldLegend>
        <FieldDescription>{t("rosterHint", { size })}</FieldDescription>
        <div className="flex flex-col gap-2">
          {members.map((member) => {
            const id = `roster-${member.userId}`;
            const checked = current.includes(member.userId);
            return (
              <div key={member.userId} className="flex items-center gap-3">
                <Checkbox
                  id={id}
                  checked={checked}
                  disabled={!checked && current.length >= size}
                  onCheckedChange={(value) => toggle(member.userId, value === true)}
                />
                <Label htmlFor={id} className="font-normal">
                  {member.displayName}
                </Label>
              </div>
            );
          })}
        </div>
      </FieldSet>
      <DialogFooter>
        <Button onClick={submit} disabled={current.length !== size || register.isPending}>
          {register.isPending && <Spinner />} {t("register")}
        </Button>
      </DialogFooter>
    </>
  );
}
