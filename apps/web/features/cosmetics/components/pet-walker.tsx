"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useCosmetics } from "../api";
import { PET_FX, PET_SPRITE } from "../looks";

const HEIGHT = 56;
const WIDTH = Math.round((HEIGHT * 89) / 96);
/** Walking speed in px per second, and how long it idles between walks. */
const SPEED = 70;
const IDLE_MS: [number, number] = [2500, 7000];
const WALK_FRAMES = 8;

type Pose = { x: number; facing: "left" | "right"; walkMs: number };

const between = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * The equipped pet strolls along the bottom of the screen: idles, walks to a random spot, idles again.
 * It never takes clicks. With reduced motion it only idles in the corner.
 */
export function PetWalker({ aboveTabBar }: { aboveTabBar: boolean }) {
  const pet = useCosmetics().data?.equipped.pet;
  const sprite = pet ? PET_SPRITE[pet] : undefined;
  const [pose, setPose] = useState<Pose | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!sprite) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const maxX = () => Math.max(0, window.innerWidth - WIDTH - 8);
    let current: Pose = { x: still ? maxX() : between(0, maxX()), facing: "left", walkMs: 0 };
    const show = (next: Pose) => {
      current = next;
      setPose(next);
    };
    show(current);
    if (still) return;

    const idle = () => {
      timer.current = setTimeout(walk, between(...IDLE_MS));
    };
    const walk = () => {
      const x = between(0, maxX());
      const walkMs = (Math.abs(x - current.x) / SPEED) * 1000;
      show({ x, facing: x > current.x ? "right" : "left", walkMs });
      timer.current = setTimeout(() => {
        show({ ...current, walkMs: 0 });
        idle();
      }, walkMs);
    };
    idle();
    return () => clearTimeout(timer.current);
  }, [sprite]);

  if (!pet || !sprite || !pose) return null;
  const walking = pose.walkMs > 0;
  const name = pet.replace("pet_", "");

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none fixed left-0 z-20", aboveTabBar ? "bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-1" : "bottom-1")}
      style={{ transform: `translateX(${pose.x}px)`, transition: walking ? `transform ${pose.walkMs}ms linear` : undefined }}
      data-testid="pet-walker"
    >
      <span
        className={cn("pet-sprite block", PET_FX[pet])}
        style={{
          height: HEIGHT,
          backgroundImage: `url(${walking ? `/pets/${name}-${pose.facing}.webp` : sprite})`,
          ["--pet-frames" as string]: walking ? WALK_FRAMES : 6,
        }}
      />
    </div>
  );
}
