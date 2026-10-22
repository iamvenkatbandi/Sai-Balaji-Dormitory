export function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-card border border-line bg-surface px-5 py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-ink">
        <span>{question}</span>
        <span aria-hidden className="text-muted transition group-open:rotate-45">+</span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-muted">{answer}</p>
    </details>
  );
}