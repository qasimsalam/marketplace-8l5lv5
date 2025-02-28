# AWS OpenSearch Module for AI Talent Marketplace
# Provisions a secure, highly available OpenSearch domain for AI-powered job matching and search

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.67.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5.1"
    }
  }
}

# Data sources to get AWS account and region information
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local variables for consistent resource naming and configuration
locals {
  name_prefix = "${var.project}-${var.environment}"
  domain_name = "${var.project}-${var.environment}-search"
  tags = merge({
    Name        = "${local.name_prefix}-opensearch"
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }, var.tags)
}

# Security group to control access to the OpenSearch domain
resource "aws_security_group" "opensearch_sg" {
  name        = "${local.name_prefix}-opensearch-sg"
  description = "Security group for OpenSearch domain"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = var.source_security_group_ids
    description     = "Allow HTTPS from specified security groups"
  }

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    cidr_blocks     = var.allowed_cidr_blocks
    description     = "Allow HTTPS from specified CIDR blocks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-opensearch-sg"
  })
}

# Service-linked role for OpenSearch
resource "aws_iam_service_linked_role" "opensearch" {
  count            = var.create_service_linked_role ? 1 : 0
  aws_service_name = "opensearchservice.amazonaws.com"
  description      = "Service-linked role for OpenSearch Service"
}

# OpenSearch domain
resource "aws_opensearch_domain" "main" {
  domain_name    = local.domain_name
  engine_version = "OpenSearch_2.5"

  # Cluster configuration
  cluster_config {
    instance_type           = var.instance_type
    instance_count          = var.instance_count
    dedicated_master_enabled = var.dedicated_master_enabled
    dedicated_master_type   = var.dedicated_master_type
    dedicated_master_count  = var.dedicated_master_count
    zone_awareness_enabled  = true
    
    # Enable multi-AZ deployment
    zone_awareness_config {
      availability_zone_count = min(3, length(var.subnet_ids))
    }
  }

  # VPC configuration
  vpc_options {
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.opensearch_sg.id]
  }

  # EBS volume configuration
  ebs_options {
    ebs_enabled = true
    volume_size = var.ebs_volume_size
    volume_type = "gp3"
  }

  # Enable encryption at rest
  encrypt_at_rest {
    enabled = true
  }

  # Enable node-to-node encryption
  node_to_node_encryption {
    enabled = true
  }

  # Configure domain endpoint with HTTPS
  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  # Advanced security options with fine-grained access control
  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true
    master_user_options {
      master_user_name     = var.master_user_name
      master_user_password = var.master_user_password
    }
  }

  # Configure automated snapshots
  snapshot_options {
    automated_snapshot_start_hour = 1
  }

  # Auto-tune settings for optimal performance
  auto_tune_options {
    desired_state = "ENABLED"
    rollback_on_disable = "NO_ROLLBACK"
    
    maintenance_schedule {
      start_at = "2023-01-01T07:00:00Z"
      duration {
        value = 2
        unit  = "HOURS"
      }
      cron_expression_for_recurrence = "cron(0 7 ? * SAT *)"
    }
  }

  # Increase timeout for domain updates
  timeouts {
    update = "2h"
  }

  tags = local.tags
}

# CloudWatch Alarm for high CPU utilization
resource "aws_cloudwatch_metric_alarm" "opensearch_cpu_utilization_too_high" {
  alarm_name          = "${local.name_prefix}-opensearch-cpu-utilization-too-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ES"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Average CPU utilization is too high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions
  
  dimensions = {
    DomainName = aws_opensearch_domain.main.domain_name
    ClientId   = data.aws_caller_identity.current.account_id
  }
}

# CloudWatch Alarm for high JVM memory pressure
resource "aws_cloudwatch_metric_alarm" "opensearch_jvm_memory_pressure_too_high" {
  alarm_name          = "${local.name_prefix}-opensearch-jvm-memory-pressure-too-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "JVMMemoryPressure"
  namespace           = "AWS/ES"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Average JVM memory pressure is too high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions
  
  dimensions = {
    DomainName = aws_opensearch_domain.main.domain_name
    ClientId   = data.aws_caller_identity.current.account_id
  }
}

# CloudWatch Alarm for low free storage space
resource "aws_cloudwatch_metric_alarm" "opensearch_free_storage_space_too_low" {
  alarm_name          = "${local.name_prefix}-opensearch-free-storage-space-too-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/ES"
  period              = 300
  statistic           = "Minimum"
  threshold           = var.ebs_volume_size * 1024 * 0.2 # 20% of total storage
  alarm_description   = "Free storage space is too low (less than 20%)"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions
  
  dimensions = {
    DomainName = aws_opensearch_domain.main.domain_name
    ClientId   = data.aws_caller_identity.current.account_id
  }
}

# Outputs for other modules to reference
output "domain_name" {
  description = "The name of the OpenSearch domain"
  value       = aws_opensearch_domain.main.domain_name
}

output "domain_endpoint" {
  description = "The endpoint URL of the OpenSearch domain"
  value       = "https://${aws_opensearch_domain.main.endpoint}"
}

output "domain_arn" {
  description = "The ARN of the OpenSearch domain"
  value       = aws_opensearch_domain.main.arn
}

output "security_group_id" {
  description = "The ID of the security group for the OpenSearch domain"
  value       = aws_security_group.opensearch_sg.id
}

output "kibana_endpoint" {
  description = "The endpoint URL for OpenSearch Dashboards"
  value       = "https://${aws_opensearch_domain.main.kibana_endpoint}"
}

output "master_user_name" {
  description = "The master user name for the OpenSearch domain"
  value       = var.master_user_name
}