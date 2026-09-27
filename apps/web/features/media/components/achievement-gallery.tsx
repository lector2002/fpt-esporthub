"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { mediaUrl } from "@/lib/media";
import { useSession } from "@/lib/session";
import { ACCEPTED_TYPES, MAX_ACHIEVEMENTS, achievementRemovePath, checkPicture, useAddAchievement, useRemoveMedia } from "../api";
import { useMediaMessages } from "../messages";
import type { Achievement, AchievementOwnerInput } from "../types";

export interface AchievementGalleryProps {
  achievements: Achievement[];
  owner: AchievementOwnerInput;
  /** The player, team captain or coach who owns the gallery. */
  canEdit: boolean;
}

export function AchievementGallery({ achievements, owner, canEdit }: AchievementGalleryProps) {
  const { t } = useMediaMessages();
  const { user } = useSession();
  const canAdd = canEdit && achievements.length < MAX_ACHIEVEMENTS;

  if (!achievements.length && !canEdit) return null;

  return (
    <div className="flex flex-col gap-3">
      {achievements.length === 0 && <p className="text-sm text-muted-foreground">{t("noAchievements")}</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={t("achievements")}>
        {achievements.map((achievement) => (
          <AchievementTile key={achievement.id} achievement={achievement} removePath={achievementRemovePath(achievement.id, canEdit, user)} />
        ))}
        {canAdd && (
          <li>
            <AddAchievementDialog owner={owner} />
          </li>
        )}
      </ul>
      {canEdit && <p className="text-xs text-muted-foreground">{t("achievementLimit", { max: MAX_ACHIEVEMENTS })}</p>}
    </div>
  );
}

function AchievementTile({ achievement, removePath }: { achievement: Achievement; removePath: string | undefined }) {
  const { t } = useMediaMessages();
  const src = mediaUrl(achievement.imageKey);
  return (
    <li className="group relative flex flex-col gap-1.5" data-achievement>
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={t("viewAchievement", { title: achievement.title })}
            className="aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img src={src} alt="" loading="lazy" className="size-full object-cover transition-transform group-hover:scale-[1.03]" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{achievement.title}</DialogTitle>
          </DialogHeader>
          <img src={src} alt={achievement.title} className="max-h-[70vh] w-full rounded-md object-contain" />
        </DialogContent>
      </Dialog>
      <p className="line-clamp-2 text-sm font-medium">{achievement.title}</p>
      {removePath && <RemoveAchievementButton title={achievement.title} path={removePath} />}
    </li>
  );
}

function RemoveAchievementButton({ title, path }: { title: string; path: string }) {
  const { t } = useMediaMessages();
  const remove = useRemoveMedia();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          aria-label={t("removeAchievement")}
          disabled={remove.isPending}
          className="absolute top-1.5 right-1.5 size-7 opacity-90 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("removeAchievementTitle", { title })}</AlertDialogTitle>
          <AlertDialogDescription>{t("removeHint")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              remove.mutate(path, {
                onSuccess: () => toast.success(t("achievementRemoved")),
                onError: (error) => toast.error(error.message),
              })
            }
          >
            {t("removeAchievement")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AddAchievementDialog({ owner }: { owner: AchievementOwnerInput }) {
  const { t } = useMediaMessages();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground outline-none transition-colors hover:border-primary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ImagePlus className="size-5" />
          {t("addAchievement")}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addAchievement")}</DialogTitle>
        </DialogHeader>
        {open && <AddAchievementForm owner={owner} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

type Errors = Partial<Record<"title" | "file", string>>;

function AddAchievementForm({ owner, onDone }: { owner: AchievementOwnerInput; onDone: () => void }) {
  const { t } = useMediaMessages();
  const add = useAddAchievement(owner);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const preview = usePreviewUrl(file);

  function onFile(next: File | undefined) {
    const problem = next ? checkPicture(next) : null;
    setErrors((current) => ({ ...current, file: problem ? t(problem) : undefined }));
    setFile(next && !problem ? next : null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    const next: Errors = {};
    if (trimmed.length < 2 || trimmed.length > 80) next.title = t("errTitle");
    if (!file) next.file = errors.file ?? t("errImageRequired");
    setErrors(next);
    if (next.title || next.file || !file) return;
    add.mutate(
      { title: trimmed, file },
      {
        onSuccess: () => {
          toast.success(t("achievementAdded"));
          onDone();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Field data-invalid={Boolean(errors.title)}>
          <FieldLabel htmlFor="achievement-title">{t("achievementTitle")}</FieldLabel>
          <Input
            id="achievement-title"
            value={title}
            maxLength={80}
            placeholder={t("achievementTitlePlaceholder")}
            aria-invalid={Boolean(errors.title)}
            onChange={(event) => setTitle(event.target.value)}
          />
          <FieldError>{errors.title}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.file)}>
          <FieldLabel htmlFor="achievement-file">{t("achievementImage")}</FieldLabel>
          <Input
            id="achievement-file"
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            aria-invalid={Boolean(errors.file)}
            onChange={(event) => onFile(event.target.files?.[0])}
          />
          <FieldDescription>{t("pictureHint")}</FieldDescription>
          <FieldError>{errors.file}</FieldError>
        </Field>
        {preview && <img src={preview} alt="" className="aspect-[4/3] w-full rounded-lg border border-border object-cover" />}
      </FieldGroup>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {t("cancel")}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={add.isPending}>
          {t("add")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function usePreviewUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url;
}

/** The gallery in its own card, for public pages. Hidden when empty unless the viewer can add. */
export function AchievementsCard(props: AchievementGalleryProps) {
  const { t } = useMediaMessages();
  if (!props.achievements.length && !props.canEdit) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-4 text-primary" aria-hidden />
          {t("achievements")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AchievementGallery {...props} />
      </CardContent>
    </Card>
  );
}
