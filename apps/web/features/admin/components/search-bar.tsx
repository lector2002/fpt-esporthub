"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminMessages } from "../messages";

/** Submits on Enter or the button so each keystroke does not hit the API. */
export function SearchBar({ placeholder, onSearch }: { placeholder: string; onSearch: (q: string) => void }) {
  const { t } = useAdminMessages();
  const [value, setValue] = useState("");

  return (
    <form
      role="search"
      className="flex min-w-0 flex-1 gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
    >
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={100}
        className="min-w-0 flex-1"
      />
      <Button type="submit" variant="outline" aria-label={t("search")}>
        <Search />
      </Button>
    </form>
  );
}
