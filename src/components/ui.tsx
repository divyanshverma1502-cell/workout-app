import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("rounded-lg border border-line bg-white/[0.045] p-4 shadow-glow backdrop-blur md:p-5", className)}
      {...props}
    />
  );
}

export function MetricCard({
  label,
  value,
  detail,
  accent = "lift",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  accent?: "lift" | "amber" | "sky" | "rose";
}) {
  const accents = {
    lift: "text-lift",
    amber: "text-amber",
    sky: "text-sky-300",
    rose: "text-rose-300",
  };

  return (
    <div className="min-h-28 rounded-lg border border-line bg-panel/80 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-steel">{label}</p>
      <div className={cn("mt-2 text-3xl font-semibold", accents[accent])}>{value}</div>
      {detail ? <div className="mt-2 text-sm text-slate-300">{detail}</div> : null}
    </div>
  );
}

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-sm font-semibold transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    />
  );
}

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button {...props} className={cn("bg-lift text-coal hover:bg-emerald-300", props.className)} />;
}

export function GhostButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      {...props}
      className={cn("border-line bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]", props.className)}
    />
  );
}

export function IconButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-grid h-11 w-11 place-items-center rounded-lg border border-line bg-white/[0.04] text-slate-100 transition hover:bg-white/[0.08] active:scale-95 disabled:opacity-45",
        className,
      )}
      {...props}
    />
  );
}

export function Field(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "min-h-12 w-full rounded-lg border border-line bg-coal/80 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-lift/70 focus:ring-2 focus:ring-lift/15",
        props.className,
      )}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-20 w-full resize-none rounded-lg border border-line bg-coal/80 px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-lift/70 focus:ring-2 focus:ring-lift/15",
        props.className,
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "min-h-12 w-full rounded-lg border border-line bg-coal/80 px-3 text-sm text-slate-100 outline-none transition focus:border-lift/70 focus:ring-2 focus:ring-lift/15",
        props.className,
      )}
    />
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-line bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lift">{eyebrow}</p> : null}
        <h2 className="mt-1 text-xl font-semibold text-slate-50 md:text-2xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
