/**
 * Profile Routes Module
 *
 * Configures RESTful API endpoints for managing user and company profiles in the
 * AI Talent Marketplace. Includes routes for creating, updating, viewing, and searching
 * profiles, as well as managing portfolio items, uploads, and verification status.
 * 
 * @version 1.0.0
 */

import express, { Router } from 'express'; // v4.18.2
import multer from 'multer'; // v1.4.5-lts.1

import { ProfileController } from '../controllers/profile.controller';
import { UserRole } from '../../shared/src/types/user.types';
import { config } from '../config';

// Create Express router
const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: config.user.avatarSettings.maxSize } 
});

/**
 * Sets up basic profile routes accessible to authenticated users
 * 
 * @param router - Express router instance
 * @param profileController - Profile controller instance
 */
function setupProfileRoutes(router: Router, profileController: ProfileController): void {
  // Get a profile by userId
  router.get(
    '/profiles/:userId', 
    profileController.checkAuthentication,
    profileController.getProfile
  );

  // Create a new profile
  router.post(
    '/profiles/:userId', 
    profileController.checkAuthentication,
    profileController.checkProfileOwnership,
    profileController.createUserProfile
  );

  // Update a profile
  router.put(
    '/profiles/:userId', 
    profileController.checkAuthentication,
    profileController.checkProfileOwnership,
    profileController.updateUserProfile
  );

  // Search for profiles
  router.get(
    '/profiles/search', 
    profileController.checkAuthentication,
    profileController.searchProfiles
  );

  // Update profile skills
  router.put(
    '/profiles/:userId/skills', 
    profileController.checkAuthentication,
    profileController.checkProfileOwnership,
    profileController.updateSkills
  );

  // Upload profile avatar
  router.put(
    '/profiles/:userId/avatar', 
    profileController.checkAuthentication,
    profileController.checkProfileOwnership,
    upload.single('avatar'),
    profileController.uploadAvatar
  );

  // Add portfolio item
  router.post(
    '/profiles/:userId/portfolio', 
    profileController.checkAuthentication,
    profileController.checkProfileOwnership,
    profileController.addPortfolioItem
  );

  // Update portfolio item
  router.put(
    '/profiles/:userId/portfolio/:itemId', 
    profileController.checkAuthentication,
    profileController.checkProfileOwnership,
    profileController.updatePortfolioItem
  );

  // Delete portfolio item
  router.delete(
    '/profiles/:userId/portfolio/:itemId', 
    profileController.checkAuthentication,
    profileController.checkProfileOwnership,
    profileController.deletePortfolioItem
  );
}

/**
 * Sets up company profile routes for employer users
 * 
 * @param router - Express router instance
 * @param profileController - Profile controller instance
 */
function setupCompanyProfileRoutes(router: Router, profileController: ProfileController): void {
  // Create a company profile
  router.post(
    '/profiles/:userId/company', 
    profileController.checkAuthentication,
    profileController.checkProfileOwnership,
    profileController.checkRole([UserRole.EMPLOYER, UserRole.ADMIN]),
    profileController.createCompanyProfile
  );

  // Update a company profile
  router.put(
    '/profiles/:userId/company', 
    profileController.checkAuthentication,
    profileController.checkProfileOwnership,
    profileController.checkRole([UserRole.EMPLOYER, UserRole.ADMIN]),
    profileController.updateCompanyProfile
  );

  // Upload company logo
  router.put(
    '/profiles/:userId/company/logo', 
    profileController.checkAuthentication,
    profileController.checkProfileOwnership,
    profileController.checkRole([UserRole.EMPLOYER, UserRole.ADMIN]),
    upload.single('logo'),
    profileController.uploadCompanyLogo
  );
}

/**
 * Sets up admin-only routes for profile management
 * 
 * @param router - Express router instance
 * @param profileController - Profile controller instance
 */
function setupAdminProfileRoutes(router: Router, profileController: ProfileController): void {
  // Verify user identity (admin only)
  router.put(
    '/admin/profiles/:userId/verify-identity', 
    profileController.checkAuthentication,
    profileController.checkRole([UserRole.ADMIN]),
    profileController.verifyIdentity
  );

  // Verify user skills (admin only)
  router.put(
    '/admin/profiles/:userId/verify-skills', 
    profileController.checkAuthentication,
    profileController.checkRole([UserRole.ADMIN]),
    profileController.verifySkills
  );

  // Set top rated status (admin only)
  router.put(
    '/admin/profiles/:userId/top-rated', 
    profileController.checkAuthentication,
    profileController.checkRole([UserRole.ADMIN]),
    profileController.setTopRated
  );
}

/**
 * Configures all profile routes with the provided controller
 * 
 * @param profileController - Profile controller instance
 * @returns Configured Express router
 */
export default function(profileController: ProfileController): Router {
  // Set up all profile route groups
  setupProfileRoutes(router, profileController);
  setupCompanyProfileRoutes(router, profileController);
  setupAdminProfileRoutes(router, profileController);
  
  return router;
}