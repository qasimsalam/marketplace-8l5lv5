'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FiCheck, FiBriefcase, FiUsers, FiCode } from 'react-icons/fi';

import Button, { ButtonVariant, ButtonSize } from '../components/common/Button';
import { Card, CardVariant } from '../components/common/Card';
import JobList, { ViewMode } from '../components/jobs/JobList';
import JobCard from '../components/jobs/JobCard';
import { useJobs } from '../hooks/useJobs';
import { useAuth } from '../hooks/useAuth';
import { jobsAPI } from '../lib/api';
import { Job } from '../types/job';

// Platform features for the benefits section
const platformFeatures = [
  {
    title: "AI-Powered Matching",
    description: "Our intelligent algorithms match your project with the perfect AI talent, reducing hiring time by 60%.",
    icon: <FiUsers className="h-8 w-8 text-primary-500" />
  },
  {
    title: "Verified AI Professionals",
    description: "Every professional is thoroughly vetted for their AI expertise and skills to ensure quality results.",
    icon: <FiCheck className="h-8 w-8 text-primary-500" />
  },
  {
    title: "Project-Based Work",
    description: "Hire for specific project needs with milestone-based contracts and secure payment protection.",
    icon: <FiBriefcase className="h-8 w-8 text-primary-500" />
  },
  {
    title: "Built-in AI Workspace",
    description: "Collaborate effortlessly with integrated Jupyter notebooks and specialized tools for AI development.",
    icon: <FiCode className="h-8 w-8 text-primary-500" />
  }
];

// AI-specific features
const aiFeatures = [
  {
    title: "Specialized AI Recruitment",
    description: "Our platform is designed specifically for AI talent, with custom assessments and portfolio verification tailored to machine learning experts."
  },
  {
    title: "AI Development Workspace",
    description: "Collaborate seamlessly with integrated Jupyter notebooks, model sharing capabilities, and specialized tools for AI development."
  },
  {
    title: "AI-Specific Project Management",
    description: "Manage complex AI projects with specialized tools for model deployment, data pipeline integration, and algorithm versioning."
  }
];

// Testimonials
const testimonials = [
  {
    name: "Sarah Johnson",
    role: "AI Research Lead",
    company: "TechInnovate",
    quote: "The AI Talent Marketplace streamlined our hiring process. We found a computer vision expert within days instead of months.",
    avatarUrl: "/images/testimonials/avatar1.jpg"
  },
  {
    name: "Michael Chen",
    role: "Machine Learning Engineer",
    company: "Freelancer",
    quote: "As an AI professional, this platform connects me with meaningful projects that perfectly match my expertise in natural language processing.",
    avatarUrl: "/images/testimonials/avatar2.jpg"
  },
  {
    name: "Emily Rodriguez",
    role: "CTO",
    company: "DataDrive Inc.",
    quote: "The specialized nature of this marketplace means we get pre-vetted AI talent who understand our technical requirements from day one.",
    avatarUrl: "/images/testimonials/avatar3.jpg"
  }
];

/**
 * The main landing page component that showcases the AI Talent Marketplace platform
 */
export default function HomePage(): JSX.Element {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { fetchJobs } = useJobs();
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  
  // Fetch featured/recommended jobs when component mounts
  useEffect(() => {
    const loadFeaturedJobs = async () => {
      try {
        const response = await jobsAPI.getRecommendedJobs(6);
        setFeaturedJobs(response.jobs);
      } catch (error) {
        console.error('Failed to load featured jobs:', error);
      }
    };
    
    loadFeaturedJobs();
  }, []);
  
  // Handle job card click
  const handleJobClick = (job: Job) => {
    router.push(`/jobs/${job.id}`);
  };
  
  // Handle register button click
  const handleRegisterClick = () => {
    router.push('/register');
  };
  
  return (
    <main className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 mb-10 lg:mb-0">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Connect with Top AI Talent
              </h1>
              <p className="text-xl mb-8 text-white/90 max-w-2xl">
                The premier marketplace connecting businesses with verified AI professionals for your ML, data science, and AI engineering projects.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  variant={ButtonVariant.PRIMARY} 
                  size={ButtonSize.LARGE}
                  className="bg-white text-primary-600 hover:bg-gray-100"
                  onClick={() => router.push('/jobs')}
                >
                  Browse AI Jobs
                </Button>
                {!isAuthenticated && (
                  <Button 
                    variant={ButtonVariant.OUTLINE} 
                    size={ButtonSize.LARGE}
                    className="border-white text-white hover:bg-white/10"
                    onClick={handleRegisterClick}
                  >
                    Join as AI Expert
                  </Button>
                )}
              </div>
            </div>
            <div className="lg:w-1/2">
              <Image 
                src="/images/hero-image.svg" 
                alt="AI Talent Marketplace" 
                width={600} 
                height={400}
                className="w-full h-auto"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Platform Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose AI Talent Marketplace
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The specialized platform built specifically for AI project staffing and collaboration
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {platformFeatures.map((feature, index) => (
              <Card 
                key={index} 
                className="p-6 h-full flex flex-col items-center text-center"
                variant={CardVariant.DEFAULT}
              >
                <div className="mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Jobs Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Featured AI Jobs
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover exciting opportunities in artificial intelligence, machine learning, and data science
            </p>
          </div>
          
          {featuredJobs.length > 0 ? (
            <JobList 
              jobs={featuredJobs}
              isLoading={false}
              error={null}
              onJobClick={handleJobClick}
              showFilters={false}
              initialViewMode={ViewMode.GRID}
              emptyStateMessage="No featured jobs available at the moment. Check back soon!"
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading featured jobs...</p>
            </div>
          )}
          
          <div className="text-center mt-12">
            <Button 
              variant={ButtonVariant.PRIMARY}
              size={ButtonSize.LARGE}
              onClick={() => router.push('/jobs')}
            >
              View All Jobs
            </Button>
          </div>
        </div>
      </section>

      {/* AI-specific Features Section */}
      <section className="py-20 bg-gradient-to-r from-secondary-600 to-secondary-800 text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 mb-10 lg:mb-0">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Built Specifically for AI Projects
              </h2>
              <p className="text-xl mb-8 text-white/90">
                Our platform is designed from the ground up for the unique challenges of AI development and collaboration.
              </p>
              
              <div className="space-y-6">
                {aiFeatures.map((feature, index) => (
                  <div key={index} className="flex">
                    <div className="mr-4 mt-1">
                      <div className="bg-white/20 p-1 rounded-full">
                        <FiCheck className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-white/80">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-1/2">
              <Image 
                src="/images/ai-features.svg" 
                alt="AI-specific features" 
                width={600} 
                height={500}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Hear from AI professionals and businesses who have found success on our platform
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index} 
                className="p-6 h-full flex flex-col"
                variant={CardVariant.DEFAULT}
              >
                <div className="flex items-center mb-4">
                  <Image 
                    src={testimonial.avatarUrl} 
                    alt={testimonial.name} 
                    width={60} 
                    height={60}
                    className="rounded-full mr-4"
                  />
                  <div>
                    <h3 className="font-semibold">{testimonial.name}</h3>
                    <p className="text-sm text-gray-600">{testimonial.role}, {testimonial.company}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic flex-grow">"{testimonial.quote}"</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-primary-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your AI Projects?
          </h2>
          <p className="text-xl mb-8 text-white/90 max-w-3xl mx-auto">
            Join thousands of businesses and AI professionals already collaborating on the leading AI talent platform.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              variant={ButtonVariant.PRIMARY} 
              size={ButtonSize.LARGE}
              className="bg-white text-primary-900 hover:bg-gray-100"
              onClick={() => router.push('/register?role=employer')}
            >
              Hire AI Talent
            </Button>
            <Button 
              variant={ButtonVariant.OUTLINE} 
              size={ButtonSize.LARGE}
              className="border-white text-white hover:bg-white/10"
              onClick={() => router.push('/register?role=freelancer')}
            >
              Join as AI Expert
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}