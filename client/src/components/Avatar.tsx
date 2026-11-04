'use client';

import React from 'react';

export interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  showOnline?: boolean;
  className?: string;
}

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const dotSizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
};

export default function Avatar({
  initials,
  size = 'md',
  showOnline = false,
  className = '',
}: AvatarProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full font-semibold text-white uppercase select-none shrink-0 bg-gradient-to-br from-primary to-blue-700 shadow-sm ${sizeClasses[size]} ${className}`}
    >
      <span>{initials}</span>
      {showOnline && (
        <span
          className={`absolute bottom-0 right-0 rounded-full bg-online ring-2 ring-bg-main ${dotSizeClasses[size]}`}
          aria-label="Online status"
        />
      )}
    </div>
  );
}
