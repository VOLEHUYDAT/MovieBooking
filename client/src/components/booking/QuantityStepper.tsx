import { Minus, Plus } from 'lucide-react';

interface QuantityStepperProps {
  value: number;
  max: number;
  itemName: string;
  onChange: (value: number) => void;
}

export function QuantityStepper({ value, max, itemName, onChange }: QuantityStepperProps) {
  const buttonClassName =
    'grid size-9 place-items-center rounded-lg text-ink transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30';

  return (
    <div className="inline-flex items-center rounded-xl bg-surface-raised p-0.5 ring-1 ring-line-strong">
      <button
        type="button"
        className={buttonClassName}
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        aria-label={`Giảm số lượng ${itemName}`}
      >
        <Minus className="size-4" />
      </button>
      <output className="w-8 text-center text-sm font-bold tabular-nums" aria-live="polite" aria-label={`Số lượng ${itemName}`}>
        {value}
      </output>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`Tăng số lượng ${itemName}`}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
