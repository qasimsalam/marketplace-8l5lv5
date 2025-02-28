# AWS Region and Environment Configuration
aws_region  = "us-east-1"
project     = "ai-talent-marketplace"
environment = "dev"

# VPC Configuration
vpc_cidr             = "10.0.0.0/16"
azs                  = ["us-east-1a", "us-east-1b", "us-east-1c"]
enable_vpc_flow_logs = true

# EKS Cluster Configuration
eks_cluster_version = "1.27"
eks_node_groups = {
  general = {
    instance_types = ["t3.medium"]
    min_size       = 1
    max_size       = 3
    desired_size   = 2
    disk_size      = 50
  }
  cpu_optimized = {
    instance_types = ["c6i.large"]
    min_size       = 1
    max_size       = 2
    desired_size   = 1
    disk_size      = 100
  }
}
enable_eks_public_endpoint = true

# RDS PostgreSQL Configuration
rds_instance_class          = "db.t3.medium"
rds_allocated_storage       = 20
rds_multi_az                = false  # Single AZ for development to reduce costs
rds_database_name           = "aitalentmarketplace"
rds_backup_retention_period = 7

# ElastiCache Redis Configuration
elasticache_node_type       = "cache.t3.small"
elasticache_num_cache_nodes = 1

# OpenSearch Configuration
opensearch_instance_type   = "t3.small.search"
opensearch_instance_count  = 1

# DocumentDB Configuration
documentdb_instance_class  = "db.t3.medium"
documentdb_cluster_size    = 1

# Monitoring and Security
enable_monitoring = true
alerting_email    = "devops@aitalentmarketplace.com"
enable_waf        = true

# Storage
s3_bucket_name = "ai-talent-marketplace-dev-storage"

# Common Tags
tags = {
  Project     = "ai-talent-marketplace"
  Environment = "dev"
  ManagedBy   = "terraform"
  Creator     = "DevOps Team"
}