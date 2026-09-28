"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useCosmetics } from "../api";
import { PET_FX, PET_SPRITE } from "../looks";

const HEIGHT = 64;
const WIDTH = Math.round((HEIGHT * 89) / 96);
/** Walking speed in px per second, how long it rests between walks, and how often it stops before reaching the edge. */
const SPEED = 80;
const REST_MS: [number, number] = [900, 2600];
const STOP_EARLY = 0.3;
const WALK_FRAMES = 8;

type Facing = "left" | "right";
type Pose = { x: number; facing: Facing; walkMs: number };

const between = (min: number, max: number) => min + Math.random() * (max - min);
const turn = (facing: Facing): Facing => (facing === "left" ? "right" : "left");

/**
 * The equipped pet paces the bottom of the screen from edge to edge, resting now and then. It never takes clicks.
 * It keeps walking under reduced motion: equipping a pet is the player asking for it.
 */
export function PetWalker({ aboveTabBar }: { aboveTabBar: boolean }) {
  const pet = useCosmetics().data?.equipped.pet;
  const sprite = pet ? PET_SPRITE[pet] : undefined;
  const [pose, setPose] = useState<Pose | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!sprite) return;
    const maxX = () => Math.max(0, window.innerWidth - WIDTH);
    let current: Pose = { x: between(0, maxX()), facing: Math.random() < 0.5 ? "left" : "right", walkMs: 0 };
    const show = (next: Pose) => {
      current = next;
      setPose(next);
    };

    const walk = () => {
      const edge = current.facing === "right" ? maxX() : 0;
      const x = Math.random() < STOP_EARLY ? between(current.x, edge) : edge;
      const walkMs = (Math.abs(x - current.x) / SPEED) * 1000;
      show({ ...current, x, walkMs });
      timer.current = setTimeout(() => {
        const atEdge = x === edge;
        show({ x, facing: atEdge || Math.random() < 0.5 ? turn(current.facing) : current.facing, walkMs: 0 });
        timer.current = setTimeout(walk, between(...REST_MS));
      }, walkMs);
    };
    show(current);
    timer.current = setTimeout(walk, 600);
    return () => clearTimeout(timer.current);
  }, [sprite]);

  if (!pet || !sprite || !pose) return null;
  const walking = pose.walkMs > 0;
  const name = pet.replace("pet_", "");

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none fixed left-0 z-40", aboveTabBar ? "bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0" : "bottom-0")}
      style={{ transform: `translateX(${pose.x}px)`, transition: walking ? `transform ${pose.walkMs}ms linear` : undefined }}
      data-testid="pet-walker"
    >
      <span
        className={cn("pet-sprite pet-walk block", PET_FX[pet])}
        style={{
          height: HEIGHT,
          backgroundImage: `url(${walking ? `/pets/${name}-${pose.facing}.webp` : sprite})`,
          ["--pet-frames" as string]: walking ? WALK_FRAMES : 6,
        }}
      />
    </div>
  );
}
