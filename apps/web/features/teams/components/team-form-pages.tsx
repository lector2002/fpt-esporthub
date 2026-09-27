"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, QueryState } from "@/components/common/query-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { teamLogoPaths } from "@/features/media/api";
import { CoverEditor, PictureEditor } from "@/features/media/components/picture-editor";
import { useMediaMessages } from "@/features/media/messages";
import { useActiveGame } from "@/lib/game";
import { useSession } from "@/lib/session";
import { useCreateTeam, useRoleOptions, useTeam, useUpdateTeam } from "../api";
import { findRole } from "../labels";
import { useTeamMessages } from "../messages";
import type { LookupOption, TeamDetail } from "../types";
import { NoGameState } from "./no-game-state";
import { EMPTY_TEAM_FORM, TeamForm, type TeamFormValues } from "./team-form";

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="self-start">
      <Link href={href}>
        <ArrowLeft /> {label}
      </Link>
    </Button>
  );
}

export function CreateTeamView() {
  const { game } = useActiveGame();
  const { t } = useTeamMessages();
  const router = useRouter();
  const create = useCreateTeam();

  const submit = (values: TeamFormValues) => {
    if (!game) return;
    create.mutate(
      { ...values, game },
      {
        onSuccess: ({ team }) => {
          toast.success(t("teamCreated"));
          router.push(`/teams/${team.id}`);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/teams" label={t("backToTeams")} />
      <PageHeader title={t("newTitle")} image="/images/hero-teams.webp" />
      {game ? (
        <TeamForm
          key={game}
          game={game}
          initialValues={EMPTY_TEAM_FORM}
          submitLabel={t("createTeam")}
          pending={create.isPending}
          onSubmit={submit}
        />
      ) : (
        <NoGameState />
      )}
    </div>
  );
}

function toFormValues(team: TeamDetail, roles: LookupOption[]): TeamFormValues {
  return {
    name: team.name,
    mode: team.mode,
    description: team.description ?? "",
    rankMin: team.rankMin,
    rankMax: team.rankMax,
    neededRoles: team.neededRoles.map((role) => findRole(roles, role)?.id ?? role),
    schedule: team.schedule,
    goals: team.goals,
    communicationStyle: team.communicationStyle,
    recruitmentOpen: team.recruitmentOpen,
  };
}

export function EditTeamView({ id }: { id: string }) {
  const { t } = useTeamMessages();
  const query = useTeam(id);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href={`/teams/${id}`} label={t("viewTeam")} />
      <PageHeader title={t("editTitle")} />
      <QueryState query={query} skeleton={<Skeleton className="h-96 w-full" />}>
        {(team) =>
          team.viewerMembership === "captain" ? (
            <EditTeamForm team={team} />
          ) : (
            <EmptyState icon={ShieldAlert} title={t("notCaptain")} />
          )
        }
      </QueryState>
    </div>
  );
}

/** Captain-only: logo and card cover, saved right away (outside the form's save button). */
function TeamPictures({ team }: { team: TeamDetail }) {
  const { t } = useTeamMessages();
  const media = useMediaMessages().t;
  const { user } = useSession();
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("picturesTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <CoverEditor
          imageKey={team.coverKey}
          fallback={`/images/event-${team.game}.webp`}
          paths={teamLogoPaths(team.id, true, user, "cover")}
          className="h-24 rounded-lg"
        />
        <div className="flex items-center gap-3">
          <PictureEditor name={team.name} imageKey={team.logoKey} kind="team" paths={teamLogoPaths(team.id, true, user)} className="size-12" />
          <div className="min-w-0 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{t("logoLabel")}</p>
            <p>{media("pictureHint")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EditTeamForm({ team }: { team: TeamDetail }) {
  const { t } = useTeamMessages();
  const router = useRouter();
  const update = useUpdateTeam(team.id);
  const roles = useRoleOptions(team.game);

  if (roles.isPending) return <Skeleton className="h-96 w-full max-w-2xl" />;

  const submit = (values: TeamFormValues) =>
    update.mutate(values, {
      onSuccess: () => {
        toast.success(t("teamUpdated"));
        router.push(`/teams/${team.id}`);
      },
      onError: (error) => toast.error(error.message),
    });

  return (
    <TeamForm
      game={team.game}
      initialValues={toFormValues(team, roles.data ?? [])}
      submitLabel={t("save")}
      pending={update.isPending}
      onSubmit={submit}
      base={team}
      aside={<TeamPictures team={team} />}
    />
  );
}
