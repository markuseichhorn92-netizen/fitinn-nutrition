'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/plan',
    label: 'Plan',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-teal-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/einkaufsliste',
    label: 'Einkaufen',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-teal-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: '/profil',
    label: 'Profil',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-teal-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb lg:hidden z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-2 px-6 rounded-lg transition-colors ${
                isActive ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {item.icon(isActive)}
              <span className={`text-xs mt-1 font-medium ${isActive ? 'text-teal-600' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
