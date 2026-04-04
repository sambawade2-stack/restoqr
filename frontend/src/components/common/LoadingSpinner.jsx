import clsx from 'clsx'

export default function LoadingSpinner({ size = 'md', className = '' }) {
  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <div className={clsx(
        'animate-spin rounded-full border-2 border-gray-200 border-t-primary-500',
        size === 'sm'  && 'w-4 h-4',
        size === 'md'  && 'w-8 h-8',
        size === 'lg'  && 'w-12 h-12',
      )} />
    </div>
  )
}
