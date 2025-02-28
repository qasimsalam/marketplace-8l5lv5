import React from 'react'; // v18.2.0
import Link from 'next/link'; // v13.0.0
import clsx from 'clsx'; // v1.2.1
import { Button, ButtonVariant } from '../common/Button';

/**
 * Props for the Footer component
 */
export interface FooterProps {
  /**
   * Additional class names to apply to the footer
   */
  className?: string;
}

/**
 * A responsive footer component for the AI Talent Marketplace web application
 * that provides essential links, legal information, support resources, and copyright details.
 * This component adapts to different screen sizes and appears consistently across the application.
 */
export const Footer: React.FC<FooterProps> = ({ className }) => {
  // Current year for copyright
  const currentYear = new Date().getFullYear();

  // Footer navigation links organized by category
  const footerLinks = {
    links: [
      { href: '/about', label: 'About Us' },
      { href: '/jobs', label: 'Browse Jobs' },
      { href: '/talent', label: 'Find Talent' },
      { href: '/how-it-works', label: 'How It Works' },
      { href: '/blog', label: 'Blog' }
    ],
    legal: [
      { href: '/terms', label: 'Terms of Service' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/cookies', label: 'Cookie Policy' },
      { href: '/accessibility', label: 'Accessibility' }
    ],
    support: [
      { href: '/help', label: 'Help Center' },
      { href: '/contact', label: 'Contact Us' },
      { href: '/faq', label: 'FAQ' },
      { href: '/feedback', label: 'Feedback' }
    ]
  };

  // Social media links
  const socialLinks = [
    { href: 'https://twitter.com/aitalentmarket', icon: 'twitter', label: 'Twitter' },
    { href: 'https://linkedin.com/company/aitalentmarket', icon: 'linkedin', label: 'LinkedIn' },
    { href: 'https://github.com/aitalentmarket', icon: 'github', label: 'GitHub' },
    { href: 'https://instagram.com/aitalentmarket', icon: 'instagram', label: 'Instagram' }
  ];

  return (
    <footer 
      className={clsx(
        'bg-gray-50 border-t border-gray-200',
        className
      )}
      role="contentinfo"
      aria-label="Site footer"
    >
      {/* Desktop footer layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 md:py-16">
          {/* Footer main content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company info section */}
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center">
                <span className="sr-only">AI Talent Marketplace</span>
                <svg 
                  className="h-8 w-auto text-primary-600" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  aria-hidden="true"
                >
                  <path d="M12 2L1 21h22L12 2zm0 4.5l7.5 13h-15L12 6.5z" />
                </svg>
                <span className="ml-2 text-xl font-bold text-gray-900">AI Talent</span>
              </Link>
              <p className="mt-4 text-base text-gray-500">
                Connecting businesses with verified AI professionals for project-based work.
              </p>
              
              {/* Social media links */}
              <div className="mt-8 flex space-x-6">
                {socialLinks.map((social) => (
                  <a 
                    key={social.label} 
                    href={social.href} 
                    className="text-gray-400 hover:text-gray-500 transition-colors"
                    aria-label={social.label}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="sr-only">{social.label}</span>
                    {renderSocialIcon(social.icon)}
                  </a>
                ))}
              </div>
            </div>

            {/* Links columns */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-8">
              {/* Quick Links */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Quick Links
                </h3>
                <ul role="list" className="mt-4 space-y-3">
                  {footerLinks.links.map(link => (
                    <li key={link.label}>
                      <Link 
                        href={link.href}
                        className="text-base text-gray-500 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Legal
                </h3>
                <ul role="list" className="mt-4 space-y-3">
                  {footerLinks.legal.map(link => (
                    <li key={link.label}>
                      <Link 
                        href={link.href}
                        className="text-base text-gray-500 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Support
                </h3>
                <ul role="list" className="mt-4 space-y-3">
                  {footerLinks.support.map(link => (
                    <li key={link.label}>
                      <Link 
                        href={link.href}
                        className="text-base text-gray-500 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Newsletter subscription */}
          <div className="mt-12 border-t border-gray-200 pt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Subscribe to our newsletter
                </h3>
                <p className="mt-2 text-base text-gray-500">
                  Stay updated with the latest in AI talent and projects.
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex flex-col sm:flex-row">
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none min-w-0 w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-4 text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your email"
                />
                <div className="mt-3 sm:mt-0 sm:ml-3">
                  <Button 
                    variant={ButtonVariant.PRIMARY}
                    type="submit"
                    ariaLabel="Subscribe to newsletter"
                  >
                    Subscribe
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright section */}
          <div className="mt-8 border-t border-gray-200 pt-8 md:flex md:items-center md:justify-between">
            <div className="flex space-x-6 md:order-2">
              <Button 
                variant={ButtonVariant.GHOST} 
                className="text-sm"
                ariaLabel="Get started with AI Talent Marketplace"
              >
                Get Started
              </Button>
            </div>
            <p className="mt-8 text-base text-gray-400 md:mt-0 md:order-1">
              &copy; {currentYear} AI Talent Marketplace. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

/**
 * Helper function to render social media icons
 */
function renderSocialIcon(icon: string): JSX.Element {
  switch (icon) {
    case 'twitter':
      return (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      );
    case 'github':
      return (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
        </svg>
      );
    case 'instagram':
      return (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
        </svg>
      );
    default:
      return (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
        </svg>
      );
  }
}

export default Footer;