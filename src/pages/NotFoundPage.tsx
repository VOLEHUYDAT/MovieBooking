import { Home, SearchX } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface NotFoundPageProps {
  title?: string;
  description?: string;
}

export function NotFoundPage({
  title = 'Không tìm thấy trang',
  description = 'Đường dẫn không tồn tại hoặc đã được thay đổi.',
}: NotFoundPageProps) {
  useDocumentTitle(title);

  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EmptyState
        icon={SearchX}
        title={title}
        description={description}
        action={
          <ButtonLink to="/">
            <Home className="size-4" aria-hidden /> Về trang chủ
          </ButtonLink>
        }
      />
    </div>
  );
}
