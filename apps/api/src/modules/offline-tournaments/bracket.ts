// Pure bracket planning: the database stores this output and advancement only follows the links.

export type BracketFormat = "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION";
export type BracketSide = "WINNERS" | "LOSERS" | "GRAND_FINAL";
export type Slot = "A" | "B";

export interface SlotRef {
  match: string;
  slot: Slot;
}

/** `entryA`/`entryB` are 0-based seed indexes placed at generation; other slots are filled by `winnerTo`/`loserTo` links. */
export interface PlannedMatch {
  key: string;
  bracket: BracketSide;
  round: number;
  position: number;
  entryA: number | null;
  entryB: number | null;
  winnerTo: SlotRef | null;
  loserTo: SlotRef | null;
}

type SlotValue = { kind: "entry"; entry: number } | { kind: "bye" } | { kind: "feed" };

interface Draft extends Omit<PlannedMatch, "entryA" | "entryB"> {
  slots: Record<Slot, SlotValue>;
}

const FEED: SlotValue = { kind: "feed" };
const BYE: SlotValue = { kind: "bye" };

/** Bracket order of seeds (1-based) so that 1 and 2 can only meet in the final: 4 -> [1, 4, 2, 3]. */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const next = order.length * 2;
    order = order.flatMap((seed) => [seed, next + 1 - seed]);
  }
  return order;
}

const matchKey = (bracket: BracketSide, round: number, position: number) =>
  bracket === "GRAND_FINAL" ? "GF" : `${bracket === "WINNERS" ? "W" : "L"}${round}-${position}`;

/**
 * Seeded single or double elimination for `entries` entrants (seed 0 is the strongest).
 * Double elimination has no bracket reset: the grand final is one match.
 * Byes go to the top seeds and are resolved here, so every returned match gets two real entrants.
 */
export function planBracket(entries: number, format: BracketFormat): PlannedMatch[] {
  const double = format === "DOUBLE_ELIMINATION";
  if (!Number.isInteger(entries) || entries < (double ? 3 : 2)) {
    throw new RangeError(`${format} needs at least ${double ? 3 : 2} entries`);
  }
  let size = 2;
  while (size < entries) size *= 2;
  const rounds = Math.log2(size);

  const drafts = new Map<string, Draft>();
  const add = (bracket: BracketSide, round: number, position: number) => {
    const key = matchKey(bracket, round, position);
    drafts.set(key, { key, bracket, round, position, slots: { A: FEED, B: FEED }, winnerTo: null, loserTo: null });
    return drafts.get(key)!;
  };
  const get = (bracket: BracketSide, round: number, position: number) => drafts.get(matchKey(bracket, round, position))!;
  const ref = (bracket: BracketSide, round: number, position: number, slot: Slot): SlotRef => ({ match: matchKey(bracket, round, position), slot });

  // Winners bracket.
  const order = seedOrder(size);
  for (let round = 1; round <= rounds; round++) {
    for (let position = 1; position <= size / 2 ** round; position++) add("WINNERS", round, position);
  }
  const seedSlot = (seed: number): SlotValue => (seed <= entries ? { kind: "entry", entry: seed - 1 } : BYE);
  for (let position = 1; position <= size / 2; position++) {
    get("WINNERS", 1, position).slots = { A: seedSlot(order[2 * position - 2]), B: seedSlot(order[2 * position - 1]) };
  }
  for (let round = 1; round < rounds; round++) {
    for (let position = 1; position <= size / 2 ** round; position++) {
      get("WINNERS", round, position).winnerTo = ref("WINNERS", round + 1, Math.ceil(position / 2), position % 2 ? "A" : "B");
    }
  }

  if (double) {
    add("GRAND_FINAL", 1, 1);
    get("WINNERS", rounds, 1).winnerTo = { match: "GF", slot: "A" };
    // Losers bracket: for each stage j a "minor" round (losers bracket survivors pair up) and a "major" round
    // (survivors meet the losers of winners round j+1, in reversed order on odd stages to avoid instant rematches).
    for (let stage = 1; stage < rounds; stage++) {
      const count = size / 2 ** (stage + 1);
      const minor = 2 * stage - 1;
      const major = 2 * stage;
      for (let position = 1; position <= count; position++) {
        add("LOSERS", minor, position);
        add("LOSERS", major, position);
      }
      for (let position = 1; position <= count; position++) {
        const [feederA, feederB] = stage === 1
          ? [get("WINNERS", 1, 2 * position - 1), get("WINNERS", 1, 2 * position)]
          : [get("LOSERS", minor - 1, 2 * position - 1), get("LOSERS", minor - 1, 2 * position)];
        const link = stage === 1 ? "loserTo" : "winnerTo";
        feederA[link] = ref("LOSERS", minor, position, "A");
        feederB[link] = ref("LOSERS", minor, position, "B");
        get("LOSERS", minor, position).winnerTo = ref("LOSERS", major, position, "A");
        const dropTo = stage % 2 ? count + 1 - position : position;
        get("WINNERS", stage + 1, position).loserTo = ref("LOSERS", major, dropTo, "B");
      }
    }
    get("LOSERS", 2 * (rounds - 1), 1).winnerTo = { match: "GF", slot: "B" };
  }

  resolveByes(drafts);

  return [...drafts.values()].map(({ slots, ...match }) => ({
    ...match,
    entryA: slots.A.kind === "entry" ? slots.A.entry : null,
    entryB: slots.B.kind === "entry" ? slots.B.entry : null,
  }));
}

/**
 * Removes every match with a bye until none is left: the other side advances to the winner's slot
 * (a known entrant is placed there; a pending one has its feeding link re-pointed) and the loser's slot becomes a bye.
 */
function resolveByes(drafts: Map<string, Draft>) {
  const setSlot = (target: SlotRef | null, value: SlotValue) => {
    if (target) drafts.get(target.match)!.slots[target.slot] = value;
  };
  for (;;) {
    const match = [...drafts.values()].find((draft) => draft.slots.A.kind === "bye" || draft.slots.B.kind === "bye");
    if (!match) return;
    const otherSlot: Slot = match.slots.A.kind === "bye" ? "B" : "A";
    const other = match.slots[otherSlot];
    drafts.delete(match.key);
    if (other.kind === "feed") {
      if (!match.winnerTo) throw new Error(`${match.key}: a final cannot hold a bye`);
      for (const draft of drafts.values()) {
        for (const link of ["winnerTo", "loserTo"] as const) {
          const target = draft[link];
          if (target?.match === match.key && target.slot === otherSlot) draft[link] = { ...match.winnerTo };
        }
      }
    } else {
      setSlot(match.winnerTo, other);
    }
    setSlot(match.loserTo, BYE);
  }
}
