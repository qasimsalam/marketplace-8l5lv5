# Terraform configuration for AI Talent Marketplace Production Environment
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
    bucket         = "ai-talent-marketplace-prod-tf-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "ai-talent-marketplace-prod-tf-locks"
  }
}

# Provider configuration for multiple regions
provider "aws" {
  region = var.aws_primary_region
  alias  = "primary"
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Region      = var.aws_primary_region
    }
  }
}

provider "aws" {
  region = var.aws_secondary_region
  alias  = "secondary"
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Region      = var.aws_secondary_region
    }
  }
}

provider "aws" {
  region = var.aws_tertiary_region
  alias  = "tertiary"
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Region      = var.aws_tertiary_region
    }
  }
}

# Local variables for naming consistency
locals {
  namespace     = var.project
  environment   = var.environment
  name_prefix   = "${var.project}-${var.environment}"
  primary_region_azs = ["${var.aws_primary_region}a", "${var.aws_primary_region}b", "${var.aws_primary_region}c"]
  secondary_region_azs = ["${var.aws_secondary_region}a", "${var.aws_secondary_region}b", "${var.aws_secondary_region}c"]
  primary_tags = {
    Project     = var.project
    Environment = var.environment
    Region      = var.aws_primary_region
    ManagedBy   = "terraform"
  }
}

# VPC in primary region
module "vpc_primary" {
  source = "../../modules/vpc"
  providers = {
    aws = aws.primary
  }
  
  project             = local.namespace
  environment         = local.environment
  vpc_cidr            = var.vpc_cidr_primary
  azs                 = local.primary_region_azs
  enable_nat_gateway  = true
  single_nat_gateway  = false
  one_nat_gateway_per_az = true
  enable_vpn_gateway  = false
  enable_dns_hostnames = true
  enable_dns_support  = true
  enable_flow_log     = true
  flow_log_retention_in_days = 90
  
  tags = merge(local.primary_tags, var.tags)
}

# VPC in secondary region
module "vpc_secondary" {
  source = "../../modules/vpc"
  providers = {
    aws = aws.secondary
  }
  
  project             = local.namespace
  environment         = local.environment
  vpc_cidr            = var.vpc_cidr_secondary
  azs                 = local.secondary_region_azs
  enable_nat_gateway  = true
  single_nat_gateway  = false
  one_nat_gateway_per_az = true
  enable_vpn_gateway  = false
  enable_dns_hostnames = true
  enable_dns_support  = true
  enable_flow_log     = true
  flow_log_retention_in_days = 90
  
  tags = merge(local.primary_tags, var.tags, { Region = var.aws_secondary_region })
}

# VPC Peering between primary and secondary regions
resource "aws_vpc_peering_connection" "primary_to_secondary" {
  provider      = aws.primary
  vpc_id        = module.vpc_primary.vpc_id
  peer_vpc_id   = module.vpc_secondary.vpc_id
  peer_region   = var.aws_secondary_region
  auto_accept   = false
  
  tags = {
    Name = "${local.name_prefix}-peering-primary-to-secondary"
  }
}

resource "aws_vpc_peering_connection_accepter" "secondary_accepter" {
  provider                  = aws.secondary
  vpc_peering_connection_id = aws_vpc_peering_connection.primary_to_secondary.id
  auto_accept               = true
  
  tags = {
    Name = "${local.name_prefix}-peering-secondary-accepter"
  }
}

# EKS Cluster in primary region
module "eks_primary" {
  source = "../../modules/eks"
  providers = {
    aws = aws.primary
  }
  
  project           = local.namespace
  environment       = local.environment
  vpc_id            = module.vpc_primary.vpc_id
  subnet_ids        = module.vpc_primary.private_subnets
  cluster_version   = var.eks_cluster_version
  
  node_groups = {
    general = {
      desired_size    = 4
      min_size        = 3
      max_size        = 10
      instance_types  = ["t3.xlarge"]
      capacity_type   = "ON_DEMAND"
      disk_size       = 100
    },
    cpu = {
      desired_size    = 3
      min_size        = 2
      max_size        = 8
      instance_types  = ["c6i.2xlarge"]
      capacity_type   = "ON_DEMAND"
      disk_size       = 100
    },
    memory = {
      desired_size    = 3
      min_size        = 2
      max_size        = 6
      instance_types  = ["r6i.2xlarge"]
      capacity_type   = "ON_DEMAND"
      disk_size       = 100
    }
  }
  
  enable_public_endpoint = false
  enable_private_endpoint = true
  enable_cluster_encryption = true
  cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  cluster_log_retention_days = 90
  enable_aws_load_balancer_controller = true
  
  tags = merge(local.primary_tags, var.tags)
}

# EKS Cluster in secondary region
module "eks_secondary" {
  source = "../../modules/eks"
  providers = {
    aws = aws.secondary
  }
  
  project           = local.namespace
  environment       = local.environment
  vpc_id            = module.vpc_secondary.vpc_id
  subnet_ids        = module.vpc_secondary.private_subnets
  cluster_version   = var.eks_cluster_version
  
  node_groups = {
    general = {
      desired_size    = 4
      min_size        = 3
      max_size        = 10
      instance_types  = ["t3.xlarge"]
      capacity_type   = "ON_DEMAND"
      disk_size       = 100
    },
    cpu = {
      desired_size    = 3
      min_size        = 2
      max_size        = 8
      instance_types  = ["c6i.2xlarge"]
      capacity_type   = "ON_DEMAND"
      disk_size       = 100
    },
    memory = {
      desired_size    = 3
      min_size        = 2
      max_size        = 6
      instance_types  = ["r6i.2xlarge"]
      capacity_type   = "ON_DEMAND"
      disk_size       = 100
    }
  }
  
  enable_public_endpoint = false
  enable_private_endpoint = true
  enable_cluster_encryption = true
  cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  cluster_log_retention_days = 90
  enable_aws_load_balancer_controller = true
  
  tags = merge(local.primary_tags, var.tags, { Region = var.aws_secondary_region })
}

# SNS Topic for alerting in primary region
resource "aws_sns_topic" "alerts_primary" {
  provider = aws.primary
  name     = "${local.name_prefix}-alerts-primary"
  tags     = local.primary_tags
}

# SNS Topic for alerting in secondary region
resource "aws_sns_topic" "alerts_secondary" {
  provider = aws.secondary
  name     = "${local.name_prefix}-alerts-secondary"
  tags     = merge(local.primary_tags, { Region = var.aws_secondary_region })
}

# SNS Topic Subscription for alerting email
resource "aws_sns_topic_subscription" "alerts_primary_email" {
  provider  = aws.primary
  topic_arn = aws_sns_topic.alerts_primary.arn
  protocol  = "email"
  endpoint  = var.alerting_email
}

resource "aws_sns_topic_subscription" "alerts_secondary_email" {
  provider  = aws.secondary
  topic_arn = aws_sns_topic.alerts_secondary.arn
  protocol  = "email"
  endpoint  = var.alerting_email
}

# RDS PostgreSQL in primary region
module "rds_primary" {
  source = "../../modules/rds"
  providers = {
    aws = aws.primary
  }
  
  project                  = local.namespace
  environment              = local.environment
  vpc_id                   = module.vpc_primary.vpc_id
  subnet_ids               = module.vpc_primary.database_subnets
  allowed_security_groups  = [module.eks_primary.node_security_group_id]
  
  instance_class           = "db.r5.large"
  allocated_storage        = 100
  max_allocated_storage    = 1000
  multi_az                 = true
  create_replica           = true
  replica_instance_class   = "db.r5.large"
  
  database_name            = "ai_talent_marketplace"
  database_username        = "admin"
  
  backup_retention_period  = 30
  backup_window            = "02:00-04:00"
  maintenance_window       = "sun:04:00-sun:06:00"
  
  monitoring_interval      = 60
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  deletion_protection      = true
  skip_final_snapshot      = false
  
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  sns_topic_arn            = aws_sns_topic.alerts_primary.arn
  
  tags                     = local.primary_tags
}

# RDS PostgreSQL in secondary region
module "rds_secondary" {
  source = "../../modules/rds"
  providers = {
    aws = aws.secondary
  }
  
  project                  = local.namespace
  environment              = local.environment
  vpc_id                   = module.vpc_secondary.vpc_id
  subnet_ids               = module.vpc_secondary.database_subnets
  allowed_security_groups  = [module.eks_secondary.node_security_group_id]
  
  instance_class           = "db.r5.large"
  allocated_storage        = 100
  max_allocated_storage    = 1000
  multi_az                 = true
  create_replica           = true
  replica_instance_class   = "db.r5.large"
  
  database_name            = "ai_talent_marketplace"
  database_username        = "admin"
  
  backup_retention_period  = 30
  backup_window            = "02:00-04:00"
  maintenance_window       = "sun:04:00-sun:06:00"
  
  monitoring_interval      = 60
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  deletion_protection      = true
  skip_final_snapshot      = false
  
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  sns_topic_arn            = aws_sns_topic.alerts_secondary.arn
  
  tags                     = merge(local.primary_tags, { Region = var.aws_secondary_region })
}

# Generate random password for Redis auth token
resource "random_password" "redis_auth_token" {
  length  = 32
  special = false
}

# ElastiCache Redis in primary region
module "elasticache_primary" {
  source = "../../modules/elasticache"
  providers = {
    aws = aws.primary
  }
  
  project              = local.namespace
  environment          = local.environment
  vpc_id               = module.vpc_primary.vpc_id
  subnet_ids           = module.vpc_primary.database_subnets
  app_security_group_id = module.eks_primary.node_security_group_id
  
  node_type            = "cache.r5.large"
  num_cache_nodes      = 3
  parameter_group_name = "default.redis7.cluster.on"
  engine_version       = "7.0"
  
  maintenance_window   = "sun:05:00-sun:09:00"
  snapshot_window      = "03:00-05:00"
  
  alarm_actions        = [aws_sns_topic.alerts_primary.arn]
  ok_actions           = [aws_sns_topic.alerts_primary.arn]
  
  auth_token           = random_password.redis_auth_token.result
  
  tags                 = local.primary_tags
}

# ElastiCache Redis in secondary region
module "elasticache_secondary" {
  source = "../../modules/elasticache"
  providers = {
    aws = aws.secondary
  }
  
  project              = local.namespace
  environment          = local.environment
  vpc_id               = module.vpc_secondary.vpc_id
  subnet_ids           = module.vpc_secondary.database_subnets
  app_security_group_id = module.eks_secondary.node_security_group_id
  
  node_type            = "cache.r5.large"
  num_cache_nodes      = 3
  parameter_group_name = "default.redis7.cluster.on"
  engine_version       = "7.0"
  
  maintenance_window   = "sun:05:00-sun:09:00"
  snapshot_window      = "03:00-05:00"
  
  alarm_actions        = [aws_sns_topic.alerts_secondary.arn]
  ok_actions           = [aws_sns_topic.alerts_secondary.arn]
  
  auth_token           = random_password.redis_auth_token.result
  
  tags                 = merge(local.primary_tags, { Region = var.aws_secondary_region })
}

# OpenSearch in primary region
module "opensearch_primary" {
  source = "../../modules/opensearch"
  providers = {
    aws = aws.primary
  }
  
  project                 = local.namespace
  environment             = local.environment
  vpc_id                  = module.vpc_primary.vpc_id
  vpc_cidr                = module.vpc_primary.vpc_cidr_block
  subnet_ids              = slice(module.vpc_primary.database_subnets, 0, 3)
  source_security_group_ids = [module.eks_primary.node_security_group_id]
  
  instance_type           = "r6g.2xlarge.search"
  instance_count          = 3
  dedicated_master_enabled = true
  dedicated_master_type   = "r6g.large.search"
  dedicated_master_count  = 3
  ebs_volume_size         = 200
  
  zone_awareness_enabled  = true
  availability_zone_count = 3
  encrypt_at_rest         = true
  create_service_linked_role = false
  
  master_user_name        = var.opensearch_master_user
  master_user_password    = var.opensearch_master_password
  
  alarm_actions           = [aws_sns_topic.alerts_primary.arn]
  ok_actions              = [aws_sns_topic.alerts_primary.arn]
  
  tags                    = local.primary_tags
}

# OpenSearch in secondary region
module "opensearch_secondary" {
  source = "../../modules/opensearch"
  providers = {
    aws = aws.secondary
  }
  
  project                 = local.namespace
  environment             = local.environment
  vpc_id                  = module.vpc_secondary.vpc_id
  vpc_cidr                = module.vpc_secondary.vpc_cidr_block
  subnet_ids              = slice(module.vpc_secondary.database_subnets, 0, 3)
  source_security_group_ids = [module.eks_secondary.node_security_group_id]
  
  instance_type           = "r6g.2xlarge.search"
  instance_count          = 3
  dedicated_master_enabled = true
  dedicated_master_type   = "r6g.large.search"
  dedicated_master_count  = 3
  ebs_volume_size         = 200
  
  zone_awareness_enabled  = true
  availability_zone_count = 3
  encrypt_at_rest         = true
  create_service_linked_role = false
  
  master_user_name        = var.opensearch_master_user
  master_user_password    = var.opensearch_master_password
  
  alarm_actions           = [aws_sns_topic.alerts_secondary.arn]
  ok_actions              = [aws_sns_topic.alerts_secondary.arn]
  
  tags                    = merge(local.primary_tags, { Region = var.aws_secondary_region })
}

# DocumentDB in primary region
module "documentdb_primary" {
  source = "../../modules/documentdb"
  providers = {
    aws = aws.primary
  }
  
  project                    = local.namespace
  environment                = local.environment
  vpc_id                     = module.vpc_primary.vpc_id
  subnet_ids                 = module.vpc_primary.database_subnets
  allowed_security_groups    = [module.eks_primary.node_security_group_id]
  
  master_username            = var.documentdb_master_username
  master_password            = var.documentdb_master_password
  
  instance_class             = "db.r5.large"
  instance_count             = 3
  
  backup_retention_period    = 30
  preferred_backup_window    = "02:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:06:00"
  
  skip_final_snapshot        = false
  deletion_protection        = true
  
  kms_key_deletion_window_in_days = 30
  
  sns_topic_arn              = aws_sns_topic.alerts_primary.arn
  
  tags                       = local.primary_tags
}

# DocumentDB in secondary region
module "documentdb_secondary" {
  source = "../../modules/documentdb"
  providers = {
    aws = aws.secondary
  }
  
  project                    = local.namespace
  environment                = local.environment
  vpc_id                     = module.vpc_secondary.vpc_id
  subnet_ids                 = module.vpc_secondary.database_subnets
  allowed_security_groups    = [module.eks_secondary.node_security_group_id]
  
  master_username            = var.documentdb_master_username
  master_password            = var.documentdb_master_password
  
  instance_class             = "db.r5.large"
  instance_count             = 3
  
  backup_retention_period    = 30
  preferred_backup_window    = "02:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:06:00"
  
  skip_final_snapshot        = false
  deletion_protection        = true
  
  kms_key_deletion_window_in_days = 30
  
  sns_topic_arn              = aws_sns_topic.alerts_secondary.arn
  
  tags                       = merge(local.primary_tags, { Region = var.aws_secondary_region })
}

# S3 bucket for assets with cross-region replication
module "s3_assets" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 3.15.1"
  providers = {
    aws = aws.primary
  }
  
  bucket = var.s3_assets_bucket_name
  acl    = "private"
  
  versioning = {
    enabled = true
  }
  
  replication_configuration = {
    role = aws_iam_role.replication.arn
    rules = [
      {
        id       = "assets-replication"
        status   = "Enabled"
        destination = {
          bucket = module.s3_assets_replica.s3_bucket_arn
          storage_class = "STANDARD"
        }
      }
    ]
  }
  
  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm = "AES256"
      }
    }
  }
  
  cors_rule = {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD", "PUT"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
  
  tags = local.primary_tags
}

# S3 bucket for replica in secondary region
module "s3_assets_replica" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 3.15.1"
  providers = {
    aws = aws.secondary
  }
  
  bucket = "${var.s3_assets_bucket_name}-replica"
  acl    = "private"
  
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
  
  cors_rule = {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
  
  tags = merge(local.primary_tags, { Region = var.aws_secondary_region })
}

# IAM role for S3 replication
resource "aws_iam_role" "replication" {
  provider = aws.primary
  name     = "${local.name_prefix}-replication-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# IAM policy for S3 replication
resource "aws_iam_policy" "replication" {
  provider = aws.primary
  name     = "${local.name_prefix}-replication-policy"
  
  policy = jsonencode({
    "Version":"2012-10-17",
    "Statement":[
      {
        "Effect":"Allow",
        "Action":["s3:GetReplicationConfiguration","s3:ListBucket"],
        "Resource":["${module.s3_assets.s3_bucket_arn}"]
      },
      {
        "Effect":"Allow",
        "Action":["s3:GetObjectVersionForReplication","s3:GetObjectVersionAcl","s3:GetObjectVersionTagging"],
        "Resource":["${module.s3_assets.s3_bucket_arn}/*"]
      },
      {
        "Effect":"Allow",
        "Action":["s3:ReplicateObject","s3:ReplicateDelete","s3:ReplicateTags"],
        "Resource":"${module.s3_assets_replica.s3_bucket_arn}/*"
      }
    ]
  })
}

# Attach IAM policy to IAM role for S3 replication
resource "aws_iam_role_policy_attachment" "replication" {
  provider   = aws.primary
  role       = aws_iam_role.replication.name
  policy_arn = aws_iam_policy.replication.arn
}

# Route53 hosted zone for domain
module "route53_primary" {
  source  = "terraform-aws-modules/route53/aws"
  version = "~> 2.0"
  providers = {
    aws = aws.primary
  }
  
  zone_name = var.route53_domain_name
  
  tags = local.primary_tags
}

# ACM certificate for domain
module "acm_primary" {
  source  = "terraform-aws-modules/acm/aws"
  version = "~> 4.0"
  providers = {
    aws = aws.primary
  }
  
  domain_name               = var.route53_domain_name
  zone_id                   = module.route53_primary.route53_zone_zone_id
  subject_alternative_names = ["*.${var.route53_domain_name}"]
  wait_for_validation       = true
  
  tags = local.primary_tags
}

# CloudFront distribution for global content delivery
module "cloudfront" {
  source  = "terraform-aws-modules/cloudfront/aws"
  version = "~> 3.2"
  providers = {
    aws = aws.primary
  }
  
  aliases         = [var.route53_domain_name, "*.${var.route53_domain_name}"]
  comment         = "CDN for ${var.project} ${var.environment}"
  enabled         = true
  price_class     = "PriceClass_All"
  
  create_origin_access_identity = true
  origin_access_identities = {
    s3 = "S3 Origin Access Identity for ${var.project} ${var.environment}"
  }
  
  origin = {
    s3 = {
      domain_name = module.s3_assets.s3_bucket_bucket_regional_domain_name
      origin_access_identity = "s3"
    }
  }
  
  default_cache_behavior = {
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    origin_request_policy_id = "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf"
  }
  
  viewer_certificate = {
    acm_certificate_arn      = module.acm_primary.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  tags = local.primary_tags
}

# WAF Web ACL for application security
module "waf_primary" {
  source = "../../modules/waf"
  providers = {
    aws = aws.primary
  }
  
  project       = local.namespace
  environment   = local.environment
  enable_logging = true
  associate_alb = true
  alb_arn_list  = var.alb_arn_list
  
  tags = local.primary_tags
}

# CloudWatch monitoring and alerting for primary region
module "monitoring_primary" {
  source = "../../modules/monitoring"
  providers = {
    aws = aws.primary
  }
  
  project          = local.namespace
  environment      = local.environment
  eks_cluster_name = module.eks_primary.cluster_name
  alerting_email   = var.alerting_email
  enable_dashboard = true
  retention_in_days = 90
  
  tags = local.primary_tags
}

# CloudWatch monitoring and alerting for secondary region
module "monitoring_secondary" {
  source = "../../modules/monitoring"
  providers = {
    aws = aws.secondary
  }
  
  project          = local.namespace
  environment      = local.environment
  eks_cluster_name = module.eks_secondary.cluster_name
  alerting_email   = var.alerting_email
  enable_dashboard = true
  retention_in_days = 90
  
  tags = merge(local.primary_tags, { Region = var.aws_secondary_region })
}