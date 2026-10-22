import { formatCurrencyINR } from '../lib/format';

export interface LineItem { label: string; detail?: string; amountPaise: number; muted?: boolean; }

export function PriceBreakdown({ items, total }: { items: LineItem[]; total: number | null }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <dl className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-4 text-sm">
            <div>
              <dt className={item.muted ? 'text-muted' : 'text-ink'}>{item.label}</dt>
              {item.detail && <p className="text-xs text-muted">{item.detail}</p>}
            </div>
            <dd className={`tabular-nums ${item.muted ? 'text-muted' : 'text-ink'}`}>
              {formatCurrencyINR(item.amountPaise)}
            </dd>
          </div>
        ))}
        <div className="border-t border-line pt-3">
          <div className="flex items-center justify-between text-base font-semibold text-ink">
            <dt>Total</dt>
            <dd className="tabular-nums">{total == null ? '—' : formatCurrencyINR(total)}</dd>
          </div>
        </div>
      </dl>
    </div>
  );
}