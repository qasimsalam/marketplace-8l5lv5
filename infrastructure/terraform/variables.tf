# Project and Environment Variables
variable "project" {
  type        = string
  default     = "ai-talent-marketplace"
  description = "Project name used for resource naming and tagging"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"
}

# AWS Region Configuration
variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Primary AWS region for resource deployment"
}

variable "secondary_aws_regions" {
  type        = list(string)
  default     = ["us-west-2", "eu-west-1"]
  description = "Secondary AWS regions for multi-region deployment"
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability zones for the selected region"
}

# GCP Configuration for Disaster Recovery
variable "gcp_project_id" {
  type        = string
  description = "Google Cloud project ID for disaster recovery"
}

variable "gcp_region" {
  type        = string
  default     = "us-central1"
  description = "Google Cloud region for disaster recovery"
}

# Networking Configuration
variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "CIDR block for the VPC"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  description = "CIDR blocks for public subnets across availability zones"
}

variable "private_subnet_cidrs" {
  type        = list(string)
  default     = ["10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"]
  description = "CIDR blocks for private subnets across availability zones"
}

# EKS Cluster Configuration
variable "eks_cluster_name" {
  type        = string
  default     = null
  description = "Name of the EKS cluster (defaults to {project}-{environment})"
}

variable "eks_cluster_version" {
  type        = string
  default     = "1.27"
  description = "Kubernetes version for the EKS cluster"
}

variable "eks_node_group_instance_types" {
  type = map(list(string))
  default = {
    general = ["t3.xlarge"]
    cpu     = ["c6i.2xlarge"]
    memory  = ["r6i.2xlarge"]
  }
  description = "Instance types for the different EKS node groups"
}

variable "eks_node_group_scaling" {
  type = map(object({
    min_size     = number
    max_size     = number
    desired_size = number
  }))
  default = {
    general = {
      min_size     = 2
      max_size     = 10
      desired_size = 3
    }
    cpu = {
      min_size     = 2
      max_size     = 8
      desired_size = 2
    }
    memory = {
      min_size     = 2
      max_size     = 6
      desired_size = 2
    }
  }
  description = "Scaling configuration for the different EKS node groups"
}

# RDS PostgreSQL Configuration
variable "rds_instance_class" {
  type        = string
  default     = "db.r6g.large"
  description = "Instance class for the RDS PostgreSQL database"
}

variable "rds_allocated_storage" {
  type        = number
  default     = 100
  description = "Allocated storage in GB for the RDS PostgreSQL database"
}

variable "rds_max_allocated_storage" {
  type        = number
  default     = 1000
  description = "Maximum allocated storage in GB for the RDS PostgreSQL database"
}

variable "rds_engine_version" {
  type        = string
  default     = "15"
  description = "Engine version for the RDS PostgreSQL database"
}

variable "rds_multi_az" {
  type        = bool
  default     = true
  description = "Whether to enable Multi-AZ deployment for the RDS PostgreSQL database"
}

variable "rds_backup_retention_period" {
  type        = number
  default     = 30
  description = "Backup retention period in days for the RDS PostgreSQL database"
}

variable "rds_deletion_protection" {
  type        = bool
  default     = true
  description = "Whether to enable deletion protection for the RDS PostgreSQL database"
}

# ElastiCache Redis Configuration
variable "elasticache_node_type" {
  type        = string
  default     = "cache.r6g.large"
  description = "Node type for the ElastiCache Redis cluster"
}

variable "elasticache_engine_version" {
  type        = string
  default     = "7.0"
  description = "Engine version for the ElastiCache Redis cluster"
}

variable "elasticache_num_cache_nodes" {
  type        = number
  default     = 3
  description = "Number of cache nodes for the ElastiCache Redis cluster"
}

variable "elasticache_parameter_group_name" {
  type        = string
  default     = "default.redis7"
  description = "Parameter group name for the ElastiCache Redis cluster"
}

# OpenSearch Configuration
variable "opensearch_engine_version" {
  type        = string
  default     = "OpenSearch_2.5"
  description = "Engine version for the OpenSearch domain"
}

variable "opensearch_instance_type" {
  type        = string
  default     = "r6g.large.search"
  description = "Instance type for the OpenSearch domain"
}

variable "opensearch_instance_count" {
  type        = number
  default     = 3
  description = "Number of instances for the OpenSearch domain"
}

variable "opensearch_ebs_volume_size" {
  type        = number
  default     = 100
  description = "EBS volume size in GB for the OpenSearch domain"
}

# DocumentDB Configuration
variable "documentdb_instance_class" {
  type        = string
  default     = "db.r6g.large"
  description = "Instance class for the DocumentDB cluster"
}

variable "documentdb_engine_version" {
  type        = string
  default     = "6.0"
  description = "Engine version for the DocumentDB cluster"
}

variable "documentdb_instance_count" {
  type        = number
  default     = 3
  description = "Number of instances for the DocumentDB cluster"
}

variable "documentdb_backup_retention_period" {
  type        = number
  default     = 30
  description = "Backup retention period in days for the DocumentDB cluster"
}

# S3 Bucket Configuration
variable "s3_log_bucket_name" {
  type        = string
  default     = null
  description = "Name of the S3 bucket for logs (defaults to {project}-{environment}-logs)"
}

variable "s3_asset_bucket_name" {
  type        = string
  default     = null
  description = "Name of the S3 bucket for static assets (defaults to {project}-{environment}-assets)"
}

variable "s3_backup_bucket_name" {
  type        = string
  default     = null
  description = "Name of the S3 bucket for backups (defaults to {project}-{environment}-backups)"
}

# CloudFront Configuration
variable "cloudfront_price_class" {
  type        = string
  default     = "PriceClass_All"
  description = "Price class for the CloudFront distribution"
}

# DNS Configuration
variable "route53_domain_name" {
  type        = string
  description = "Domain name for Route53 DNS management"
}

variable "acm_certificate_domain" {
  type        = string
  description = "Domain name for the ACM certificate"
}

# Security Configuration
variable "waf_enabled" {
  type        = bool
  default     = true
  description = "Whether to enable WAF for the CloudFront distribution and ALB"
}

variable "shield_advanced_enabled" {
  type        = bool
  default     = true
  description = "Whether to enable Shield Advanced for DDoS protection"
}

# Monitoring Configuration
variable "monitoring_enabled" {
  type        = bool
  default     = true
  description = "Whether to enable CloudWatch monitoring for all resources"
}

# Tagging
variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags to apply to all resources"
}