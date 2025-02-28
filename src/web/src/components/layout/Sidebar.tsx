import React, { useState, useEffect, useRef } from 'react'; // ^18.2.0
import Link from 'next/link'; // ^13.0.0
import Image from 'next/image'; // ^13.0.0
import clsx from 'clsx'; // ^1.2.1
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'; // ^2.0.0

import { Navigation, NavigationOrientation } from './Navigation';
import { Avatar, AvatarSize } from '../common/Avatar';
import { Button, ButtonVariant } from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';

/**
 * Interface defining props for the Sidebar component
 */
export interface SidebarProps {
  /** Whether the sidebar is open/visible on mobile */
  isOpen: boolean;
  /** Callback to toggle sidebar visibility on mobile */
  onToggle: () => void;
  /** Optional additional classes */
  className?: string;
}

/**
 * A responsive sidebar navigation component for the AI Talent Marketplace web application
 * that provides vertical navigation links, user profile information, and collapsible 
 * functionality for mobile screens.
 * 
 * @param props Component props
 * @returns The rendered sidebar component
 */
export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  className,
  ...props
}) => {
  const { user, isAuthenticated } = useAuth();
  const { freelancerProfile, companyProfile } = useProfile();
  const [collapsed, setCollapsed] = useState(false);

  // Toggle sidebar collapsed state
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  // Combine the classes for the sidebar based on its state
  const sidebarClasses = clsx(
    'flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300',
    {
      'w-64': !collapsed,
      'w-20': collapsed,
      'fixed inset-y-0 left-0 z-30 transform': true,
      'md:translate-x-0': true,
      '-translate-x-full': !isOpen,
      'translate-x-0': isOpen,
    },
    className
  );

  /**
   * Renders the user profile section in the sidebar
   * 
   * @returns User profile section with avatar and user information
   */
  const renderUserSection = () => {
    if (!isAuthenticated || !user) return null;

    // Determine if we should show freelancer or company profile data
    const profile = user.role === 'freelancer' ? freelancerProfile : companyProfile;
    const displayName = profile ? 
      (user.role === 'freelancer' ? `${user.firstName} ${user.lastName}` : profile.name) :
      `${user.firstName} ${user.lastName}`;
    
    const userTitle = user.role === 'freelancer' && freelancerProfile ? 
      freelancerProfile.title : 
      user.role.charAt(0).toUpperCase() + user.role.slice(1);

    return (
      <div className={clsx(
        'mt-auto border-t border-gray-200 p-4',
        collapsed ? 'items-center justify-center' : ''
      )}>
        <Link 
          href="/profile" 
          className={clsx(
            'flex items-center p-2 rounded-lg hover:bg-gray-100 transition-colors',
            collapsed ? 'justify-center' : ''
          )}
        >
          <Avatar 
            size={AvatarSize.SMALL}
            firstName={user.firstName}
            lastName={user.lastName}
            src={profile?.avatarUrl}
            hasBorder={true}
          />
          
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{userTitle}</p>
            </div>
          )}
        </Link>
      </div>
    );
  };

  /**
   * Renders the button for expanding and collapsing the sidebar
   * 
   * @returns Collapse/expand button with appropriate icon
   */
  const renderCollapseButton = () => {
    return (
      <Button
        variant={ButtonVariant.GHOST}
        className="flex items-center justify-center p-2 mt-2 mb-4 mx-auto"
        onClick={toggleCollapse}
        ariaLabel={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRightIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronLeftIcon className="h-5 w-5 text-gray-500" />
        )}
      </Button>
    );
  };

  return (
    <aside
      className={sidebarClasses}
      aria-label="Main navigation sidebar"
      aria-expanded={isOpen}
      {...props}
    >
      {/* Logo Section */}
      <div className={clsx(
        'flex items-center p-4 border-b border-gray-200',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        <Link href="/" className="flex items-center">
          {collapsed ? (
            <div className="w-8 h-8 relative">
              <Image 
                src="/logo-icon.svg" 
                alt="AI Talent Marketplace" 
                width={32}
                height={32}
                className="object-contain" 
              />
            </div>
          ) : (
            <div className="h-8 w-auto relative">
              <Image 
                src="/logo-full.svg" 
                alt="AI Talent Marketplace" 
                width={150} 
                height={32} 
                className="object-contain" 
              />
            </div>
          )}
        </Link>
        
        {!collapsed && (
          <Button
            variant={ButtonVariant.GHOST}
            className="md:hidden"
            onClick={onToggle}
            ariaLabel="Close sidebar"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </Button>
        )}
      </div>

      {/* Navigation Section */}
      <div className={clsx(
        'flex-1 overflow-y-auto py-4 px-3',
        collapsed && 'flex flex-col items-center'
      )}>
        <Navigation 
          orientation={NavigationOrientation.VERTICAL} 
          className={collapsed ? 'items-center' : ''}
        />
      </div>

      {/* User Profile Section */}
      {renderUserSection()}

      {/* Collapse/Expand Button - visible only on desktop */}
      <div className="hidden md:block">
        {renderCollapseButton()}
      </div>
    </aside>
  );
};

export default Sidebar;