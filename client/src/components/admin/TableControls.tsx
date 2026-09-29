import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="relative block w-full sm:w-80">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-ink-subtle" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-line-strong bg-surface pr-9 pl-10 text-sm placeholder:text-ink-subtle focus:border-brand focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Xóa tìm kiếm"
          className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-ink-subtle hover:bg-white/5 hover:text-ink"
        >
          <X className="size-4" />
        </button>
      )}
    </label>
  );
}

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const buttonClassName =
    'grid size-9 place-items-center rounded-lg ring-1 ring-line-strong transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <nav aria-label="Phân trang" className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-ink-muted">
      <span>
        {from}–{to} / {total}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" className={buttonClassName} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Trang trước">
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-16 text-center tabular-nums">
          {page} / {pageCount}
        </span>
        <button type="button" className={buttonClassName} onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} aria-label="Trang sau">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}
