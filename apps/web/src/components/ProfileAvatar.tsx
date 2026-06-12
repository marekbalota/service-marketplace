import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { getInitials } from '#/lib/format'

export function ProfileAvatar({
  name,
  imageUrl,
  className,
  fallbackClassName,
}: {
  name: string
  imageUrl?: string
  className?: string
  fallbackClassName?: string
}) {
  return (
    <Avatar className={className}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
      <AvatarFallback
        className={
          fallbackClassName ?? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white'
        }
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
