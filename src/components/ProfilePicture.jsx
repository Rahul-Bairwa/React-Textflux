import React from 'react';

export const getUserProfilePicture = (user) => {
  if (!user) {
    return `https://ui-avatars.com/api/?name=User&background=random&size=96`;
  }
  if (user.profile_pic) {
    return user.profile_pic;
  }
  const name = user.name || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=96`;
};

export const ProfilePicture = ({ user, className = "w-full h-full rounded-full object-cover" }) => {
  const profilePicUrl = user.profile_pic ? user.profile_pic : getUserProfilePicture(user);
  return (
    <img
      src={profilePicUrl}
      alt={user?.name || 'User'}
      className={className}
      onError={(e) => {
        e.target.onerror = null;
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random&size=96`;
        e.target.src = fallbackUrl;
      }}
    />
  );
}; 