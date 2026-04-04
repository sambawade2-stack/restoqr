import { STATUS_COLORS, STATUS_LABELS } from '../../utils/format'
import clsx from 'clsx'

export default function StatusBadge({ status, size = 'sm' }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending

  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 font-semibold rounded-full',
      size === 'sm'  && 'px-2.5 py-0.5 text-xs',
      size === 'md'  && 'px-3 py-1 text-sm',
      c.bg, c.text
    )}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', c.dot)} />
      {STATUS_LABELS[status] || status}
    </span>
  )
}
