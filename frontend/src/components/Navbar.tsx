'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/',          label: 'Home'      },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/register',  label: 'Register'  },
  { href: '/transfer',  label: 'Transfer'  },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-900 shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white font-bold text-sm">
            LR
          </div>
          <span className="text-lg font-semibold text-white">Land Registry</span>
          <span className="hidden rounded bg-blue-900 px-2 py-0.5 text-xs font-medium text-blue-300 sm:inline">
            Blockchain
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
