# Configure providers
terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.67.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 4.80.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5.1"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2.0"
    }
  }
}

# AWS Provider Configuration for primary region
provider "aws" {
  region = var.aws_region
}

# AWS Provider for CloudFront resources (must be us-east-1)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Google Cloud Provider Configuration
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
  zone    = var.gcp_zone
}

# Kubernetes Provider Configuration
provider "kubernetes" {
  # Configuration will depend on how the cluster is being accessed
  # typically pulled from EKS authentication
}

# Local values for resource naming consistency and tag standardization
locals {
  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
  
  # Available AZs for use
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 3)
  
  # S3 bucket names
  log_bucket_name   = var.s3_log_bucket_name != null ? var.s3_log_bucket_name : "${var.project}-${var.environment}-logs"
  asset_bucket_name = var.s3_asset_bucket_name != null ? var.s3_asset_bucket_name : "${var.project}-${var.environment}-assets"
}

# Data source to retrieve availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# SNS topic for monitoring alerts and notifications
resource "aws_sns_topic" "alerts" {
  name = "${var.project}-${var.environment}-alerts"
  tags = local.tags
}

# S3 bucket for logs
resource "aws_s3_bucket" "logs" {
  bucket        = local.log_bucket_name
  acl           = "private"
  force_destroy = var.environment != "prod"
  
  lifecycle_rule {
    id      = "log-rotation"
    enabled = true
    prefix  = ""
    
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    expiration {
      days = 365
    }
  }
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
  
  tags = local.tags
}

# S3 bucket for static assets
resource "aws_s3_bucket" "assets" {
  bucket        = local.asset_bucket_name
  acl           = "private"
  force_destroy = var.environment != "prod"
  
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
  
  tags = local.tags
}

# CloudFront distribution for the assets
resource "aws_cloudfront_distribution" "assets" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "Asset distribution for ${var.project} ${var.environment}"
  price_class     = var.cloudfront_price_class
  
  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.assets.id}"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.assets.cloudfront_access_identity_path
    }
  }
  
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.assets.id}"
    
    forwarded_values {
      query_string = false
      
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    cloudfront_default_certificate = true
  }
  
  web_acl_id = var.waf_enabled ? aws_wafv2_web_acl.cloudfront[0].arn : null
  
  tags = local.tags
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "assets" {
  comment = "Origin Access Identity for ${var.project} ${var.environment} assets"
}

# WAF for CloudFront (in us-east-1)
resource "aws_wafv2_web_acl" "cloudfront" {
  provider    = aws.us_east_1
  name        = "${var.project}-${var.environment}-cloudfront-waf"
  description = "WAF for CloudFront distribution"
  scope       = "CLOUDFRONT"
  
  default_action {
    allow {}
  }
  
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }
  
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-${var.environment}-cloudfront-waf"
    sampled_requests_enabled   = true
  }
  
  tags = local.tags
  
  count = var.waf_enabled ? 1 : 0
}

# Route53 Zone for domain configuration (if provided)
resource "aws_route53_zone" "main" {
  name    = var.route53_domain_name
  comment = "Managed by Terraform for ${var.project}"
  tags    = local.tags
  
  count = var.route53_domain_name != "" ? 1 : 0
}

# Null resource for GCP disaster recovery setup
resource "null_resource" "gcp_dr_setup" {
  triggers = {
    always_run = timestamp()
  }
  
  provisioner "local-exec" {
    command = "echo \"Setup GCP disaster recovery resources\" && sleep 10"
  }
  
  count = var.gcp_project_id != "" ? 1 : 0
}