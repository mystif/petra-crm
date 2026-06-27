import { avatarGradient, initials } from '../lib/format'

interface AvatarProps {
  name: string
  size?: number
  ring?: boolean
  src?: string | null
}

/** Kruhový avatar — když je `src`, zobrazí fotku, jinak iniciály s gradientem. */
export function Avatar({ name, size = 36, ring, src }: AvatarProps): JSX.Element {
  const ringCls = ring ? 'ring-2 ring-white' : ''
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`shrink-0 rounded-full object-cover ${ringCls}`}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${ringCls}`}
      style={{
        width: size,
        height: size,
        background: avatarGradient(name),
        fontSize: size * 0.36
      }}
      title={name}
    >
      {initials(name)}
    </div>
  )
}
