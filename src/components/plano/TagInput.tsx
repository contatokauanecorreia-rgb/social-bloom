import { useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { TagChip } from "./TagChip";

export function TagInput({
  value,
  onChange,
  placeholder = "Digite e pressione Enter...",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (trimmed.length > 40) return;
    if (value.includes(trimmed)) {
      setDraft("");
      return;
    }
    if (value.length >= 15) return;
    onChange([...value, trimmed]);
    setDraft("");
  };

  const remove = (label: string) => {
    onChange(value.filter((t) => t !== label));
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div className="rounded-md border bg-background p-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <TagChip key={tag} label={tag} onRemove={() => remove(tag)} />
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={add}
        placeholder={placeholder}
        className="mt-1.5 h-8 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
