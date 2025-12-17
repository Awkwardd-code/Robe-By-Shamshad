
'use client';

import { useRouter } from 'next/navigation';
import Notifications from '../components/DropdownNotifications';
import Help from '../components/DropdownHelp';


// Define props interface
interface SidebarHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  variant?: 'default' | 'v2' | 'v3';
}

function Header({ sidebarOpen, setSidebarOpen, variant = 'default' }: SidebarHeaderProps) {
  // const [searchModalOpen, setSearchModalOpen] = useState(false);
  const router = useRouter();

  return (
    <header
      className={`sticky top-0 before:absolute before:inset-0 before:backdrop-blur-md before:bg-white dark:before:bg-gray-900 before:-z-10 z-2 shadow-sm transition-all duration-500`}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center justify-between h-16 ${variant === 'v2' || variant === 'v3' ? '' : 'lg:border-b border-gray-200/50 dark:border-gray-700/50'
            }`}
        >
          {/* Header: Left side */}
          <div className="flex">
            {/* Hamburger button */}
            <button
              className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 lg:hidden"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(!sidebarOpen);
              }}
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="16" height="2" />
                <rect x="4" y="11" width="16" height="2" />
                <rect x="4" y="17" width="16" height="2" />
              </svg>
            </button>
          </div>

          {/* Header: Right side */}
          <div className="flex items-center space-x-4">
            {/* Notifications Dropdown */}
            <Notifications align="right" />
            {/* Help Dropdown */}
            <Help align="right" />
            {/* Home Button */}
            <button
              type="button"
              onClick={() => router.push('/')}
              className="relative flex items-center justify-center px-3 py-2 mx-2 rounded-lg bg-slate-100 hover:bg-indigo-100 hover:shadow-md dark:bg-slate-800 dark:hover:bg-indigo-900/50 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-all duration-300 cursor-pointer group"
              title="Go to Home"
            >
              <span className="absolute -inset-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 blur-xl" />
              <svg
                className="w-5 h-5 z-10 transition-all duration-300 ease-in-out"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="currentColor"
                  d="M10.707 2.293a1 1 0 0 0-1.414 0l-7 7A1 1 0 0 0 3 11h1v6a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-3h2v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-6h1a1 1 0 0 0 .707-1.707l-7-7Z"
                  className="text-slate-600 group-hover:text-indigo-500 dark:text-slate-400 dark:group-hover:text-indigo-400"
                />
              </svg>

              <span className="sr-only">Go to Home</span>
            </button>

            <hr className="w-px h-6 mx-2 bg-gray-200/50 dark:bg-gray-700/50 border-none" />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;