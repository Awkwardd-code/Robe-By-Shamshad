'use client';

import React, { useState } from 'react';

interface SidebarLinkGroupProps {
  children: (handleClick: () => void, open: boolean) => React.ReactNode;
  activecondition: boolean;
}

const SidebarLinkGroup: React.FC<SidebarLinkGroupProps> = ({
  children,
  activecondition,
}) => {
  const [open, setOpen] = useState(activecondition);

  const handleClick = () => {
    setOpen(!open);
  };

  return (
    <li
      className={`pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0 bg-amber-200 dark:bg-amber-900/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 group relative ${activecondition ? 'ring-2 ring-amber-500 dark:ring-amber-600' : ''}`}
    >
      <span className="absolute -inset-2 bg-amber-200 dark:bg-amber-900/40 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-500 blur-xl" />
      {children(handleClick, open)}
    </li>
  );
};

export default SidebarLinkGroup;