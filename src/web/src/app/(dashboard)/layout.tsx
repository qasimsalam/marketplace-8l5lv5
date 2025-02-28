'use client';

import React, { useState, useEffect } from 'react'; // v18.2.0
import { useRouter, usePathname } from 'next/navigation'; // v13.0.0
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react'; // v6.0.0

// Internal components
import { Header } from '../../components/layout/Header';
import { Sidebar } from '../../components/layout/Sidebar';
import { Footer } from '../../components/layout/Footer';
import { ToastContainer, ToastPosition } from '../../components/common/Toast';

// Hooks and state management
import { useAuth } from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { store, persistor } from '../../store';

/**
 * Dashboard layout component that provides a consistent structure for all authenticated dashboard pages.
 * Includes header, sidebar navigation, main content area, and footer.
 * Handles authentication state and redirects unauthenticated users.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render in the main content area
 * @returns {React.ReactNode | null} - The rendered dashboard layout or null if redirecting
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hooks for navigation and authentication
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const { toasts } = useToast();

  // State for sidebar visibility on mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check authentication status and redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setSidebarOpen(prevState => !prevState);
  };

  // Handle search functionality from header
  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  // Return null while checking authentication to prevent flash of unauthenticated content
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <div className="flex flex-col min-h-screen bg-gray-50">
          {/* Header */}
          <Header onSearch={handleSearch} />

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar - responsive behavior managed by isOpen prop */}
            <Sidebar 
              isOpen={sidebarOpen}
              onToggle={toggleSidebar}
            />

            {/* Main content area with overlay when sidebar is open on mobile */}
            <main className="flex-1 overflow-y-auto pt-16">
              {/* Semi-transparent overlay when sidebar is open on mobile */}
              {sidebarOpen && (
                <div 
                  className="fixed inset-0 bg-gray-600 bg-opacity-50 z-20 md:hidden"
                  onClick={toggleSidebar}
                  aria-hidden="true"
                />
              )}

              {/* Page content */}
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
              </div>
            </main>
          </div>

          {/* Footer */}
          <Footer />

          {/* Toast notifications container */}
          <ToastContainer
            toasts={toasts}
            position={ToastPosition.TOP_RIGHT}
            onClose={(id) => {}}
          />
        </div>
      </PersistGate>
    </Provider>
  );
}