'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/plan',
    label: 'Heute',
    emoji: '📅',
  },
  {
    href: '/einkaufsliste',
    label: 'Einkaufen',
    emoji: '🛒',
  },
  {
    href: '/favoriten',
    label: 'Favoriten',
    emoji: '❤️',
  },
  {
    href: '/profil',
    label: 'Ich',
    emoji: '👤',
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom lg:hidden">
      <div className="flex items-center justify-around py-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-3 px-5 rounded-xl transition-all touch-manipulation ${
                isActive 
                  ? 'bg-teal-50' 
                  : ''
              }`}
            >
              <span className={`text-2xl mb-0.5 transition-transform ${isActive ? 'scale-110' : ''}`}>
                {item.emoji}
              </span>
              <span className={`text-xs font-medium ${
                isActive ? 'text-teal-600' : 'text-gray-500'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
