/**
 * Format a Date as DD/MM/YYYY (Thai Buddhist era, e.g. 02/03/2569)
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('th-TH', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  })
}
