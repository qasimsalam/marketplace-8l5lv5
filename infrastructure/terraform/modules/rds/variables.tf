#--------------------------------------------------------------
# General Configuration
#--------------------------------------------------------------

variable "project" {
  description = "Project name for resource naming and identification"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod) for resource naming and configuration"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where database resources will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs spanning multiple availability zones for high availability"
  type        = list(string)
}

#--------------------------------------------------------------
# Database Instance Configuration
#--------------------------------------------------------------

variable "instance_class" {
  description = "Instance class for the primary RDS instance (e.g., db.t3.medium, db.m5.large)"
  type        = string
  default     = "db.t3.medium"
}

variable "replica_instance_class" {
  description = "Instance class for the read replica RDS instance"
  type        = string
  default     = "db.t3.small"
}

variable "allocated_storage" {
  description = "Allocated storage in GB for the RDS instance"
  type        = number
  default     = 100
}

variable "max_allocated_storage" {
  description = "Maximum storage limit for autoscaling in GB"
  type        = number
  default     = 500
}

variable "database_name" {
  description = "Name of the PostgreSQL database to create"
  type        = string
}

variable "database_username" {
  description = "Master username for the PostgreSQL database"
  type        = string
  default     = "postgres"
}

#--------------------------------------------------------------
# High Availability and Disaster Recovery
#--------------------------------------------------------------

variable "multi_az" {
  description = "Whether to enable Multi-AZ deployment for high availability"
  type        = bool
  default     = true
}

variable "create_replica" {
  description = "Whether to create a read replica instance"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 30
}

variable "backup_window" {
  description = "Daily time range during which automated backups are created"
  type        = string
  default     = "03:00-05:00"  # UTC time
}

variable "maintenance_window" {
  description = "Weekly time range during which system maintenance can occur"
  type        = string
  default     = "Sun:07:00-Sun:09:00"  # UTC time
}

variable "skip_final_snapshot" {
  description = "Whether to skip final snapshot when the database is deleted"
  type        = bool
  default     = false
}

#--------------------------------------------------------------
# Monitoring and Performance
#--------------------------------------------------------------

variable "monitoring_interval" {
  description = "Interval in seconds for enhanced monitoring metrics"
  type        = number
  default     = 60
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for database alarms and notifications"
  type        = string
  default     = ""
}

variable "performance_insights_enabled" {
  description = "Whether to enable Performance Insights for database monitoring"
  type        = bool
  default     = true
}

variable "performance_insights_retention_period" {
  description = "Retention period in days for Performance Insights data"
  type        = number
  default     = 7
}

variable "enabled_cloudwatch_logs_exports" {
  description = "List of log types to export to CloudWatch (e.g., postgresql, upgrade)"
  type        = list(string)
  default     = ["postgresql", "upgrade"]
}

#--------------------------------------------------------------
# Security
#--------------------------------------------------------------

variable "deletion_protection" {
  description = "Whether to enable deletion protection for the RDS instance"
  type        = bool
  default     = true
}

#--------------------------------------------------------------
# Tags
#--------------------------------------------------------------

variable "tags" {
  description = "Map of tags to assign to all resources created by the module"
  type        = map(string)
  default     = {}
}