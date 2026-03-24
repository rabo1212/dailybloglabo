import { Edition } from "@/lib/types";

interface EditionBadgeProps {
  edition: Edition;
}

export default function EditionBadge({ edition }: EditionBadgeProps) {
  const isAm = edition === "am";

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        ${isAm
          ? "bg-amber-500/10 text-amber-400"
          : "bg-indigo-500/10 text-indigo-400"
        }
      `}
    >
      {isAm ? "Morning" : "Evening"}
    </span>
  );
}
