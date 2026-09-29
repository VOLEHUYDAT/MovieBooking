import { LoaderCircle } from 'lucide-react';

export function PageLoader({ label = 'Đang tải...' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-ink-muted">
      <LoaderCircle className="size-8 animate-spin text-brand" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}
