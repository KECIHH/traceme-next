import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  description,
  eyebrow,
  action,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <section
      className={`min-w-0 space-y-4 rounded-md border border-zinc-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-sm font-medium text-emerald-700">{eyebrow}</p>
          ) : null}
          <h2 className="mt-1 break-words text-xl font-semibold tracking-tight text-zinc-950">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 break-words text-sm leading-6 text-zinc-600">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
