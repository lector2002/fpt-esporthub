"use client";

import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useShellMessages } from "@/features/shell/messages";
import { GAMES, type GameSlug } from "@/lib/contracts";
import { useActiveGame } from "@/lib/game";
import { cn } from "@/lib/utils";

const ALL_GAMES = Object.keys(GAMES) as GameSlug[];

function GameDot({ game }: { game: GameSlug }) {
  return (
    <span
      aria-hidden
      className={cn("size-2 shrink-0 rounded-full bg-current", game === "valorant" ? "text-valorant" : "text-lol")}
    />
  );
}

export function GameSwitcher() {
  const { t } = useShellMessages();
  const { game, games, setGame } = useActiveGame();
  if (!game) return null;

  const missing = ALL_GAMES.filter((slug) => !games.includes(slug));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 min-w-0 gap-2 px-3 text-sm">
          <GameDot game={game} />
          <span className="truncate sm:hidden">{GAMES[game].short}</span>
          <span className="hidden truncate sm:inline">{GAMES[game].label}</span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("myGames")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={game} onValueChange={(value) => setGame(value as GameSlug)}>
          {games.map((slug) => (
            <DropdownMenuRadioItem key={slug} value={slug}>
              <GameDot game={slug} />
              {GAMES[slug].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {missing.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {missing.map((slug) => (
              <DropdownMenuItem key={slug} asChild>
                <Link href={`/onboarding?game=${slug}`}>
                  <Plus />
                  {t("addGame", { game: GAMES[slug].label })}
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
