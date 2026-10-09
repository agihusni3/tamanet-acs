import React from 'react';
import { Activity, Wifi, Globe, Shield, Server, Zap, Radio } from 'lucide-react';
import { BrandSettings } from '../context/AppContext';

interface BrandLogoProps {
  branding: BrandSettings;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ branding, size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-7 h-7 rounded-lg text-xs',
    md: 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-sm',
    lg: 'w-12 h-12 rounded-2xl text-base',
    xl: 'w-16 h-16 rounded-3xl text-xl',
  };

  const iconSizeMap = {
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5 sm:w-5 sm:h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  if (branding.logoType === 'image' && branding.logoImageUrl) {
    return (
      <div
        className={`${sizeMap[size]} flex items-center justify-center overflow-hidden bg-slate-800 border border-slate-700/80 shadow-md ${className}`}
      >
        <img
          src={branding.logoImageUrl}
          alt={branding.appName}
          className="w-full h-full object-contain p-0.5"
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  const renderIcon = () => {
    const iconClass = `${iconSizeMap[size]}`;
    switch (branding.logoIcon) {
      case 'wifi':
        return <Wifi className={iconClass} />;
      case 'globe':
        return <Globe className={iconClass} />;
      case 'shield':
        return <Shield className={iconClass} />;
      case 'server':
        return <Server className={iconClass} />;
      case 'zap':
        return <Zap className={iconClass} />;
      case 'radio':
        return <Radio className={iconClass} />;
      case 'activity':
      default:
        return <Activity className={iconClass} />;
    }
  };

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${branding.logoColor && branding.logoColor !== '#3B82F6' ? branding.logoColor : '#334155'} 0%, #0f172a 100%)`,
      }}
      className={`${sizeMap[size]} flex items-center justify-center text-white border border-slate-700/80 shadow-xs shrink-0 ${className}`}
    >
      {renderIcon()}
    </div>
  );
};
