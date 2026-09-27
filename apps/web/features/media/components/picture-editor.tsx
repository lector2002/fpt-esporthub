"use client";

import { useRef, useState } from "react";
import { Camera, ImageUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SplashBanner } from "@/components/common/champion-splash";
import { type AvatarKind, UserAvatar } from "@/components/common/user-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { ACCEPTED_TYPES, checkPicture, type PicturePaths, useRemoveMedia, useUploadPicture } from "../api";
import { useMediaMessages } from "../messages";

export interface PictureEditorProps {
  name: string;
  imageKey: string | null | undefined;
  paths: PicturePaths;
  kind?: AvatarKind;
  className?: string;
}

type Labels = { change: string; upload: string; remove: string; removeTitle: string };

/** Upload / take-down menu for one picture slot; `controls(trigger)` renders it around the given button. */
function usePictureControls(imageKey: string | null | undefined, paths: PicturePaths, labels: Labels, testId: string) {
  const { t } = useMediaMessages();
  const input = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const upload = useUploadPicture(paths.upload);
  const remove = useRemoveMedia();
  const canRemove = Boolean(paths.remove && imageKey);
  const pending = upload.isPending || remove.isPending;

  function onFile(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    const problem = checkPicture(file);
    if (problem) return void toast.error(t(problem));
    upload.mutate(file, {
      onSuccess: () => toast.success(t("pictureUpdated")),
      onError: (error) => toast.error(error.message),
    });
  }

  function onRemove() {
    remove.mutate(paths.remove!, {
      onSuccess: () => toast.success(t("pictureRemoved")),
      onError: (error) => toast.error(error.message),
    });
  }

  const controls = (trigger: React.ReactNode) => (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-44">
          {paths.upload && (
            <DropdownMenuItem onSelect={() => input.current?.click()}>
              <ImageUp /> {imageKey ? labels.change : labels.upload}
            </DropdownMenuItem>
          )}
          {canRemove && (
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
              <Trash2 /> {labels.remove}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {paths.upload && (
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          data-testid={testId}
          onChange={(event) => onFile(event.target.files?.[0])}
        />
      )}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.removeTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t("removeHint")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onRemove}>
              {labels.remove}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return { pending, editable: Boolean(paths.upload) || canRemove, controls };
}

/** An avatar or team logo with a camera button for whoever may change or take it down. Plain avatar otherwise. */
export function PictureEditor({ name, imageKey, paths, kind, className }: PictureEditorProps) {
  const { t } = useMediaMessages();
  const labels = { change: t("changePicture"), upload: t("uploadPicture"), remove: t("removePicture"), removeTitle: t("removePictureTitle") };
  const { pending, editable, controls } = usePictureControls(imageKey, paths, labels, "picture-input");

  if (!editable) return <UserAvatar name={name} imageKey={imageKey} kind={kind} className={className} />;

  return (
    <div className="relative w-fit shrink-0">
      <UserAvatar name={name} imageKey={imageKey} kind={kind} className={cn(className, pending && "opacity-60")} />
      {pending && <Spinner className="absolute inset-0 m-auto" />}
      {controls(
        <Button
          size="icon"
          variant="secondary"
          disabled={pending}
          aria-label={paths.upload ? labels.change : labels.remove}
          className="absolute -right-1 -bottom-1 size-7 rounded-full border-2 border-background"
        >
          <Camera className="size-3.5" />
        </Button>,
      )}
    </div>
  );
}

/**
 * Card cover banner (player or team) with a "Change cover" button for whoever may edit it.
 * Without an uploaded cover it shows `fallback` art.
 */
export function CoverEditor({
  imageKey,
  fallback,
  paths,
  fade,
  className,
}: {
  imageKey: string | null | undefined;
  fallback: string | null;
  paths: PicturePaths;
  fade?: "from-card" | "from-background";
  className?: string;
}) {
  const { t } = useMediaMessages();
  const labels = { change: t("changeCover"), upload: t("uploadCover"), remove: t("removeCover"), removeTitle: t("removeCoverTitle") };
  const { pending, editable, controls } = usePictureControls(imageKey, paths, labels, "cover-input");

  return (
    <div className={cn("on-picture relative overflow-hidden", className)}>
      <SplashBanner src={mediaUrl(imageKey) ?? fallback} fade={fade} className={cn("h-full", pending && "opacity-60")} />
      {pending && <Spinner className="absolute inset-0 m-auto" />}
      {editable &&
        controls(
          <Button size="sm" variant="secondary" disabled={pending} className="absolute top-3 right-3">
            <Camera /> {imageKey ? labels.change : paths.upload ? labels.upload : labels.remove}
          </Button>,
        )}
    </div>
  );
}
