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
const STOP_EARLY = 0.45;
/**
 * Seconds per frame: the run cycle plays fast so the legs keep up with the ground, tricks a bit slower. Run frames are
 * wider (134x96 against 89x96) because the runs were scaled up to the idle height and a stretched-out run needs room.
 */
const WALK = { frames: 8, frameS: 0.1, width: 134 };
const WALK_WIDTH = Math.round((HEIGHT * WALK.width) / 96);
const IDLE_FRAME_S = 0.2;
const TRICK_FRAME_S = 0.15;

/** The Codex pet states cropped into public/pets/<pet>-<trick>.webp, with frame count and how many times to play. */
const TRICKS = {
  wave: { frames: 4, loops: 2 },
  jump: { frames: 5, loops: 2 },
  flop: { frames: 8, loops: 1 },
  wait: { frames: 6, loops: 2 },
  busy: { frames: 6, loops: 2 },
  review: { frames: 6, loops: 2 },
};
type Trick = keyof typeof TRICKS;
/** What it does when it stops; plain idle more often than any trick. */
const ON_STOP: (Trick | null)[] = [null, null, null, "wave", "jump", "jump", "flop", "wait", "busy", "review"];

type Facing = "left" | "right";
type Pose = { x: number; facing: Facing; walkMs: number; trick: Trick | null };

const between = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const turn = (facing: Facing): Facing => (facing === "left" ? "right" : "left");

/**
 * The equipped pet paces the bottom of the screen from edge to edge using its own run cycle, and when it stops it
 * sometimes waves, jumps, flops over or looks around. It never takes clicks.
 * It keeps going under reduced motion: equipping a pet is the player asking for it.
 */
export function PetWalker({ aboveTabBar }: { aboveTabBar: boolean }) {
  const pet = useCosmetics().data?.equipped.pet;
  const sprite = pet ? PET_SPRITE[pet] : undefined;
  const [pose, setPose] = useState<Pose | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!pet || !sprite) return;
    const name = pet.replace("pet_", "");
    // Load every strip up front so a new move never flashes blank.
    for (const strip of ["left", "right", ...Object.keys(TRICKS)]) new Image().src = `/pets/${name}-${strip}.webp`;

    const maxX = () => Math.max(0, window.innerWidth - WIDTH);
    let current: Pose = { x: between(0, maxX()), facing: Math.random() < 0.5 ? "left" : "right", walkMs: 0, trick: null };
    const show = (next: Pose) => {
      current = next;
      setPose(next);
    };
    const later = (fn: () => void, ms: number) => {
      timer.current = setTimeout(fn, ms);
    };

    const rest = () => {
      show({ ...current, walkMs: 0, trick: null });
      later(walk, between(...REST_MS));
    };
    const walk = () => {
      const edge = current.facing === "right" ? maxX() : 0;
      const x = Math.random() < STOP_EARLY ? between(current.x, edge) : edge;
      const walkMs = (Math.abs(x - current.x) / SPEED) * 1000;
      show({ ...current, x, walkMs, trick: null });
      later(() => {
        const facing = x === edge || Math.random() < 0.5 ? turn(current.facing) : current.facing;
        const trick = pick(ON_STOP);
        show({ x, facing, walkMs: 0, trick });
        if (!trick) return later(walk, between(...REST_MS));
        const { frames, loops } = TRICKS[trick];
        later(rest, frames * TRICK_FRAME_S * loops * 1000);
      }, walkMs);
    };
    show(current);
    later(walk, 600);
    return () => clearTimeout(timer.current);
  }, [pet, sprite]);

  if (!pet || !sprite || !pose) return null;
  const walking = pose.walkMs > 0;
  const name = pet.replace("pet_", "");
  const move = walking
    ? { src: `/pets/${name}-${pose.facing}.webp`, frames: WALK.frames, frameS: WALK.frameS }
    : pose.trick
      ? { src: `/pets/${name}-${pose.trick}.webp`, frames: TRICKS[pose.trick].frames, frameS: TRICK_FRAME_S }
      : { src: sprite, frames: 6, frameS: IDLE_FRAME_S };

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none fixed left-0 z-40", aboveTabBar ? "bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0" : "bottom-0")}
      style={{ transform: `translateX(${pose.x}px)`, transition: walking ? `transform ${pose.walkMs}ms linear` : undefined }}
      data-testid="pet-walker"
    >
      {/* Keyed by the move so each one starts from its first frame. */}
      <span
        key={move.src}
        className={cn("pet-sprite pet-walk block", PET_FX[pet])}
        style={{
          height: HEIGHT,
          // The wider run box stays centered on the same spot, so the pet doesn't hop sideways when it starts running.
          ...(walking && { aspectRatio: `${WALK.width} / 96`, marginLeft: (WIDTH - WALK_WIDTH) / 2 }),
          backgroundImage: `url(${move.src})`,
          ["--pet-frames" as string]: move.frames,
          ["--pet-frame-s" as string]: `${move.frameS}s`,
        }}
        data-move={walking ? pose.facing : (pose.trick ?? "idle")}
      />
    </div>
  );
}
