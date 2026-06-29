import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

type Status = "todo" | "doing" | "review" | "done";

export function BranchSelect({
  value,
  status,
  onChange,
  className,
}: {
  value: string | null;
  status: Status;
  onChange: (v: string) => void;
  className?: string;
}) {
  const locked = status === "review" || status === "done";
  const lockedValue = status === "review" ? "developer" : status === "done" ? "main" : null;

  const [text, setText] = useState<string>(value && value !== "developer" && value !== "main" ? value : "");

  useEffect(() => {
    if (locked) return;
    setText(value && value !== "developer" && value !== "main" ? value : "");
  }, [value, locked]);

  if (locked) {
    return (
      <div className={`text-xs px-2 py-1 rounded bg-muted text-foreground inline-block ${className ?? ""}`}>
        {lockedValue}
      </div>
    );
  }

  return (
    <Input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onChange(text)}
      placeholder="nome da branch"
      className={`h-7 text-xs w-40 ${className ?? ""}`}
    />
  );
}
