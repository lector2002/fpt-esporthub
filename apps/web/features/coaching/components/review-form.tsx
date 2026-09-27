"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCoachReview } from "../api";
import { useCoachingMessages } from "../messages";
import { RatingPicker } from "./rating-stars";

const COMMENT_MIN = 10;
const COMMENT_MAX = 500;

type Errors = Partial<Record<"rating" | "comment", string>>;

export function ReviewForm({ coachId }: { coachId: string }) {
  const { t } = useCoachingMessages();
  const createReview = useCreateCoachReview(coachId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = comment.trim();
    const next: Errors = {};
    if (rating < 1) next.rating = t("errRating");
    if (trimmed.length < COMMENT_MIN || trimmed.length > COMMENT_MAX) next.comment = t("errComment");
    setErrors(next);
    if (Object.keys(next).length) return;
    createReview.mutate(
      { rating, comment: trimmed },
      {
        onSuccess: () => {
          toast.success(t("reviewSent"));
          setRating(0);
          setComment("");
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("writeReview")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(errors.rating)}>
              <FieldTitle>{t("rating")}</FieldTitle>
              <RatingPicker value={rating} onChange={setRating} invalid={Boolean(errors.rating)} />
              <FieldError>{errors.rating}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.comment)}>
              <FieldLabel htmlFor="review-comment">{t("comment")}</FieldLabel>
              <Textarea
                id="review-comment"
                rows={3}
                maxLength={COMMENT_MAX}
                value={comment}
                aria-invalid={Boolean(errors.comment)}
                onChange={(event) => setComment(event.target.value)}
              />
              <FieldError>{errors.comment}</FieldError>
            </Field>
          </FieldGroup>
          <Button type="submit" className="self-start" disabled={createReview.isPending}>
            {t("submitReview")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
