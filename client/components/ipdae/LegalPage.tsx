import type { ReactNode } from "react";
import MobileShell from "./MobileShell";
import SubHeader from "./SubHeader";

/** One numbered clause of 이용약관 / 개인정보처리방침. */
export function Clause({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[15px] font-bold">{title}</h2>
      <div className="flex flex-col gap-2 text-[13.5px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

/** Bulleted points inside a clause. */
export function Points({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-outside list-disc flex-col gap-1.5 pl-4">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** A table of 항목 / 설명 rows, for the collected-data lists. */
export function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="flex flex-col gap-2 rounded-xl bg-card px-3.5 py-3">
      {rows.map(([term, desc]) => (
        <div key={term} className="flex flex-col gap-0.5">
          <dt className="text-[13px] font-bold text-foreground">{term}</dt>
          <dd className="text-[13px] leading-relaxed">{desc}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Shell for the 이용약관 / 개인정보처리방침 pages. */
export default function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <MobileShell className="pb-14">
      <SubHeader title={title} />
      <main className="flex flex-col gap-6 px-5 pt-1">
        <div className="flex flex-col gap-1.5 border-b pb-5">
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            {intro}
          </p>
          <p className="text-xs text-ink-icon">시행일 {updated}</p>
        </div>
        {children}
      </main>
    </MobileShell>
  );
}
