import { redirect } from "next/navigation";

/** Offline cups live in the tournaments hub now. */
export default function Page() {
  redirect("/events?type=offline");
}
