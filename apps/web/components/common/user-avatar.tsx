import { createAvatar } from "@dicebear/core";
import * as pixelArt from "@dicebear/pixel-art";
import * as shapes from "@dicebear/shapes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export type AvatarKind = "player" | "team";

const BACKGROUNDS = ["1e3a5f", "3b2a5c", "1f4d3a", "5c2a3a", "4a3b1c", "25415c"];
const cache = new Map<string, string>();

/** A stable generated picture per name: pixel-art characters for players, abstract shapes for teams and communities. */
function generatedAvatar(name: string, kind: AvatarKind) {
  const key = `${kind}:${name}`;
  let uri = cache.get(key);
  if (!uri) {
    uri = kind === "team"
      ? createAvatar(shapes, { seed: name }).toDataUri()
      : createAvatar(pixelArt, { seed: name, backgroundColor: BACKGROUNDS }).toDataUri();
    cache.set(key, uri);
  }
  return uri;
}

/** Uploaded picture when there is one, otherwise a generated one. */
export function UserAvatar({ name, imageKey, kind = "player", className }: { name: string; imageKey?: string | null; kind?: AvatarKind; className?: string }) {
  const src = mediaUrl(imageKey);
  return (
    <Avatar className={cn("size-9", className)}>
      {src && <AvatarImage src={src} alt="" className="object-cover" />}
      <AvatarFallback className="overflow-hidden">
        <img src={generatedAvatar(name, kind)} alt="" className="size-full" />
      </AvatarFallback>
    </Avatar>
  );
}
