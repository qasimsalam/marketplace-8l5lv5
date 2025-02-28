# Terraform configuration for the AI Talent Marketplace development environment
# This file orchestrates the provisioning of dev infrastructure with appropriate sizing

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

  backend "s3" {
    bucket         = "ai-talent-marketplace-dev-tf-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "ai-talent-marketplace-dev-tf-locks"
  }
}

# AWS provider configuration
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

# Local values for consistent naming and tagging
locals {
  namespace    = var.project
  environment  = var.environment
  name_prefix  = "${var.project}-${var.environment}"
  tags         = var.tags
}

# VPC module - Network infrastructure
module "vpc" {
  source = "../../modules/vpc"
  
  project             = local.namespace
  environment         = local.environment
  vpc_cidr            = var.vpc_cidr
  azs                 = var.azs
  enable_nat_gateway  = true
  single_nat_gateway  = true
  enable_vpn_gateway  = false
  enable_flow_log     = var.enable_vpc_flow_logs
  tags                = local.tags
}

# EKS module - Kubernetes cluster for container orchestration
module "eks" {
  source = "../../modules/eks"
  
  project                 = local.namespace
  environment             = local.environment
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.private_subnets
  cluster_version         = var.eks_cluster_version
  node_groups             = var.eks_node_groups
  enable_public_endpoint  = var.enable_eks_public_endpoint
  enable_private_endpoint = true
  enable_cluster_encryption = true
  cluster_log_types       = ["api", "audit"]
  tags                    = local.tags
}

# RDS module - PostgreSQL database for transactional data
module "rds" {
  source = "../../modules/rds"
  
  project                  = local.namespace
  environment              = local.environment
  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.database_subnets
  instance_class           = var.rds_instance_class
  allocated_storage        = var.rds_allocated_storage
  multi_az                 = var.rds_multi_az
  create_replica           = false
  database_name            = var.rds_database_name
  database_username        = "admin"
  backup_retention_period  = var.rds_backup_retention_period
  deletion_protection      = false
  skip_final_snapshot      = true
  performance_insights_enabled = true
  sns_topic_arn            = aws_sns_topic.db_alarms.arn
  tags                     = local.tags
}

# ElastiCache module - Redis for caching and real-time features
module "elasticache" {
  source = "../../modules/elasticache"
  
  project         = local.namespace
  environment     = local.environment
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.database_subnets
  node_type       = var.elasticache_node_type
  num_cache_nodes = var.elasticache_num_cache_nodes
  tags            = local.tags
}

# OpenSearch module - Search and AI matching capabilities
module "opensearch" {
  source = "../../modules/opensearch"
  
  project        = local.namespace
  environment    = local.environment
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.database_subnets
  instance_type  = var.opensearch_instance_type
  instance_count = var.opensearch_instance_count
  volume_size    = 20
  tags           = local.tags
}

# DocumentDB module - MongoDB-compatible database for unstructured data
module "documentdb" {
  source = "../../modules/documentdb"
  
  project        = local.namespace
  environment    = local.environment
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.database_subnets
  instance_class = var.documentdb_instance_class
  cluster_size   = var.documentdb_cluster_size
  tags           = local.tags
}

# S3 module - Object storage for files and backups
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
  
  tags = local.tags
}

# SNS topic for database alerts
resource "aws_sns_topic" "db_alarms" {
  name = "${local.name_prefix}-db-alarms"
  tags = local.tags
}

# Email subscription for database alerts
resource "aws_sns_topic_subscription" "db_alarms_email" {
  topic_arn = aws_sns_topic.db_alarms.arn
  protocol  = "email"
  endpoint  = var.alerting_email
}

# Monitoring module - CloudWatch monitoring and alerts
module "monitoring" {
  source = "../../modules/monitoring"
  count  = var.enable_monitoring ? 1 : 0
  
  project           = local.namespace
  environment       = local.environment
  eks_cluster_name  = module.eks.cluster_name
  enable_monitoring = var.enable_monitoring
  alerting_email    = var.alerting_email
  tags              = local.tags
}

# WAF module - Web Application Firewall for security
module "waf" {
  source = "../../modules/waf"
  count  = var.enable_waf ? 1 : 0
  
  project     = local.namespace
  environment = local.environment
  tags        = local.tags
}