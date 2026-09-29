import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, LockOpen, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ROLE_LABELS, USER_ROLES } from '@shared/lib/permissions';
import type { PaginatedResponse, UpdateUserRequest } from '@shared/types/api';
import type { User, UserRole } from '@shared/types/domain';
import { adminApi, queryKeys } from '@/api/endpoints';
import { getErrorMessage } from '@/api/httpClient';
import { Pagination, SearchInput } from '@/components/admin/TableControls';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/cn';
import { formatShortDate } from '@/lib/format';

const PAGE_SIZE = 10;

type PendingChange = { user: User; changes: UpdateUserRequest; summary: string };

export function AdminUsersPage() {
  useDocumentTitle('Quản trị · Người dùng');
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [page, setPage] = useState(1);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim());

  const query = { search: debouncedSearch || undefined, role: role || undefined, page, pageSize: PAGE_SIZE };
  const { data, isPending, isFetching } = useQuery({
    queryKey: queryKeys.adminUsers(query),
    queryFn: ({ signal }) => adminApi.users(query, signal),
    placeholderData: keepPreviousData,
  });

  const updateUser = useMutation({
    mutationFn: ({ userId, changes }: { userId: string; changes: UpdateUserRequest }) => adminApi.updateUser(userId, changes),
    onSuccess: ({ user }) => {
      toast.success(`Đã cập nhật tài khoản ${user.fullName}`);
      // Reflect the server's answer immediately, then refresh in the background.
      queryClient.setQueriesData<PaginatedResponse<User>>({ queryKey: ['admin', 'users'] }, (page) =>
        page ? { ...page, items: page.items.map((item) => (item.id === user.id ? user : item)) } : page,
      );
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => setPendingChange(null),
  });

  return (
    <section aria-label="Quản lý người dùng" className="rounded-2xl border border-line bg-surface">
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Tìm theo tên, email, số điện thoại..."
        />
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          Vai trò
          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value as UserRole | '');
              setPage(1);
            }}
            className="h-10 rounded-xl border border-line-strong bg-surface px-3 text-sm text-ink focus:border-brand focus:outline-none"
          >
            <option value="">Tất cả</option>
            {USER_ROLES.map((item) => (
              <option key={item} value={item}>
                {ROLE_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isPending ? (
        <PageLoader />
      ) : !data || data.items.length === 0 ? (
        <EmptyState className="mx-5 mb-5" icon={Users} title="Không tìm thấy người dùng" description="Thử từ khóa hoặc bộ lọc khác." />
      ) : (
        <>
          <div className={cn('overflow-x-auto transition-opacity', isFetching && 'opacity-60')}>
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs text-ink-subtle uppercase">
                <tr className="border-y border-line">
                  <th className="px-5 py-2.5 font-semibold">Người dùng</th>
                  <th className="px-5 py-2.5 font-semibold">Số điện thoại</th>
                  <th className="px-5 py-2.5 font-semibold">Ngày tạo</th>
                  <th className="px-5 py-2.5 font-semibold">Vai trò</th>
                  <th className="px-5 py-2.5 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <p className="font-medium">
                          {user.fullName} {isSelf && <span className="text-xs text-brand">(bạn)</span>}
                        </p>
                        <p className="text-xs text-ink-muted">{user.email}</p>
                      </td>
                      <td className="px-5 py-3 text-ink-muted tabular-nums">{user.phone}</td>
                      <td className="px-5 py-3 text-ink-muted">{formatShortDate(user.createdAt)}</td>
                      <td className="px-5 py-3">
                        <label className="sr-only" htmlFor={`role-${user.id}`}>
                          Vai trò của {user.fullName}
                        </label>
                        <select
                          id={`role-${user.id}`}
                          value={user.role}
                          disabled={isSelf || updateUser.isPending}
                          title={isSelf ? 'Bạn không thể đổi vai trò của chính mình' : undefined}
                          onChange={(event) => {
                            const nextRole = event.target.value as UserRole;
                            setPendingChange({
                              user,
                              changes: { role: nextRole },
                              summary: `Đổi vai trò của ${user.fullName} từ "${ROLE_LABELS[user.role]}" thành "${ROLE_LABELS[nextRole]}"?`,
                            });
                          }}
                          className="h-9 rounded-lg border border-line-strong bg-surface-raised px-2.5 text-sm focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {USER_ROLES.map((item) => (
                            <option key={item} value={item}>
                              {ROLE_LABELS[item]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <Button
                          size="sm"
                          variant={user.isLocked ? 'secondary' : 'ghost'}
                          disabled={isSelf || updateUser.isPending}
                          onClick={() =>
                            setPendingChange({
                              user,
                              changes: { isLocked: !user.isLocked },
                              summary: user.isLocked
                                ? `Mở khóa tài khoản ${user.fullName}? Người dùng có thể đăng nhập lại.`
                                : `Khóa tài khoản ${user.fullName}? Người dùng sẽ bị đăng xuất khỏi mọi thiết bị.`,
                            })
                          }
                        >
                          {user.isLocked ? (
                            <>
                              <Lock className="size-4 text-red-400" aria-hidden /> Đã khóa
                            </>
                          ) : (
                            <>
                              <LockOpen className="size-4 text-emerald-400" aria-hidden /> Hoạt động
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        isOpen={pendingChange !== null}
        icon={pendingChange?.changes.isLocked ? Lock : Users}
        tone={pendingChange?.changes.isLocked ? 'danger' : 'brand'}
        title="Xác nhận thay đổi quyền truy cập"
        description={pendingChange?.summary}
        confirmLabel={updateUser.isPending ? 'Đang lưu...' : 'Xác nhận'}
        cancelLabel="Hủy"
        onCancel={() => setPendingChange(null)}
        onConfirm={() => {
          if (pendingChange && !updateUser.isPending) {
            updateUser.mutate({ userId: pendingChange.user.id, changes: pendingChange.changes });
          }
        }}
      />
    </section>
  );
}
