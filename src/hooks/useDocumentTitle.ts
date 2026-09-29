import { useEffect } from 'react';

const APP_NAME = 'Lumina Cinema';

export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : `${APP_NAME} · Đặt vé xem phim`;
  }, [title]);
}
