# ===========================================================
# General Configuration
# ===========================================================

variable "aws_primary_region" {
  description = "Primary AWS region for deploying resources. Used as the main active region in multi-region setup."
  type        = string
  default     = "us-east-1"
}

variable "aws_secondary_region" {
  description = "Secondary AWS region for deploying resources. Used as the second active region in multi-region setup."
  type        = string
  default     = "us-west-2"
}

variable "aws_tertiary_region" {
  description = "Tertiary AWS region for deploying resources. Used as the third active region in multi-region setup for global resilience."
  type        = string
  default     = "eu-west-1"
}

variable "project" {
  description = "Name of the project, used for tagging and naming resources."
  type        = string
  default     = "ai-talent-marketplace"
}

variable "environment" {
  description = "Deployment environment name, used for tagging and naming resources."
  type        = string
  default     = "prod"
}

variable "tags" {
  description = "Default tags to apply to all resources created by Terraform."
  type        = map(string)
  default     = {
    Project     = "AI Talent Marketplace"
    Environment = "Production"
    ManagedBy   = "Terraform"
    Owner       = "DevOps Team"
  }
}

# ===========================================================
# Network Configuration
# ===========================================================

variable "vpc_cidr_primary" {
  description = "CIDR block for the primary region VPC. Should be large enough to accommodate multiple subnets across availability zones."
  type        = string
  default     = "10.0.0.0/16"
}

variable "vpc_cidr_secondary" {
  description = "CIDR block for the secondary region VPC. Should be non-overlapping with primary region VPC."
  type        = string
  default     = "10.1.0.0/16"
}

variable "vpc_cidr_tertiary" {
  description = "CIDR block for the tertiary region VPC. Should be non-overlapping with primary and secondary region VPCs."
  type        = string
  default     = "10.2.0.0/16"
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC flow logs for network traffic monitoring and security analysis."
  type        = bool
  default     = true
}

variable "vpc_flow_logs_retention" {
  description = "Number of days to retain VPC flow logs in CloudWatch Logs."
  type        = number
  default     = 90
}

variable "create_route53_zone" {
  description = "Whether to create a new Route53 hosted zone for the domain."
  type        = bool
  default     = true
}

variable "route53_domain_name" {
  description = "Domain name for the AI Talent Marketplace application."
  type        = string
  default     = "aitalentmarketplace.com"
}

# ===========================================================
# Kubernetes (EKS) Configuration
# ===========================================================

variable "eks_cluster_version" {
  description = "Kubernetes version to use for the EKS cluster. Should be a stable, supported version."
  type        = string
  default     = "1.27"
}

variable "eks_node_groups" {
  description = "Configuration for EKS node groups with different instance types optimized for various workloads."
  type        = map(object({
    instance_types = list(string)
    min_size       = number
    max_size       = number
    desired_size   = number
    disk_size      = number
  }))
  default     = {
    general = {
      instance_types = ["t3.xlarge"]
      min_size       = 3
      max_size       = 10
      desired_size   = 4
      disk_size      = 100
    }
    cpu_optimized = {
      instance_types = ["c6i.2xlarge"]
      min_size       = 2
      max_size       = 8
      desired_size   = 3
      disk_size      = 100
    }
    memory_optimized = {
      instance_types = ["r6i.2xlarge"]
      min_size       = 2
      max_size       = 6
      desired_size   = 3
      disk_size      = 100
    }
  }
}

# ===========================================================
# Database Configuration
# ===========================================================

# PostgreSQL RDS Configuration
variable "rds_instance_class" {
  description = "Instance class for PostgreSQL RDS instances. Use memory-optimized instances for production workloads."
  type        = string
  default     = "db.r5.large"
}

variable "rds_allocated_storage" {
  description = "Initial allocated storage for PostgreSQL RDS instances in GB."
  type        = number
  default     = 100
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage for PostgreSQL RDS instances in GB. Enables storage autoscaling."
  type        = number
  default     = 1000
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ deployment for PostgreSQL RDS instances for high availability."
  type        = bool
  default     = true
}

variable "rds_backup_retention_period" {
  description = "Number of days to retain automated backups for PostgreSQL RDS instances."
  type        = number
  default     = 30
}

variable "rds_database_name" {
  description = "Name of the initial database to create in PostgreSQL RDS instance."
  type        = string
  default     = "ai_talent_marketplace"
}

# ElastiCache (Redis) Configuration
variable "elasticache_node_type" {
  description = "Node type for ElastiCache Redis cluster. Memory-optimized instance types are recommended for production."
  type        = string
  default     = "cache.r5.large"
}

variable "elasticache_num_cache_nodes" {
  description = "Number of cache nodes in the ElastiCache Redis cluster. At least 3 nodes recommended for production."
  type        = number
  default     = 3
}

# OpenSearch Configuration
variable "opensearch_instance_type" {
  description = "Instance type for OpenSearch cluster. Use Graviton-based instances for better price/performance."
  type        = string
  default     = "r6g.2xlarge.search"
}

variable "opensearch_instance_count" {
  description = "Number of instances in the OpenSearch cluster. At least 3 instances recommended for production."
  type        = number
  default     = 3
}

variable "opensearch_master_user" {
  description = "Master username for OpenSearch cluster. Should be provided via secure methods in production."
  type        = string
  default     = null
  sensitive   = true
}

variable "opensearch_master_password" {
  description = "Master password for OpenSearch cluster. Should be provided via secure methods in production."
  type        = string
  default     = null
  sensitive   = true
}

# DocumentDB Configuration
variable "documentdb_instance_class" {
  description = "Instance class for DocumentDB cluster. Memory-optimized instances recommended for production."
  type        = string
  default     = "db.r5.large"
}

variable "documentdb_instance_count" {
  description = "Number of instances in the DocumentDB cluster. At least 3 instances recommended for production high availability."
  type        = number
  default     = 3
}

variable "documentdb_master_username" {
  description = "Master username for DocumentDB cluster. Should be provided via secure methods in production."
  type        = string
  default     = null
  sensitive   = true
}

variable "documentdb_master_password" {
  description = "Master password for DocumentDB cluster. Should be provided via secure methods in production."
  type        = string
  default     = null
  sensitive   = true
}

# ===========================================================
# Security Configuration
# ===========================================================

variable "enable_waf" {
  description = "Enable AWS WAF for web application firewall protection against common web exploits."
  type        = bool
  default     = true
}

variable "enable_shield" {
  description = "Enable AWS Shield for DDoS protection for the application's public endpoints."
  type        = bool
  default     = true
}

variable "enable_guardduty" {
  description = "Enable AWS GuardDuty for intelligent threat detection to protect AWS accounts and workloads."
  type        = bool
  default     = true
}

variable "alb_arn_list" {
  description = "List of Application Load Balancer ARNs to associate with WAF and Shield for protection."
  type        = list(string)
  default     = []
}

# ===========================================================
# Storage Configuration
# ===========================================================

variable "s3_assets_bucket_name" {
  description = "Name of the S3 bucket for storing application assets and files."
  type        = string
  default     = "ai-talent-marketplace-prod-assets"
}

variable "enable_cross_region_replication" {
  description = "Enable cross-region replication for S3 buckets to enhance disaster recovery capabilities."
  type        = bool
  default     = true
}

# ===========================================================
# Monitoring and Alerting Configuration
# ===========================================================

variable "enable_monitoring" {
  description = "Enable comprehensive monitoring using CloudWatch, including detailed metrics, logs, and dashboards."
  type        = bool
  default     = true
}

variable "alerting_email" {
  description = "Email address to receive monitoring alerts and notifications."
  type        = string
  default     = "ops@aitalentmarketplace.com"
}