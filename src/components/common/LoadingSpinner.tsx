import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  label = 'Loading...' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const borderSize = {
    sm: 'border-2',
    md: 'border-4',
    lg: 'border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div 
        className={`${sizeClasses[size]} ${borderSize[size]} border-t-transparent border-gray-200 rounded-full animate-spin`}
      />
      {label && (
        <span className="text-sm text-gray-500">{label}</span>
      )}
    </div>
  );
};

export default LoadingSpinner;