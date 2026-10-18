import Image from 'next/image';
import logo from '../logo.jpg';

interface SiteLogoProps {
  size?: number;
  priority?: boolean;
  className?: string;
}

/**
 * نشان سامانه؛ از فایل logo.jpg در ریشه‌ی پروژه استفاده می‌کند.
 */
export function SiteLogo({ size = 40, priority = false, className = '' }: SiteLogoProps) {
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/80 bg-white shadow-lg shadow-orange-600/20 ring-1 ring-black/5 dark:border-white/15 dark:ring-white/10 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={logo}
        alt="لوگوی سامانه ارزیاب پایان‌نامه"
        width={size}
        height={size}
        priority={priority}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
