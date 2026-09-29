import type { Cinema, City } from '../types/domain';

/** Demo cinema chain. Names and addresses are fictional. */
export const CINEMAS: Cinema[] = [
  {
    id: 'lumina-nguyen-hue',
    name: 'Lumina Nguyễn Huệ',
    address: 'Tầng 5, 68 Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh',
    city: 'TP. Hồ Chí Minh',
    hotline: '1900 6868',
    auditoriumCount: 8,
    hasImax: true,
  },
  {
    id: 'lumina-thao-dien',
    name: 'Lumina Thảo Điền',
    address: 'Tầng 3, 12 Quốc Hương, Phường An Khánh, TP. Hồ Chí Minh',
    city: 'TP. Hồ Chí Minh',
    hotline: '1900 6868',
    auditoriumCount: 6,
    hasImax: false,
  },
  {
    id: 'lumina-hoan-kiem',
    name: 'Lumina Hoàn Kiếm',
    address: 'Tầng 4, 25 Tràng Tiền, Phường Hoàn Kiếm, Hà Nội',
    city: 'Hà Nội',
    hotline: '1900 6869',
    auditoriumCount: 7,
    hasImax: true,
  },
  {
    id: 'lumina-cau-giay',
    name: 'Lumina Cầu Giấy',
    address: 'Tầng 6, 88 Trần Thái Tông, Phường Cầu Giấy, Hà Nội',
    city: 'Hà Nội',
    hotline: '1900 6869',
    auditoriumCount: 6,
    hasImax: false,
  },
  {
    id: 'lumina-song-han',
    name: 'Lumina Sông Hàn',
    address: 'Tầng 3, 30 Bạch Đằng, Phường Hải Châu, Đà Nẵng',
    city: 'Đà Nẵng',
    hotline: '1900 6870',
    auditoriumCount: 5,
    hasImax: false,
  },
];

export const CITIES: City[] = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng'];

const cinemasById = new Map(CINEMAS.map((cinema) => [cinema.id, cinema]));

export function getCinemaById(cinemaId: string): Cinema | undefined {
  return cinemasById.get(cinemaId);
}
