import { cn } from '@/lib/cn';
import { getDateChipLabel } from '@/lib/format';

interface DateSelectorProps {
  dateKeys: string[];
  selectedDateKey: string;
  onSelect: (dateKey: string) => void;
}

export function DateSelector({ dateKeys, selectedDateKey, onSelect }: DateSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Chọn ngày chiếu" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {dateKeys.map((dateKey) => {
        const { weekday, dayMonth } = getDateChipLabel(dateKey);
        const isSelected = dateKey === selectedDateKey;
        return (
          <button
            key={dateKey}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(dateKey)}
            className={cn(
              'flex h-16 w-20 shrink-0 flex-col items-center justify-center rounded-xl ring-1 transition-all',
              isSelected
                ? 'bg-gradient-brand text-white shadow-glow ring-transparent'
                : 'bg-surface text-ink-muted ring-line-strong hover:text-ink hover:ring-white/30',
            )}
          >
            <span className="text-xs font-medium">{weekday}</span>
            <span className="mt-0.5 text-lg font-bold">{dayMonth}</span>
          </button>
        );
      })}
    </div>
  );
}
