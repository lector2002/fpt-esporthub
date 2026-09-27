"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { SessionUser } from "@/lib/contracts";
import type { AchievementOwnerInput } from "./types";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_ACHIEVEMENTS = 6;

/** Returns the message key of the first problem, or null. The API re-checks everything. */
export function checkPicture(file: File): "errTooLarge" | "errType" | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "errType";
  if (file.size > MAX_UPLOAD_BYTES) return "errTooLarge";
  return null;
}

type Viewer = Pick<SessionUser, "id" | "role"> | null;

/** Where a picture can be changed or taken down from, for this viewer. Undefined = not allowed. */
export interface PicturePaths {
  upload?: string;
  remove?: string;
}

export function avatarPaths(userId: string, viewer: Viewer, picture: "avatar" | "cover" = "avatar"): PicturePaths {
  if (viewer?.id === userId) return { upload: `/media/${picture}`, remove: `/media/${picture}` };
  return viewer?.role === "ADMIN" ? { remove: `/admin/media/users/${encodeURIComponent(userId)}/${picture}` } : {};
}

export function teamLogoPaths(teamId: string, isCaptain: boolean, viewer: Viewer, picture: "logo" | "cover" = "logo"): PicturePaths {
  const own = `/media/teams/${encodeURIComponent(teamId)}/${picture}`;
  if (isCaptain) return { upload: own, remove: own };
  return viewer?.role === "ADMIN" ? { remove: `/admin/media/teams/${encodeURIComponent(teamId)}/${picture}` } : {};
}

export function achievementRemovePath(id: string, canEdit: boolean, viewer: Viewer) {
  if (canEdit) return `/media/achievements/${encodeURIComponent(id)}`;
  return viewer?.role === "ADMIN" ? `/admin/media/achievements/${encodeURIComponent(id)}` : undefined;
}

/** Pictures show up on many screens (cards, chat, menus), so every change refreshes everything. */
function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}

export function useUploadPicture(path: string | undefined) {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api(path!, { method: "PUT", body: form });
    },
    onSuccess: refresh,
  });
}

export function useRemoveMedia() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (path: string) => api(path, { method: "DELETE" }),
    onSuccess: refresh,
  });
}

export function useAddAchievement(owner: AchievementOwnerInput) {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: ({ title, file }: { title: string; file: File }) => {
      const form = new FormData();
      form.append("owner", owner.owner);
      if (owner.owner === "team") form.append("teamId", owner.teamId);
      form.append("title", title);
      form.append("file", file);
      return api("/media/achievements", { method: "POST", body: form });
    },
    onSuccess: refresh,
  });
}
