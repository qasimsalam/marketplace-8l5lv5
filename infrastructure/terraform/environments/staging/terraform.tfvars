# ---------------------------------------------------------------------------------------------------------------------
# AWS GENERAL SETTINGS
# ---------------------------------------------------------------------------------------------------------------------
aws_region  = "us-east-1"
project     = "ai-talent-marketplace"
environment = "staging"

# ---------------------------------------------------------------------------------------------------------------------
# NETWORKING
# ---------------------------------------------------------------------------------------------------------------------
vpc_cidr             = "10.1.0.0/16"
azs                  = ["us-east-1a", "us-east-1b", "us-east-1c"]
enable_vpc_flow_logs = true

# ---------------------------------------------------------------------------------------------------------------------
# EKS CLUSTER CONFIGURATION
# ---------------------------------------------------------------------------------------------------------------------
eks_cluster_version      = "1.27"
enable_eks_public_endpoint = false

# Node group configurations for different workload types
eks_node_groups = {
  general = {
    instance_types = ["t3.large"]
    min_size       = 2
    max_size       = 4
    desired_size   = 2
    disk_size      = 50
  },
  cpu_optimized = {
    instance_types = ["c6i.xlarge"]
    min_size       = 1
    max_size       = 3
    desired_size   = 1
    disk_size      = 100
  },
  memory_optimized = {
    instance_types = ["r6i.xlarge"]
    min_size       = 1
    max_size       = 3
    desired_size   = 1
    disk_size      = 100
  }
}

# ---------------------------------------------------------------------------------------------------------------------
# RDS POSTGRESQL CONFIGURATION
# ---------------------------------------------------------------------------------------------------------------------
rds_instance_class        = "db.t3.large"
rds_allocated_storage     = 50
rds_multi_az              = true
rds_database_name         = "aitalentmarketplace"
rds_backup_retention_period = 14

# ---------------------------------------------------------------------------------------------------------------------
# ELASTICACHE REDIS CONFIGURATION
# ---------------------------------------------------------------------------------------------------------------------
elasticache_node_type      = "cache.t3.medium"
elasticache_num_cache_nodes = 2

# ---------------------------------------------------------------------------------------------------------------------
# OPENSEARCH CONFIGURATION
# ---------------------------------------------------------------------------------------------------------------------
opensearch_instance_type  = "r6g.large.search"
opensearch_instance_count = 2
opensearch_volume_size    = 100

# ---------------------------------------------------------------------------------------------------------------------
# DOCUMENTDB (MONGODB) CONFIGURATION
# ---------------------------------------------------------------------------------------------------------------------
documentdb_instance_class = "db.r5.large"
documentdb_cluster_size   = 2

# ---------------------------------------------------------------------------------------------------------------------
# MONITORING, BACKUP AND SECURITY
# ---------------------------------------------------------------------------------------------------------------------
enable_monitoring = true
alerting_email    = "devops@aitalentmarketplace.com"
enable_waf        = true
enable_backup     = true

# ---------------------------------------------------------------------------------------------------------------------
# STORAGE
# ---------------------------------------------------------------------------------------------------------------------
s3_bucket_name = "ai-talent-marketplace-staging-storage"

# ---------------------------------------------------------------------------------------------------------------------
# RESOURCE TAGGING
# ---------------------------------------------------------------------------------------------------------------------
tags = {
  Project     = "ai-talent-marketplace"
  Environment = "staging"
  ManagedBy   = "terraform"
  Creator     = "DevOps Team"
}