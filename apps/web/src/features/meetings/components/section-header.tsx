import type { ReactNode } from "react";

/** Shared header row for the cards on the meeting detail page. */
export function SectionHeader({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <span className="text-indigo-600">{icon}</span>
        {title}
      </h2>
      {action}
    </div>
  );
}
