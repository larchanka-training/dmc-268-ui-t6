interface FlowProps {
  steps: { title: string; text: string }[]
}

/** A simple left-to-right diagram of numbered steps, used for "how it works". */
export function Flow({ steps }: FlowProps) {
  return (
    <ol className="not-prose my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, i) => (
        <li key={step.title} className="glass relative rounded-2xl p-4">
          <span className="font-mono text-xs text-[var(--glow)]">
            {String(i + 1).padStart(2, '0')}
          </span>
          <p className="mt-1 text-sm font-semibold text-fd-foreground">{step.title}</p>
          <p className="mt-1 text-[13px] leading-snug text-fd-muted-foreground">{step.text}</p>
        </li>
      ))}
    </ol>
  )
}
