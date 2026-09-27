"use client";

import { useState } from "react";
import { Ban, ShieldOff } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "@/lib/session";
import { useBlockUser, useBlockedUsers, useUnblockUser } from "../api";
import { useSafetyMessages } from "../messages";
import { SafetyTrigger } from "./safety-trigger";

export interface BlockButtonProps {
  userId: string;
  userName: string;
}

export function BlockButton({ userId, userName }: BlockButtonProps) {
  const { t } = useSafetyMessages();
  const { user } = useSession();
  const blocks = useBlockedUsers();
  const [open, setOpen] = useState(false);

  if (!user || user.id === userId) return null;
  const isBlocked = Boolean(blocks.data?.some((block) => block.userId === userId));

  return (
    <>
      <SafetyTrigger
        icon={isBlocked ? ShieldOff : Ban}
        label={isBlocked ? t("unblock") : t("block")}
        destructive={!isBlocked}
        onOpen={() => setOpen(true)}
      />
      <BlockConfirmDialog
        open={open}
        onOpenChange={setOpen}
        userId={userId}
        userName={userName}
        isBlocked={isBlocked}
      />
    </>
  );
}

export function BlockConfirmDialog({
  open,
  onOpenChange,
  userId,
  userName,
  isBlocked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  isBlocked: boolean;
}) {
  const { t } = useSafetyMessages();
  const block = useBlockUser();
  const unblock = useUnblockUser();
  const pending = block.isPending || unblock.isPending;

  const onConfirm = (event: React.MouseEvent) => {
    event.preventDefault();
    const mutation = isBlocked ? unblock : block;
    mutation.mutate(userId, {
      onSuccess: () => {
        toast.success(t(isBlocked ? "unblocked" : "blocked", { name: userName }));
        onOpenChange(false);
      },
      onError: (error) => toast.error(t("blockFailed"), { description: error.message }),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(isBlocked ? "unblockTitle" : "blockTitle", { name: userName })}</AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked ? t("unblockDescription", { name: userName }) : t("blockDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction variant={isBlocked ? "default" : "destructive"} disabled={pending} onClick={onConfirm}>
            {pending && <Spinner />} {isBlocked ? t("unblock") : t("block")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
