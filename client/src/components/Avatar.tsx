'use client';

import React from 'react';

export interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export default function Avatar({
  initials,
  size = 'md',
  className = '',
}: AvatarProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full font-semibold text-white uppercase select-none shrink-0 bg-gradient-to-br from-primary to-blue-700 shadow-sm ${sizeClasses[size]} ${className}`}
    >
      <span>{initials}</span>
    </div>
  );
}
