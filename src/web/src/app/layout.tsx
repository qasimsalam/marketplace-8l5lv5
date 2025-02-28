'use client';

import React from 'react'; // v18.2.0
import type { Metadata } from 'next'; // ^13.0.0
import { Inter } from 'next/font/google'; // ^13.0.0
import { Provider } from 'react-redux'; // ^8.1.1
import { PersistGate } from 'redux-persist/integration/react'; // ^6.0.0

import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { ToastContainer, ToastPosition } from '../components/common/Toast';
import useToast from '../hooks/useToast';
import { store, persistor } from '../store';

// Configure Inter font with appropriate subsets and display settings
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Define static metadata for the application
export const metadata: Metadata = {
  title: 'AI Talent Marketplace',
  description: 'Connecting businesses with verified AI professionals for project-based work through an AI-powered recommendation engine',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: '#6366f1', // Primary color from the design system
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'AI Talent Marketplace',
    description: 'Connecting businesses with verified AI professionals for project-based work',
    type: 'website',
    url: 'https://aitalentmarketplace.com',
  },
};

/**
 * The root layout component that wraps all pages in the application with necessary providers and structure
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Page content to render within the layout
 * @returns {JSX.Element} - The rendered HTML document with providers and layout structure
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize toast state for application-wide notifications
  const toast = useToast();

  return (
    <html lang="en" className={inter.variable}>
      <body className={`font-sans antialiased bg-white ${inter.className}`}>
        {/* Redux Provider for global state management */}
        <Provider store={store}>
          {/* PersistGate for handling Redux state persistence */}
          <PersistGate loading={null} persistor={persistor}>
            {/* Main application container with flex column layout */}
            <div className="flex flex-col min-h-screen">
              {/* Global navigation header */}
              <Header />
              
              {/* Main content area that grows to fill available space */}
              <main className="flex-grow">
                {children}
              </main>
              
              {/* Global footer with links and information */}
              <Footer />
            </div>
            
            {/* Global toast notification container */}
            <ToastContainer
              toasts={toast.toasts}
              position={ToastPosition.TOP_RIGHT}
              onClose={toast.hideToast}
            />
          </PersistGate>
        </Provider>
      </body>
    </html>
  );
}