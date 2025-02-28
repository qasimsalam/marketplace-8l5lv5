import React, { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import { Card, CardProps, CardVariant } from '../common/Card';
import { Badge, BadgeVariant } from '../common/Badge';
import { Spinner, SpinnerSize } from '../common/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { formatRelativeTime } from '../../utils/date';
import { useToast } from '../../hooks/useToast';
import { Message } from '../../types/message';

/**
 * Enumeration of possible notification types in the system
 */
export enum NotificationType {
  NEW_MESSAGE = 'new_message',
  NEW_PROPOSAL = 'new_proposal',
  JOB_APPLICATION = 'job_application',
  PAYMENT = 'payment',
  SYSTEM = 'system'
}

/**
 * Interface representing a user notification
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link: string;
  entityId: string;
  entityType: string;
}

/**
 * Interface for Notifications component props
 */
export interface NotificationsProps {
  className?: string;
  limit?: number;
  showHeader?: boolean;
  onNotificationClick?: (notification: Notification) => void;
}

/**
 * Fetches notifications data from the API
 * 
 * @param userId - User ID to fetch notifications for
 * @returns Promise resolving to array of notifications
 */
const fetchNotifications = async (userId: string): Promise<Notification[]> => {
  if (!userId) {
    return [];
  }
  
  try {
    const response = await fetch(`/api/v1/users/${userId}/notifications`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }
    
    const data = await response.json();
    
    // Transform the API response to match our Notification interface
    return data.notifications.map((notification: any) => ({
      id: notification.id,
      type: notification.type as NotificationType,
      title: notification.title,
      message: notification.message,
      timestamp: new Date(notification.createdAt),
      read: notification.read,
      link: notification.link || '',
      entityId: notification.entityId || '',
      entityType: notification.entityType || ''
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

/**
 * Returns the appropriate icon/badge based on notification type
 * 
 * @param type - Notification type
 * @returns React element representing the notification icon
 */
const getNotificationIcon = (type: NotificationType): JSX.Element => {
  switch (type) {
    case NotificationType.NEW_MESSAGE:
      return <Badge variant={BadgeVariant.PRIMARY}>Message</Badge>;
    
    case NotificationType.NEW_PROPOSAL:
      return <Badge variant={BadgeVariant.SUCCESS}>Proposal</Badge>;
    
    case NotificationType.JOB_APPLICATION:
      return <Badge variant={BadgeVariant.SUCCESS}>Application</Badge>;
    
    case NotificationType.PAYMENT:
      return <Badge variant={BadgeVariant.WARNING}>Payment</Badge>;
    
    case NotificationType.SYSTEM:
      return <Badge variant={BadgeVariant.DANGER}>Alert</Badge>;
    
    default:
      return <Badge variant={BadgeVariant.INFO}>Info</Badge>;
  }
};

/**
 * Marks a notification as read in the system
 * 
 * @param notificationId - ID of the notification to mark as read
 * @returns Promise resolving when the notification is marked as read
 */
const markAsRead = async (notificationId: string): Promise<void> => {
  try {
    const response = await fetch(`/api/v1/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }
};

/**
 * A component that displays a list of user notifications with appropriate icons and read/unread status
 * 
 * @param props - Component props
 * @returns The rendered Notifications component
 */
export const Notifications: React.FC<NotificationsProps> = ({
  className = '',
  limit = 5,
  showHeader = true,
  onNotificationClick
}) => {
  // Get current user from auth context
  const { user } = useAuth();
  
  // Component state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  // Get toast function for error handling
  const toast = useToast();
  
  // Fetch notifications data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const fetchedNotifications = await fetchNotifications(user.id);
      setNotifications(fetchedNotifications);
      
      // Calculate unread count
      const unreadNotifications = fetchedNotifications.filter(notification => !notification.read);
      setUnreadCount(unreadNotifications.length);
    } catch (error) {
      toast.error('Failed to load notifications');
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);
  
  // Fetch notifications when user changes
  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user, fetchData]);
  
  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
        
        // Update local state to reflect the change
        setNotifications(prevNotifications => 
          prevNotifications.map(n => 
            n.id === notification.id ? { ...n, read: true } : n
          )
        );
        
        // Update unread count
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      } catch (error) {
        toast.error('Failed to mark notification as read');
      }
    }
    
    // Call the external click handler if provided
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };
  
  // Render the component
  return (
    <Card 
      className={className}
      variant={CardVariant.DEFAULT} 
      header={showHeader ? (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant={BadgeVariant.PRIMARY} size="small">
              {unreadCount}
            </Badge>
          )}
        </div>
      ) : undefined}
    >
      {loading ? (
        <div className="flex justify-center items-center py-6">
          <Spinner size={SpinnerSize.MEDIUM} />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No notifications yet
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {notifications.slice(0, limit).map(notification => (
            <li 
              key={notification.id}
              className={`py-3 px-1 ${!notification.read ? 'bg-blue-50' : ''} ${onNotificationClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              onClick={() => onNotificationClick && handleNotificationClick(notification)}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-2 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${!notification.read ? 'text-blue-900' : 'text-gray-900'}`}>
                    {notification.title}
                  </p>
                  <p className={`text-sm truncate ${!notification.read ? 'text-blue-800' : 'text-gray-500'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatRelativeTime(notification.timestamp)}
                  </p>
                </div>
                {!notification.read && (
                  <div className="flex-shrink-0 self-center ml-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  </div>
                )}
              </div>
            </li>
          ))}
          
          {notifications.length > limit && (
            <li className="py-2 text-center">
              <a 
                href="/notifications" 
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                View all notifications
              </a>
            </li>
          )}
        </ul>
      )}
    </Card>
  );
};

export default Notifications;