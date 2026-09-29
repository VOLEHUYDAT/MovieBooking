import { Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router';

export function AppFooter() {
  return (
    <footer className="print-hidden mt-20 border-t border-line bg-surface/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <p className="text-lg font-black tracking-tight">
            Lumina<span className="text-gradient-brand">Cinema</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
            Trải nghiệm điện ảnh đỉnh cao với màn hình IMAX, âm thanh vòm và ghế đôi êm ái.
          </p>
        </div>

        <div>
          <p className="text-sm font-bold">Khám phá</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            <li>
              <Link to="/" className="hover:text-ink">
                Phim đang chiếu
              </Link>
            </li>
            <li>
              <Link to="/?tab=coming-soon" className="hover:text-ink">
                Phim sắp chiếu
              </Link>
            </li>
            <li>
              <Link to="/cinemas" className="hover:text-ink">
                Hệ thống rạp
              </Link>
            </li>
            <li>
              <Link to="/tickets" className="hover:text-ink">
                Vé của tôi
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-bold">Liên hệ</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0" aria-hidden /> 1900 6868 (8:00 - 22:00)
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 shrink-0" aria-hidden /> hotro@lumina.example
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" aria-hidden /> 5 cụm rạp tại 3 thành phố
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-ink-subtle">
        © {new Date().getFullYear()} Lumina Cinema · Dự án demo, mọi phim và dữ liệu đều là hư cấu.
      </div>
    </footer>
  );
}
