import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { getInitials } from '#/lib/format'

export function ProfileAvatar({
  name,
  className,
  fallbackClassName,
}: {
  name: string
  className?: string
  fallbackClassName?: string
}) {
  return (
    <Avatar className={className}>
      <AvatarFallback
        className={
          fallbackClassName ??
          'bg-gradient-to-br from-[var(--lagoon)] to-[var(--lagoon-deep)] text-white'
        }
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
