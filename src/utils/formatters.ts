export function formatCurrency(amount: number, currency = 'AED'): string {
  const formatted = Math.abs(amount).toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}${currency} ${formatted}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateInput(dateStr: string): string {
  return dateStr;
}

export function getMonthIndex(monthName: string): number {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return months.indexOf(monthName);
}

export function getCurrentMonth(): string {
  const now = new Date();
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return months[now.getMonth()];
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}
