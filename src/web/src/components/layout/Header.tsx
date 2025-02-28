import React, { useState, useEffect, useRef } from 'react'; // v18.2.0
import Link from 'next/link'; // v13.0.0
import Image from 'next/image'; // v13.0.0
import clsx from 'clsx'; // v1.2.1
import { 
  MagnifyingGlassIcon, 
  BellIcon, 
  Bars3Icon, 
  XMarkIcon, 
  UserCircleIcon, 
  ArrowRightOnRectangleIcon, 
  Cog6ToothIcon 
} from '@heroicons/react/24/outline'; // v2.0.0

import { Button, ButtonVariant } from '../common/Button';
import { Avatar, AvatarSize } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { Input, InputType } from '../common/Input';
import { Navigation, NavigationOrientation } from './Navigation';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { Notifications } from '../dashboard/Notifications';

/**
 * Props interface for the Header component
 */
export interface HeaderProps {
  /**
   * Additional CSS class names
   */
  className?: string;
  /**
   * Whether the header should have a transparent background
   */
  transparent?: boolean;
  /**
   * Optional callback for search functionality
   */
  onSearch?: (query: string) => void;
}

/**
 * A responsive header component for the AI Talent Marketplace that displays branding,
 * navigation, search functionality, notifications, and user profile options.
 * Adapts to different screen sizes and authentication states.
 * 
 * @param props Component props
 * @returns Rendered header component
 */
export const Header: React.FC<HeaderProps> = ({ 
  className = '',
  transparent = false,
  onSearch,
  ...props
}) => {
  // Get authentication context
  const { user, isAuthenticated, logout } = useAuth();
  
  // Get profile data if authenticated
  const { freelancerProfile, companyProfile } = useProfile();
  
  // Local state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3); // Example count, should be fetched from API
  
  // Refs for dropdown menus to handle click outside
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
    // Close other dropdowns when opening mobile menu
    if (!mobileMenuOpen) {
      setNotificationsOpen(false);
      setUserMenuOpen(false);
    }
  };
  
  // Toggle notifications dropdown
  const toggleNotifications = () => {
    setNotificationsOpen(prev => !prev);
    // Close other dropdowns
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    
    // Mark notifications as read when opening dropdown
    if (!notificationsOpen) {
      // In a real app, this would call an API to mark notifications as read
      setNotificationCount(0);
    }
  };
  
  // Toggle user menu dropdown
  const toggleUserMenu = () => {
    setUserMenuOpen(prev => !prev);
    // Close other dropdowns
    setNotificationsOpen(false);
    setMobileMenuOpen(false);
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      // Close dropdown after logout
      setUserMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  // Handle clicks outside dropdown menus to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check notifications dropdown
      if (
        notificationsOpen && 
        notificationsRef.current && 
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
      
      // Check user menu dropdown
      if (
        userMenuOpen && 
        userMenuRef.current && 
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    
    // Add click event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up on unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationsOpen, userMenuOpen]);
  
  // Handle escape key to close dropdowns
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Determine which profile to use for display
  const profileData = user?.role === 'freelancer' ? freelancerProfile : companyProfile;
  
  // Determine header background class based on transparent prop
  const headerBgClass = transparent 
    ? 'bg-transparent' 
    : 'bg-white border-b border-gray-200';
  
  /**
   * Renders login/register buttons for unauthenticated users
   */
  const renderAuthButtons = () => {
    return (
      <div className="flex items-center space-x-3">
        <Link href="/login">
          <Button variant={ButtonVariant.OUTLINE}>
            Log in
          </Button>
        </Link>
        <Link href="/register" className="hidden sm:block">
          <Button variant={ButtonVariant.PRIMARY}>
            Sign up
          </Button>
        </Link>
      </div>
    );
  };
  
  /**
   * Renders user menu dropdown for authenticated users
   */
  const renderUserMenu = () => {
    return (
      <div className="relative" ref={userMenuRef}>
        <button
          className="flex items-center text-gray-500 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full"
          onClick={toggleUserMenu}
          aria-label="User menu"
          aria-expanded={userMenuOpen}
          aria-haspopup="true"
        >
          <Avatar 
            src={profileData?.avatarUrl || profileData?.logoUrl} 
            firstName={user?.firstName} 
            lastName={user?.lastName}
            size={AvatarSize.SMALL}
          />
        </button>
        
        {/* User dropdown menu */}
        {userMenuOpen && (
          <div 
            className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-10"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu"
          >
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
            <div className="py-1">
              <Link
                href="/profile"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                Profile
              </Link>
              <Link
                href="/settings"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  /**
   * Renders notifications menu dropdown
   */
  const renderNotificationsMenu = () => {
    return (
      <div className="relative mr-3" ref={notificationsRef}>
        <button
          className="p-2 rounded-full text-gray-500 hover:text-primary-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          onClick={toggleNotifications}
          aria-label="Notifications"
          aria-expanded={notificationsOpen}
          aria-haspopup="true"
        >
          <BellIcon className="h-6 w-6" aria-hidden="true" />
          {notificationCount > 0 && (
            <Badge className="absolute -top-1 -right-1">
              {notificationCount > 99 ? '99+' : notificationCount}
            </Badge>
          )}
        </button>
        
        {/* Notifications dropdown */}
        {notificationsOpen && (
          <div 
            className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg overflow-hidden z-10"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="notifications-menu"
          >
            <Notifications 
              limit={5} 
              showHeader={true}
              onNotificationClick={() => setNotificationsOpen(false)}
            />
          </div>
        )}
      </div>
    );
  };
  
  return (
    <header 
      className={clsx(
        'sticky top-0 z-50 py-2 w-full transition-colors duration-200',
        headerBgClass,
        className
      )}
      {...props}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and brand */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <Image 
                src="/images/logo.svg" 
                alt="AI Talent Marketplace" 
                width={40} 
                height={40} 
                className="h-10 w-auto" 
                priority
              />
              <span className="ml-3 text-xl font-bold text-primary-900 hidden md:block">
                AI Talent Marketplace
              </span>
            </Link>
          </div>
          
          {/* Desktop Navigation - hidden on small screens */}
          <div className="hidden md:block ml-6">
            <Navigation />
          </div>
          
          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <form 
              onSubmit={handleSearch} 
              className="w-full flex items-center"
            >
              <Input
                type={InputType.SEARCH}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs or talent..."
                prefix={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />}
                className="w-full"
                aria-label="Search"
              />
              <Button 
                type="submit" 
                variant={ButtonVariant.PRIMARY}
                className="ml-2"
                ariaLabel="Search"
              >
                <span className="sr-only">Search</span>
                <MagnifyingGlassIcon className="h-5 w-5 md:hidden" aria-hidden="true" />
                <span className="hidden md:inline">Search</span>
              </Button>
            </form>
          </div>
          
          {/* Right section with user menu or auth buttons */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <>
                {/* Notifications button and dropdown */}
                {renderNotificationsMenu()}
                
                {/* User Menu and dropdown */}
                {renderUserMenu()}
              </>
            ) : (
              /* Auth buttons for non-authenticated users */
              renderAuthButtons()
            )}
            
            {/* Mobile menu button - visible only on small screens */}
            <div className="md:hidden ml-3">
              <button
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-primary-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onClick={toggleMobileMenu}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu - hidden on larger screens */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-10"
          id="mobile-menu"
        >
          <div className="px-4 pt-2 pb-3">
            {/* Mobile Search Bar */}
            <form 
              onSubmit={handleSearch} 
              className="mb-3 flex items-center"
            >
              <Input
                type={InputType.SEARCH}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs or talent..."
                prefix={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />}
                className="w-full"
                aria-label="Search"
              />
              <Button 
                type="submit" 
                variant={ButtonVariant.PRIMARY}
                className="ml-2"
                ariaLabel="Search"
              >
                <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
              </Button>
            </form>
            
            {/* Mobile Navigation */}
            <Navigation orientation={NavigationOrientation.VERTICAL} />
            
            {/* Auth buttons for mobile (if not authenticated) */}
            {!isAuthenticated && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href="/login" className="col-span-1">
                  <Button
                    variant={ButtonVariant.OUTLINE}
                    isFullWidth
                  >
                    Log in
                  </Button>
                </Link>
                <Link href="/register" className="col-span-1">
                  <Button
                    variant={ButtonVariant.PRIMARY}
                    isFullWidth
                  >
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;