import { useState, useEffect } from 'react';

const sizeMap = {
  xs: 'h-6 w-6 text-[10px] rounded-md',
  sm: 'h-8 w-8 text-xs rounded-lg',
  md: 'h-9 w-9 text-sm rounded-xl',
  lg: 'h-10 w-10 text-sm rounded-xl',
  xl: 'h-12 w-12 text-base rounded-2xl',
  '2xl': 'h-14 w-14 text-xl rounded-2xl',
};

export const getDisplayName = (user, name) => {
  if (typeof name === 'string' && name.trim()) return name.trim();
  if (!user) return '';
  if (typeof user === 'string' && user.trim()) return user.trim();

  // 1. Check user.full_name or nested user.user.full_name
  const fullName =
    user.full_name ||
    user.user?.full_name ||
    user.name ||
    user.user?.name ||
    user.display_name ||
    user.user?.display_name;

  if (fullName && typeof fullName === 'string' && fullName.trim()) {
    return fullName.trim();
  }

  // 2. Check username
  const username = user.username || user.user?.username;
  if (username && typeof username === 'string' && username.trim()) {
    return username.trim();
  }

  // 3. Check email prefix
  const email = user.email || user.user?.email;
  if (email && typeof email === 'string' && email.trim()) {
    return email.trim().split('@')[0];
  }

  return '';
};

export const getAvatarInitial = (user, name) => {
  const displayName = getDisplayName(user, name);
  if (!displayName) return 'U';
  return displayName.charAt(0).toUpperCase();
};

export const getAvatarImageUrl = (user, src) => {
  if (src && typeof src === 'string' && src.trim()) return src.trim();
  if (!user) return null;
  return (
    user.avatar_url ||
    user.user?.avatar_url ||
    user.profile_image_url ||
    user.user?.profile_image_url ||
    user.avatar ||
    user.user?.avatar ||
    user.image ||
    user.user?.image ||
    null
  );
};

const Avatar = ({
  user,
  name,
  src,
  size = 'md',
  className = '',
  alt,
  variant = 'indigo',
}) => {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getAvatarImageUrl(user, src);
  const displayName = getDisplayName(user, name);
  const initial = getAvatarInitial(user, name);

  // Reset image error state if imageUrl changes
  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  const sizeClass = sizeMap[size] || sizeMap.md;

  if (imageUrl && !imageError) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-center ${sizeClass} ${className}`}
      >
        <img
          src={imageUrl}
          alt={alt || displayName || 'User Avatar'}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center font-bold uppercase select-none transition-colors shadow-2xs ${
        variant === 'indigo'
          ? 'bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-300'
          : variant === 'indigo-solid'
          ? 'bg-indigo-600 text-white shadow-xs'
          : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
      } ${sizeClass} ${className}`}
      title={displayName || 'User'}
      aria-label={displayName || 'User Avatar'}
    >
      <span>{initial}</span>
    </div>
  );
};

export default Avatar;
