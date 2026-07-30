/** Football season label from an in-world date, e.g. Aug 2024 -> "2024/25". */
export function seasonLabelOf(date: Date): string {
  const year = date.getUTCFullYear();
  const startYear = date.getUTCMonth() >= 6 ? year : year - 1;
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;
}
