/**
 * Reusable avatar component for GroupRef objects.
 * Renders either an avatar image or a colored initial circle.
 * Replaces 7+ duplicate inline implementations across the codebase.
 */
interface GroupAvatarProps {
  group: {
    name?: string;
    avatar?: string;
    color?: string;
  };
  size?: 'xs' | 'sm';
  className?: string;
}

const sizeMap = {
  xs: 'w-5 h-5 min-w-5 min-h-5 shrink-0 aspect-square text-[8px]',
  sm: 'w-6 h-6 min-w-6 min-h-6 shrink-0 aspect-square text-[10px]',
} as const;

export const GroupAvatar = ({ group, size = 'sm', className = '' }: GroupAvatarProps) => {
  const sizeClasses = sizeMap[size];

  if (group.avatar) {
    return (
      <img loading="lazy"
        className={`${sizeClasses} rounded-full ring-1 ring-card object-cover ${className}`}
        src={group.avatar}
        alt={group.name || ''}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full ring-1 ring-card flex items-center justify-center font-bold text-foreground ${className}`}
      style={{ backgroundColor: (!group.color || group.color === '#bc9b59') ? 'hsl(var(--brand-color))' : group.color }}
    >
      {group.name?.charAt(0).toUpperCase()}
    </div>
  );
};
