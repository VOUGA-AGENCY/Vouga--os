import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type OwnerProfile = { id: string; full_name: string };

export function OwnersMultiSelect({
  profiles,
  value,
  onChange,
  placeholder = "Sem dono",
  className,
  size = "sm",
}: {
  profiles: OwnerProfile[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const selected = profiles.filter((p) => value.includes(p.id));
  const label = selected.length
    ? selected.map((p) => p.full_name).join(", ")
    : placeholder;
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2 text-left text-xs hover:bg-muted/40",
          size === "sm" ? "h-7" : "h-8",
          !selected.length && "text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <ul className="max-h-72 overflow-auto">
          {profiles.map((p) => {
            const checked = value.includes(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <Checkbox checked={checked} className="pointer-events-none" />
                  <span className="truncate">{p.full_name}</span>
                </button>
              </li>
            );
          })}
          {!profiles.length && (
            <li className="px-2 py-1.5 text-xs text-muted-foreground">Sem pessoas</li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
