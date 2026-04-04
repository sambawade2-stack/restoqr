/**
 * Format a number as currency: 8000 → "8 000 FCFA"
 */
export function formatCurrency(amount, currency = 'FCFA') {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency
}

/**
 * Format ISO date to readable: "2024-01-15T10:30:00Z" → "15 jan. 10:30"
 */
export function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

export const STATUS_COLORS = {
  pending:   { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  accepted:  { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  preparing: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  ready:     { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  served:    { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  paid:      { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
  closed:    { bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-300' },
  cancelled: { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
}

export const STATUS_LABELS = {
  pending:   'En Attente',
  accepted:  'Acceptée',
  preparing: 'En Préparation',
  ready:     'Prête',
  served:    'Servie',
  paid:      'Payée',
  closed:    'Clôturée',
  cancelled: 'Annulée',
}
