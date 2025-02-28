variable "project" {
  description = "Project name for resource tagging and naming convention"
  type        = string
  default     = "ai-talent-marketplace"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "vpc_id" {
  description = "VPC ID where Redis cluster will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for Redis deployment (should be private subnets)"
  type        = list(string)
}

variable "node_type" {
  description = "ElastiCache node type for Redis instances"
  type        = string
  default     = "cache.t4g.medium"
}

variable "num_cache_nodes" {
  description = "Number of cache nodes in the Redis cluster"
  type        = number
  default     = 3
}

variable "app_security_group_id" {
  description = "Security group ID of the application (EKS nodes) that will access Redis"
  type        = string
}

variable "auth_token" {
  description = "Auth token for Redis authentication (transit encryption must be enabled)"
  type        = string
  sensitive   = true
}

variable "maintenance_window" {
  description = "Preferred maintenance window for Redis cluster"
  type        = string
  default     = "sun:05:00-sun:09:00"
}

variable "snapshot_window" {
  description = "Daily time range during which automated backups are created"
  type        = string
  default     = "03:00-05:00"
}

variable "notification_topic_arn" {
  description = "SNS topic ARN for ElastiCache notifications"
  type        = string
  default     = ""
}

variable "alarm_actions" {
  description = "List of ARNs to trigger on CloudWatch alarm for Redis metrics"
  type        = list(string)
  default     = []
}

variable "ok_actions" {
  description = "List of ARNs to trigger when CloudWatch alarm for Redis metrics is cleared"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Additional resource tags to apply to all ElastiCache resources"
  type        = map(string)
  default     = {}
}