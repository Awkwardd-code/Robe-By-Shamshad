/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useRef, useEffect } from 'react';
import Transition from '../utils/Transition';

interface DropdownEditMenuProps {
  children: React.ReactNode;
  align?: 'left' | 'right';
  [key: string]: any; // For rest props
}

const DropdownEditMenu: React.FC<DropdownEditMenuProps> = ({ children, align = 'left', ...rest }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dropdown = useRef<HTMLUListElement>(null);

  // Close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!dropdown.current || !trigger.current) return;
      if (
        !dropdownOpen ||
        dropdown.current.contains(target as Node) ||
        trigger.current.contains(target as Node)
      )
        return;
      setDropdownOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, [dropdownOpen]);

  // Close on ESC key
  useEffect(() => {
    const keyHandler = ({ key }: KeyboardEvent) => {
      if (dropdownOpen && key === 'Escape') {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [dropdownOpen]);

  return (
    <div {...rest}>
      <button
        ref={trigger}
        className={`rounded-full ${
          dropdownOpen
            ? 'bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400'
            : 'text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400'
        }`}
        aria-haspopup="true"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
      >
        <span className="sr-only">Menu</span>
        <svg className="w-8 h-8 fill-current" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="2" />
          <circle cx="10" cy="16" r="2" />
          <circle cx="22" cy="16" r="2" />
        </svg>
      </button>
      <Transition
        tag="div"
        className={`origin-top-right z-10 absolute top-full min-w-36 bg-[#dbc59c] border border-[#bfa77a] py-1.5 rounded-lg shadow-lg overflow-hidden mt-1 ${
          align === 'right' ? 'right-0' : 'left-0'
        }`}
        show={dropdownOpen}
        appear={true}
        enter="transition ease-out duration-200 transform"
        enterStart="opacity-0 -translate-y-2"
        enterEnd="opacity-100 translate-y-0"
        leave="transition ease-out duration-200"
        leaveStart="opacity-100"
        leaveEnd="opacity-0"
      >
        <ul ref={dropdown} onFocus={() => setDropdownOpen(true)} onBlur={() => setDropdownOpen(false)}>
          {children}
        </ul>
      </Transition>
    </div>
  );
};

export default DropdownEditMenu;