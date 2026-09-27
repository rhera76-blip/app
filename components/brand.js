import { MessageSquareText } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ className, light = false, size = 'md' }) {
  const s = size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'
  const t = size === 'lg' ? 'text-2xl' : 'text-lg'
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(s, 'rounded-lg flex items-center justify-center shadow-sm', light ? 'bg-white/20 text-white' : 'bg-primary text-primary-foreground')}>
        <MessageSquareText className="h-[60%] w-[60%]" />
      </div>
      <span className={cn('font-bold tracking-tight', t, light ? 'text-white' : 'text-foreground')}>
        BABEH<span className={light ? 'text-indigo-200' : 'text-primary'}>CHAT</span>in
      </span>
    </div>
  )
}
