import Link from "next/link";
import { CardLink } from "@/components/common/card-link";

/** A table row that opens a detail page. Put `<RowLink>` around the row's name; controls in the row need `ABOVE_CARD_LINK`. */
export const LINKED_ROW = "relative cursor-pointer has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring";

export function RowLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <>
      <CardLink href={href} />
      <Link href={href} aria-label={label} className="focus-visible:outline-none">
        {children}
      </Link>
    </>
  );
}
