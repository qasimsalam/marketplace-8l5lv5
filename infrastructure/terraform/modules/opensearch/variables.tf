# Project information
variable "project" {
  type        = string
  description = "Project name used in resource naming and tagging"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod) for resource naming and configuration"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# Network configuration
variable "vpc_id" {
  type        = string
  description = "ID of the VPC where OpenSearch will be deployed"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs where OpenSearch will be deployed (multi-AZ)"
}

# Instance configuration
variable "instance_type" {
  type        = string
  description = "Instance type for OpenSearch data nodes"
  default     = "r6g.large.search"
}

variable "instance_count" {
  type        = number
  description = "Number of data nodes in the OpenSearch cluster"
  default     = 3
  
  validation {
    condition     = var.instance_count >= 1
    error_message = "OpenSearch cluster must have at least 1 instance."
  }
}

# Master node configuration
variable "dedicated_master_enabled" {
  type        = bool
  description = "Whether to use dedicated master nodes for the OpenSearch cluster"
  default     = false
}

variable "dedicated_master_type" {
  type        = string
  description = "Instance type for OpenSearch dedicated master nodes"
  default     = "r6g.large.search"
}

variable "dedicated_master_count" {
  type        = number
  description = "Number of dedicated master nodes in the OpenSearch cluster"
  default     = 3
}

# Storage configuration
variable "ebs_volume_size" {
  type        = number
  description = "Size of EBS volumes attached to OpenSearch nodes in GB"
  default     = 100
}

# Authentication
variable "master_user_name" {
  type        = string
  description = "Username for OpenSearch master user"
  default     = "admin"
}

variable "master_user_password" {
  type        = string
  description = "Password for OpenSearch master user"
  sensitive   = true
}

# Security configuration
variable "source_security_group_ids" {
  type        = list(string)
  description = "List of security group IDs that can access the OpenSearch domain"
  default     = []
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "List of CIDR blocks that can access the OpenSearch domain"
  default     = []
}

# Monitoring configuration
variable "alarm_actions" {
  type        = list(string)
  description = "List of ARNs for alarm action targets (e.g., SNS topics)"
  default     = []
}

variable "ok_actions" {
  type        = list(string)
  description = "List of ARNs for alarm OK action targets (e.g., SNS topics)"
  default     = []
}

# IAM configuration
variable "create_service_linked_role" {
  type        = bool
  description = "Whether to create the OpenSearch service linked role"
  default     = true
}

# Tags
variable "tags" {
  type        = map(string)
  description = "Map of tags to apply to all OpenSearch resources"
  default     = {}
}