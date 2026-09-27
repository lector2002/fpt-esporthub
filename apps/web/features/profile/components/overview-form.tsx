"use client";

import { useState } from "react";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PlayerProfile, SessionUser } from "@/lib/contracts";
import { useProfileMessages } from "../messages";
import { useDraft } from "./profile-draft";

const BIO_MAX = 280;

export function OverviewForm({ user, profile }: { user: SessionUser; profile: PlayerProfile }) {
  const { t } = useProfileMessages();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");

  const name = displayName.trim();
  const nameInvalid = name.length < 2 || name.length > 32;
  const bioInvalid = bio.length > BIO_MAX;
  const dirty = name !== user.displayName || bio.trim() !== (profile.bio ?? "");

  useDraft("overview", { patch: dirty ? { displayName: name, bio: bio.trim() } : null, invalid: nameInvalid || bioInvalid });

  return (
    <FieldGroup>
      <Field data-invalid={nameInvalid || undefined}>
        <FieldLabel htmlFor="profile-display-name">{t("displayName")}</FieldLabel>
        <Input
          id="profile-display-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          aria-invalid={nameInvalid || undefined}
          autoComplete="nickname"
        />
        {nameInvalid && <FieldError>{t("displayNameError")}</FieldError>}
      </Field>
      <Field data-invalid={bioInvalid || undefined}>
        <FieldLabel htmlFor="profile-bio">{t("bio")}</FieldLabel>
        <Textarea
          id="profile-bio"
          rows={3}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          aria-invalid={bioInvalid || undefined}
        />
        <FieldDescription className="tabular-nums">{t("bioCount", { count: bio.length })}</FieldDescription>
        {bioInvalid && <FieldError>{t("bioError")}</FieldError>}
      </Field>
    </FieldGroup>
  );
}
