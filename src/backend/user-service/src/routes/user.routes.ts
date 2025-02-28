import express, { Router } from 'express'; // v4.18.2
import multer from 'multer'; // v1.4.5-lts.1
import { UserController } from '../controllers/user.controller';
import { UserRole } from '../../shared/src/types/user.types';
import { config } from '../config';

// Initialize router
const router = express.Router();

/**
 * Sets up basic user management routes that are accessible to authenticated users
 * @param router - Express router instance
 * @param userController - User controller instance
 */
function setupUserRoutes(router: Router, userController: UserController): void {
  // Get user by ID
  router.get(
    '/users/:userId',
    userController.checkAuthentication,
    userController.getUser
  );

  // Get user profile by ID
  router.get(
    '/users/profile/:userId',
    userController.checkAuthentication,
    userController.getUserProfile
  );

  // Update user
  router.put(
    '/users/:userId',
    userController.checkAuthentication,
    userController.updateUser
  );

  // Delete user
  router.delete(
    '/users/:userId',
    userController.checkAuthentication,
    userController.deleteUser
  );

  // Search users
  router.get(
    '/users/search',
    userController.checkAuthentication,
    userController.searchUsers
  );
}

/**
 * Sets up admin-only routes for user management
 * @param router - Express router instance
 * @param userController - User controller instance
 */
function setupAdminRoutes(router: Router, userController: UserController): void {
  // Update user status (activate/deactivate)
  router.put(
    '/admin/users/:userId/status',
    userController.checkAuthentication,
    userController.checkRole([UserRole.ADMIN]),
    userController.updateUserStatus
  );

  // Update user role
  router.put(
    '/admin/users/:userId/role',
    userController.checkAuthentication,
    userController.checkRole([UserRole.ADMIN]),
    userController.updateUserRole
  );

  // Verify user identity
  router.put(
    '/admin/users/:userId/verify-identity',
    userController.checkAuthentication,
    userController.checkRole([UserRole.ADMIN]),
    userController.verifyUserIdentity
  );

  // Verify user skills
  router.put(
    '/admin/users/:userId/verify-skills',
    userController.checkAuthentication,
    userController.checkRole([UserRole.ADMIN]),
    userController.verifyUserSkills
  );

  // Get user statistics
  router.get(
    '/admin/users/stats',
    userController.checkAuthentication,
    userController.checkRole([UserRole.ADMIN]),
    userController.getUserStats
  );
}

export default router;