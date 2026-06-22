import { avatarGradient, initials } from '../lib/format'

interface AvatarProps {
  name: string
  size?: number
  ring?: boolean
}

/** Kruhový avatar s iniciálami a deterministickým gradientem. */
export function Avatar({ name, size = 36, ring }: AvatarProps): JSX.Element {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${
        ring ? 'ring-2 ring-white' : ''
      }`}
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
