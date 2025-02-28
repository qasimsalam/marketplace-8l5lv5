import React, { useState, useEffect } from 'react'; // ^18.2.0
import Link from 'next/link'; // ^13.0.0
import { useRouter } from 'next/router'; // ^13.0.0
import clsx from 'clsx'; // ^1.2.1

// Icon imports
import { 
  HomeIcon, 
  BriefcaseIcon, 
  ChatBubbleLeftRightIcon, 
  UserCircleIcon, 
  Cog6ToothIcon, 
  CurrencyDollarIcon, 
  DocumentTextIcon, 
  ChartBarIcon 
} from '@heroicons/react/24/outline'; // ^2.0.0

// Internal component imports
import { Button, ButtonVariant } from '../common/Button';
import { Avatar, AvatarSize } from '../common/Avatar';
import { Badge } from '../common/Badge';

// Hooks and utilities
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../lib/auth';
import { Permission } from '../../types/auth';

// User type import
import { UserRole } from '../../../backend/shared/src/types/user.types';

/**
 * Navigation display variants
 */
export enum NavigationVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary'
}

/**
 * Navigation orientation options
 */
export enum NavigationOrientation {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical'
}

/**
 * Interface representing a navigation item
 */
export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  permission: string | null; // AuthPermission type from Permission enum or null
  badgeCount?: number;
  requiresAuth: boolean;
}

/**
 * Props for the Navigation component
 */
export interface NavigationProps {
  variant?: NavigationVariant;
  orientation?: NavigationOrientation;
  className?: string;
}

/**
 * A flexible navigation component for the AI Talent Marketplace application
 * that provides consistent navigation links throughout the application.
 * Supports both horizontal and vertical layouts and dynamically renders
 * navigation options based on user authentication state and permissions.
 * 
 * @param props Component props
 * @returns Rendered navigation component
 */
export const Navigation: React.FC<NavigationProps> = ({
  variant = NavigationVariant.PRIMARY,
  orientation = NavigationOrientation.HORIZONTAL,
  className = '',
  ...props
}) => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // Generate navigation items based on authentication state and user role
  const navItems = getNavItems(isAuthenticated, user?.role);
  
  // Filter nav items based on authentication and permissions
  const filteredNavItems = navItems.filter(item => {
    // If item requires authentication but user is not authenticated, don't show
    if (item.requiresAuth && !isAuthenticated) return false;
    
    // If item has a permission requirement, check if user has that permission
    if (item.permission && user?.role) {
      return hasPermission(user.role, item.permission);
    }
    
    // If item requires auth but has no specific permission, show it if authenticated
    return !(item.requiresAuth && !user);
  });

  // Navigation container class based on orientation and variant
  const navContainerClass = clsx(
    'flex',
    {
      // Orientation-specific styles
      'flex-row items-center space-x-1 md:space-x-2': orientation === NavigationOrientation.HORIZONTAL,
      'flex-col space-y-2': orientation === NavigationOrientation.VERTICAL,
      
      // Variant-specific styles
      'text-sm': variant === NavigationVariant.SECONDARY,
      'text-base': variant === NavigationVariant.PRIMARY,
    },
    className
  );

  return (
    <nav className={navContainerClass} aria-label="Main navigation" {...props}>
      {filteredNavItems.map((item) => {
        const isActive = router.pathname === item.href || router.asPath.startsWith(`${item.href}/`);
        return renderNavItem(item, orientation, isActive);
      })}
      
      {/* Add Avatar for quick profile access if authenticated */}
      {isAuthenticated && user && orientation === NavigationOrientation.HORIZONTAL && (
        <Link 
          href="/profile" 
          className="ml-2 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full"
          aria-label="View your profile"
        >
          <Avatar 
            size={AvatarSize.SMALL} 
            firstName={user.firstName} 
            lastName={user.lastName}
            hasBorder={true}
            borderColor="border-gray-200"
          />
        </Link>
      )}
    </nav>
  );
};

/**
 * Generates navigation items based on authentication state and user role
 * 
 * @param isAuthenticated Whether the user is authenticated
 * @param userRole The user's role, if any
 * @returns Array of navigation items
 */
const getNavItems = (
  isAuthenticated: boolean,
  userRole?: UserRole | null | undefined
): NavItem[] => {
  // Base navigation items available to all users
  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/',
      icon: HomeIcon,
      permission: null,
      requiresAuth: false,
    },
    {
      label: 'Jobs',
      href: '/jobs',
      icon: BriefcaseIcon,
      permission: Permission.JOBS_VIEW,
      requiresAuth: false,
    },
  ];

  // Add items for authenticated users
  if (isAuthenticated) {
    navItems.push(
      {
        label: 'Messages',
        href: '/messages',
        icon: ChatBubbleLeftRightIcon,
        permission: null,
        badgeCount: 0, // This would be dynamically updated from a context/store
        requiresAuth: true,
      },
      {
        label: 'Profile',
        href: '/profile',
        icon: UserCircleIcon,
        permission: Permission.PROFILE_VIEW,
        requiresAuth: true,
      }
    );

    // Add role-specific items
    if (userRole === 'employer') {
      navItems.push({
        label: 'Contracts',
        href: '/contracts',
        icon: DocumentTextIcon,
        permission: Permission.CONTRACTS_VIEW,
        requiresAuth: true,
      });
    }

    if (userRole === 'freelancer') {
      navItems.push({
        label: 'Workspace',
        href: '/workspace',
        icon: DocumentTextIcon,
        permission: Permission.WORKSPACE_VIEW,
        requiresAuth: true,
      });
    }

    // Add payment item for both employers and freelancers
    if (userRole === 'employer' || userRole === 'freelancer') {
      navItems.push({
        label: 'Payments',
        href: '/payments',
        icon: CurrencyDollarIcon,
        permission: Permission.PAYMENTS_VIEW,
        requiresAuth: true,
      });
    }

    // Add admin dashboard for admin users
    if (userRole === 'admin') {
      navItems.push({
        label: 'Admin',
        href: '/admin',
        icon: ChartBarIcon,
        permission: Permission.ADMIN_DASHBOARD,
        requiresAuth: true,
      });
    }

    // Add settings for all authenticated users
    navItems.push({
      label: 'Settings',
      href: '/settings',
      icon: Cog6ToothIcon,
      permission: null,
      requiresAuth: true,
    });
  }

  return navItems;
};

/**
 * Renders a single navigation item
 * 
 * @param item Navigation item to render
 * @param orientation Orientation of the navigation
 * @param isActive Whether this item is currently active
 * @returns Rendered navigation item
 */
const renderNavItem = (
  item: NavItem,
  orientation: NavigationOrientation,
  isActive: boolean
): JSX.Element => {
  const { label, href, icon: Icon, badgeCount } = item;
  
  // Base classes for nav items
  const baseClasses = 'group flex items-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500';
  
  // Classes for active and inactive states
  const stateClasses = isActive
    ? 'bg-primary-100 text-primary-900'
    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900';
  
  // Classes specific to orientation
  const orientationClasses = orientation === NavigationOrientation.HORIZONTAL
    ? 'px-3 py-2'
    : 'px-3 py-2 w-full';
  
  // Combine all classes
  const itemClasses = clsx(baseClasses, stateClasses, orientationClasses);
  
  return (
    <Link
      key={href}
      href={href}
      className={itemClasses}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon
        className={clsx(
          'flex-shrink-0',
          orientation === NavigationOrientation.HORIZONTAL ? 'h-5 w-5 mr-1' : 'h-5 w-5 mr-2',
          isActive ? 'text-primary-600' : 'text-gray-500 group-hover:text-gray-600'
        )}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
      
      {/* Show badge if there are unread items */}
      {typeof badgeCount === 'number' && badgeCount > 0 && (
        <Badge className="ml-1.5">
          {badgeCount > 99 ? '99+' : badgeCount}
        </Badge>
      )}
    </Link>
  );
};

export default Navigation;