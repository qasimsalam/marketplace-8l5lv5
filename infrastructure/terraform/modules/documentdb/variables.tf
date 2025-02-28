# -----------------------------------------------------------------------------
# Variables for AWS DocumentDB Module
# -----------------------------------------------------------------------------

variable "project" {
  type        = string
  description = "Project name for resource naming and tagging"
  validation {
    condition     = can(regex("^[a-zA-Z0-9-_]+$", var.project))
    error_message = "The project value must be a valid string identifier for AWS resources (letters, numbers, hyphens, underscores)."
  }
}

variable "environment" {
  type        = string
  description = "Environment name (e.g. dev, staging, prod) for resource naming and tagging"
  validation {
    condition     = contains(["dev", "staging", "test", "prod", "production"], var.environment)
    error_message = "The environment value must be one of: dev, staging, test, prod, production."
  }
}

variable "vpc_id" {
  type        = string
  description = "ID of the VPC where DocumentDB will be deployed"
  validation {
    condition     = can(regex("^vpc-[a-z0-9]+$", var.vpc_id))
    error_message = "The vpc_id value must be a valid VPC ID starting with 'vpc-'."
  }
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs where DocumentDB will be deployed (should be private subnets)"
  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "You must provide at least 2 subnet IDs for high availability."
  }
}

variable "instance_class" {
  type        = string
  description = "Instance class for the DocumentDB cluster instances"
  default     = "db.t3.medium"
  validation {
    condition     = can(regex("^db\\.[a-z0-9]+\\.[a-z0-9]+$", var.instance_class))
    error_message = "The instance_class value must be a valid DocumentDB instance class (e.g., db.t3.medium, db.r5.large)."
  }
}

variable "cluster_size" {
  type        = number
  description = "Number of instances in the DocumentDB cluster (including primary)"
  default     = 3
  validation {
    condition     = var.cluster_size >= 1 && var.cluster_size <= 16
    error_message = "The cluster_size value must be between 1 and 16."
  }
}

variable "master_username" {
  type        = string
  description = "Username for the DocumentDB master user"
  default     = "admin"
  validation {
    condition     = length(var.master_username) >= 1 && length(var.master_username) <= 63 && !can(regex("^aws", var.master_username))
    error_message = "The master_username must be 1-63 characters long and cannot start with 'aws'."
  }
}

variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain automated backups"
  default     = 14
  validation {
    condition     = var.backup_retention_period >= 1 && var.backup_retention_period <= 35
    error_message = "The backup_retention_period value must be between 1 and 35 days."
  }
}

variable "backup_window" {
  type        = string
  description = "Daily time range during which backups happen"
  default     = "03:00-05:00"
  validation {
    condition     = can(regex("^[0-9]{2}:[0-9]{2}-[0-9]{2}:[0-9]{2}$", var.backup_window))
    error_message = "The backup_window value must be in the format HH:MM-HH:MM."
  }
}

variable "maintenance_window" {
  type        = string
  description = "Weekly time range during which maintenance can occur"
  default     = "sun:06:00-sun:09:00"
  validation {
    condition     = can(regex("^[a-z]{3}:[0-9]{2}:[0-9]{2}-[a-z]{3}:[0-9]{2}:[0-9]{2}$", var.maintenance_window))
    error_message = "The maintenance_window value must be in the format ddd:HH:MM-ddd:HH:MM."
  }
}

variable "apply_immediately" {
  type        = bool
  description = "Whether changes should be applied immediately or during maintenance window"
  default     = false
}

variable "deletion_protection" {
  type        = bool
  description = "Whether to enable deletion protection for the DocumentDB cluster"
  default     = true
}

variable "skip_final_snapshot" {
  type        = bool
  description = "Whether to skip final snapshot when the cluster is deleted"
  default     = false
}

variable "kms_key_deletion_window_in_days" {
  type        = number
  description = "Waiting period before KMS key is deleted"
  default     = 30
  validation {
    condition     = var.kms_key_deletion_window_in_days >= 7 && var.kms_key_deletion_window_in_days <= 30
    error_message = "The kms_key_deletion_window_in_days value must be between 7 and 30 days."
  }
}

variable "max_connections_threshold" {
  type        = number
  description = "Threshold for the maximum number of connections alarm"
  default     = 500
  validation {
    condition     = var.max_connections_threshold > 0
    error_message = "The max_connections_threshold value must be greater than 0."
  }
}

variable "sns_topic_arn" {
  type        = string
  description = "ARN of the SNS topic for CloudWatch alarm notifications"
  default     = null
  validation {
    condition     = var.sns_topic_arn == null || can(regex("^arn:aws:sns:[a-z0-9-]+:[0-9]{12}:[a-zA-Z0-9-_]+$", var.sns_topic_arn))
    error_message = "If provided, the sns_topic_arn value must be a valid SNS topic ARN."
  }
}

variable "tags" {
  type        = map(string)
  description = "Additional tags to apply to all resources"
  default     = {}
}