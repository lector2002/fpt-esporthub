"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SafetyTrigger({
  icon: Icon,
  label,
  destructive,
  onOpen,
}: {
  icon: LucideIcon;
  label: string;
  destructive?: boolean;
  onOpen: () => void;
}) {
  return (
    <Button type="button" variant={destructive ? "destructive" : "outline"} size="sm" onClick={onOpen}>
      <Icon /> {label}
    </Button>
  );
}
