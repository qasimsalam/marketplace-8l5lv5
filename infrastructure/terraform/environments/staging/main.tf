# Terraform configuration block with required providers and backend settings
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.67.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5.1"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23.0"
    }
  }

  # S3 backend for Terraform state storage with DynamoDB locking
  backend "s3" {
    bucket         = "ai-talent-marketplace-staging-tf-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "ai-talent-marketplace-staging-tf-locks"
  }
}

# Configure AWS provider with region and default tags
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Local variables for naming consistency and tag standardization
locals {
  namespace    = var.project
  environment  = var.environment
  name_prefix  = "${var.project}-${var.environment}"
  tags         = var.tags
}

# VPC module for networking infrastructure
module "vpc" {
  source = "../../modules/vpc"

  project              = local.namespace
  environment          = local.environment
  vpc_cidr             = var.vpc_cidr
  azs                  = var.azs
  enable_nat_gateway   = true
  single_nat_gateway   = false
  one_nat_gateway_per_az = true
  enable_vpn_gateway   = false
  enable_flow_log      = var.enable_vpc_flow_logs
  flow_log_retention_in_days = 30
  tags                 = local.tags
}

# EKS module for Kubernetes cluster
module "eks" {
  source = "../../modules/eks"

  project                        = local.namespace
  environment                    = local.environment
  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_version                = var.eks_cluster_version
  node_groups                    = var.eks_node_groups
  enable_public_endpoint         = var.enable_eks_public_endpoint
  enable_private_endpoint        = true
  enable_cluster_encryption      = true
  cluster_log_types              = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  cluster_log_retention_days     = 30
  enable_aws_load_balancer_controller = true
  tags                           = local.tags
}

# RDS module for PostgreSQL database
module "rds" {
  source = "../../modules/rds"

  project                 = local.namespace
  environment             = local.environment
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.database_subnets
  instance_class          = var.rds_instance_class
  allocated_storage       = var.rds_allocated_storage
  multi_az                = var.rds_multi_az
  create_replica          = true
  database_name           = var.rds_database_name
  database_username       = "admin"
  backup_retention_period = var.rds_backup_retention_period
  deletion_protection     = true
  skip_final_snapshot     = false
  performance_insights_enabled = true
  sns_topic_arn           = aws_sns_topic.db_alarms.arn
  tags                    = local.tags
}

# ElastiCache module for Redis caching
module "elasticache" {
  source = "../../modules/elasticache"

  project                = local.namespace
  environment            = local.environment
  vpc_id                 = module.vpc.vpc_id
  subnet_ids             = module.vpc.database_subnets
  node_type              = var.elasticache_node_type
  num_cache_nodes        = var.elasticache_num_cache_nodes
  parameter_group_name   = "default.redis7.cluster.on"
  engine_version         = "7.0"
  automatic_failover_enabled = true
  tags                   = local.tags
}

# OpenSearch module for search and AI matching
module "opensearch" {
  source = "../../modules/opensearch"

  project              = local.namespace
  environment          = local.environment
  vpc_id               = module.vpc.vpc_id
  subnet_ids           = module.vpc.database_subnets
  instance_type        = var.opensearch_instance_type
  instance_count       = var.opensearch_instance_count
  volume_size          = var.opensearch_volume_size
  encrypt_at_rest      = true
  dedicated_master_enabled = true
  dedicated_master_count   = 3
  dedicated_master_type    = "r6g.large.search"
  tags                 = local.tags
}

# DocumentDB module for MongoDB-compatible database
module "documentdb" {
  source = "../../modules/documentdb"

  project                    = local.namespace
  environment                = local.environment
  vpc_id                     = module.vpc.vpc_id
  subnet_ids                 = module.vpc.database_subnets
  instance_class             = var.documentdb_instance_class
  cluster_size               = var.documentdb_cluster_size
  storage_encrypted          = true
  backup_retention_period    = 14
  preferred_backup_window    = "02:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:05:00"
  tags                       = local.tags
}

# S3 module for object storage
module "s3" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 3.15.1"

  bucket = var.s3_bucket_name
  
  versioning = {
    enabled = true
  }
  
  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm = "AES256"
      }
    }
  }
  
  lifecycle_rule = [
    {
      id      = "cleanup-old-versions"
      enabled = true
      
      noncurrent_version_expiration = {
        days = 90
      }
    }
  ]
  
  tags = local.tags
}

# SNS Topic for database alarms
resource "aws_sns_topic" "db_alarms" {
  name = "${local.name_prefix}-db-alarms"
  tags = local.tags
}

# SNS Topic subscription for database alarms
resource "aws_sns_topic_subscription" "db_alarms_email" {
  topic_arn = aws_sns_topic.db_alarms.arn
  protocol  = "email"
  endpoint  = var.alerting_email
}

# Monitoring module for CloudWatch alarms and dashboards
module "monitoring" {
  source = "../../modules/monitoring"
  count  = var.enable_monitoring ? 1 : 0

  project           = local.namespace
  environment       = local.environment
  eks_cluster_name  = module.eks.cluster_name
  enable_monitoring = var.enable_monitoring
  alerting_email    = var.alerting_email
  enable_dashboard  = true
  retention_in_days = 30
  tags              = local.tags
}

# WAF module for web application firewall
module "waf" {
  source = "../../modules/waf"
  count  = var.enable_waf ? 1 : 0

  project        = local.namespace
  environment    = local.environment
  enable_logging = true
  tags           = local.tags
}