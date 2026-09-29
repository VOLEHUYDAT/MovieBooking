import { Home, SearchX } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { getHomePath } from '@/app/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
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
  const { user } = useCurrentUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EmptyState
        icon={SearchX}
        title={title}
        description={description}
        action={
          <ButtonLink to={getHomePath(user?.role ?? null)}>
            <Home className="size-4" aria-hidden /> {user && user.role !== 'customer' ? 'Về trang làm việc' : 'Về trang chủ'}
          </ButtonLink>
        }
      />
    </div>
  );
}
