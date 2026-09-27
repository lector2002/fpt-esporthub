"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmAction } from "@/features/teams/components/confirm-action";
import { GAMES, type GameSlug } from "@/lib/contracts";
import { communityHref, useCreateCommunity, useDeleteCommunity, useUpdateCommunity } from "../api";
import { useCommunityMessages } from "../messages";
import type { CommunityDetail, CommunityInput } from "../types";

const GAME_OPTIONS: (GameSlug | "any")[] = ["any", "valorant", "league_of_legends"];

const validName = (name: string) => name.trim().length >= 3 && name.trim().length <= 40;

function CommunityFields({
  values,
  onChange,
  idPrefix,
  showErrors,
}: {
  values: CommunityInput;
  onChange: (values: CommunityInput) => void;
  idPrefix: string;
  showErrors: boolean;
}) {
  const { t } = useCommunityMessages();
  const nameInvalid = showErrors && !validName(values.name);
  return (
    <FieldGroup className="gap-4">
      <Field data-invalid={nameInvalid || undefined}>
        <FieldLabel htmlFor={`${idPrefix}-name`}>{t("name")}</FieldLabel>
        <Input
          id={`${idPrefix}-name`}
          value={values.name}
          maxLength={40}
          placeholder={t("namePlaceholder")}
          aria-invalid={nameInvalid || undefined}
          onChange={(event) => onChange({ ...values, name: event.target.value })}
        />
        {nameInvalid && <FieldError>{t("nameRequired")}</FieldError>}
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-game`}>{t("game")}</FieldLabel>
        <Select value={values.game} onValueChange={(game) => onChange({ ...values, game: game as CommunityInput["game"] })}>
          <SelectTrigger id={`${idPrefix}-game`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GAME_OPTIONS.map((game) => (
              <SelectItem key={game} value={game}>
                {game === "any" ? t("anyGame") : GAMES[game].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-description`}>{t("description")}</FieldLabel>
        <Textarea
          id={`${idPrefix}-description`}
          value={values.description}
          maxLength={300}
          rows={3}
          placeholder={t("descriptionPlaceholder")}
          onChange={(event) => onChange({ ...values, description: event.target.value })}
        />
      </Field>
    </FieldGroup>
  );
}

export function CreateCommunityDialog({ trigger, defaultGame }: { trigger: React.ReactNode; defaultGame: GameSlug | null }) {
  const { t } = useCommunityMessages();
  const router = useRouter();
  const create = useCreateCommunity();
  const [open, setOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [values, setValues] = useState<CommunityInput>({ name: "", description: "", game: defaultGame ?? "any" });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (!validName(values.name)) return;
    create.mutate(
      { ...values, name: values.name.trim(), description: values.description.trim() },
      {
        onSuccess: (data) => {
          toast.success(t("created"));
          setOpen(false);
          if (data.community) router.push(communityHref(data.community.id));
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{t("createCommunity")}</DialogTitle>
          </DialogHeader>
          <CommunityFields values={values} onChange={setValues} idPrefix="community-create" showErrors={showErrors} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="animate-spin" />} {t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Owner only: details and deleting the community. Icon and banner are edited on the page header. */
export function CommunitySettingsDialog({
  community,
  open,
  onOpenChange,
}: {
  community: CommunityDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useCommunityMessages();
  const router = useRouter();
  const update = useUpdateCommunity(community.id);
  const remove = useDeleteCommunity(community.id);
  const [showErrors, setShowErrors] = useState(false);
  const [values, setValues] = useState<CommunityInput>({
    name: community.name,
    description: community.description ?? "",
    game: community.game ?? "any",
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (!validName(values.name)) return;
    update.mutate(
      { ...values, name: values.name.trim(), description: values.description.trim() },
      {
        onSuccess: () => {
          toast.success(t("saved"));
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("settings")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <CommunityFields values={values} onChange={setValues} idPrefix="community-settings" showErrors={showErrors} />
          <DialogFooter className="sm:justify-between">
            <ConfirmAction
              trigger={
                <Button type="button" variant="ghost" className="text-destructive hover:text-destructive">
                  <Trash2 /> {t("deleteCommunity")}
                </Button>
              }
              title={t("deleteTitle", { name: community.name })}
              description={t("deleteHint")}
              confirmLabel={t("delete")}
              onConfirm={() =>
                remove.mutate(undefined, {
                  onSuccess: () => {
                    onOpenChange(false);
                    router.push("/communities");
                  },
                  onError: (error) => toast.error(error.message),
                })
              }
            />
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? <Loader2 className="animate-spin" /> : <Save />} {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
