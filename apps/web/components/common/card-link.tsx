import Link from "next/link";

/**
 * Whole-card link: put `CARD_HOVER` on the Card and `<CardLink>` inside it. Buttons and other links in the card need
 * `ABOVE_CARD_LINK` to stay clickable. The card's title link stays the one keyboard and screen readers use.
 */
export const CARD_HOVER =
  "relative cursor-pointer transition-[background-color,box-shadow] hover:bg-muted/40 hover:ring-primary/50 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring";
export const ABOVE_CARD_LINK = "relative z-[2]";

export function CardLink({ href }: { href: string }) {
  return <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0 z-[1] rounded-[inherit]" />;
}
