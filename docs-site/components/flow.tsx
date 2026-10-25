interface FlowProps {
  steps: { title: string; text: string }[]
}

/** Numbered steps: cards in a row on wide screens, a compact list on phones. */
export function Flow({ steps }: FlowProps) {
  return (
    <ol className="not-prose my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, i) => (
        <li
          key={step.title}
          className="flex gap-3 sm:block sm:rounded-[10px] sm:border sm:border-[var(--border)] sm:bg-[var(--surface)] sm:p-4"
        >
          <span className="shrink-0 pt-0.5 font-mono text-xs text-[var(--glow)]">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div>
            <p className="text-sm font-semibold text-fd-foreground sm:mt-1">{step.title}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-fd-muted-foreground">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
