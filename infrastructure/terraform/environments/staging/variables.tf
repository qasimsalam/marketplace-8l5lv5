# AWS Region and General Settings
variable "aws_region" {
  description = "AWS region for the staging environment"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "ai-talent-marketplace"
}

variable "environment" {
  description = "Deployment environment identifier"
  type        = string
  default     = "staging"
}

# Network Settings
variable "vpc_cidr" {
  description = "CIDR block for the staging VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "Availability zones to use in the selected region"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "enable_vpc_flow_logs" {
  description = "Whether to enable VPC flow logs for network monitoring"
  type        = bool
  default     = true
}

# EKS Configuration
variable "eks_cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.27"
}

variable "eks_node_groups" {
  description = "Configuration for EKS node groups in staging environment"
  type = map(object({
    instance_types = list(string)
    min_size       = number
    max_size       = number
    desired_size   = number
    disk_size      = number
  }))
  default = {
    general = {
      instance_types = ["t3.large"]
      min_size       = 2
      max_size       = 4
      desired_size   = 2
      disk_size      = 50
    }
    cpu_optimized = {
      instance_types = ["c6i.xlarge"]
      min_size       = 1
      max_size       = 3
      desired_size   = 1
      disk_size      = 100
    }
    memory_optimized = {
      instance_types = ["r6i.xlarge"]
      min_size       = 1
      max_size       = 3
      desired_size   = 1
      disk_size      = 100
    }
  }
}

variable "enable_eks_public_endpoint" {
  description = "Whether to enable public access to the EKS API endpoint"
  type        = bool
  default     = false
}

# RDS PostgreSQL Configuration
variable "rds_instance_class" {
  description = "Instance class for the PostgreSQL RDS database in staging"
  type        = string
  default     = "db.t3.large"
}

variable "rds_allocated_storage" {
  description = "Allocated storage in GB for the PostgreSQL RDS database"
  type        = number
  default     = 50
}

variable "rds_multi_az" {
  description = "Whether to enable Multi-AZ deployment for the RDS database"
  type        = bool
  default     = true
}

variable "rds_database_name" {
  description = "Name of the PostgreSQL database to create"
  type        = string
  default     = "aitalentmarketplace"
}

variable "rds_backup_retention_period" {
  description = "Number of days to retain automatic database backups"
  type        = number
  default     = 14
}

# ElastiCache Redis Configuration
variable "elasticache_node_type" {
  description = "Node type for the ElastiCache Redis cluster"
  type        = string
  default     = "cache.t3.medium"
}

variable "elasticache_num_cache_nodes" {
  description = "Number of cache nodes for the ElastiCache Redis cluster"
  type        = number
  default     = 2
}

# OpenSearch Configuration
variable "opensearch_instance_type" {
  description = "Instance type for the OpenSearch domain"
  type        = string
  default     = "r6g.large.search"
}

variable "opensearch_instance_count" {
  description = "Number of instances for the OpenSearch domain"
  type        = number
  default     = 2
}

variable "opensearch_volume_size" {
  description = "Volume size in GB for the OpenSearch domain"
  type        = number
  default     = 100
}

# DocumentDB (MongoDB) Configuration
variable "documentdb_instance_class" {
  description = "Instance class for the DocumentDB cluster"
  type        = string
  default     = "db.r5.large"
}

variable "documentdb_cluster_size" {
  description = "Number of instances for the DocumentDB cluster"
  type        = number
  default     = 2
}

# Monitoring, Backup and Security
variable "enable_monitoring" {
  description = "Whether to enable CloudWatch monitoring for all resources"
  type        = bool
  default     = true
}

variable "alerting_email" {
  description = "Email address for monitoring alerts"
  type        = string
  default     = "devops@aitalentmarketplace.com"
}

variable "enable_waf" {
  description = "Whether to enable WAF for the API Gateway and load balancers"
  type        = bool
  default     = true
}

variable "enable_backup" {
  description = "Whether to enable automated backups for databases"
  type        = bool
  default     = true
}

# S3 Storage
variable "s3_bucket_name" {
  description = "Name of the S3 bucket for file storage"
  type        = string
  default     = "ai-talent-marketplace-staging-storage"
}

# Tagging
variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "ai-talent-marketplace"
    Environment = "staging"
    ManagedBy   = "terraform"
    Creator     = "DevOps Team"
  }
}