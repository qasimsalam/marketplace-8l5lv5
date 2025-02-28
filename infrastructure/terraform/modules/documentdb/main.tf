# AWS DocumentDB Terraform Module
# This module provisions a MongoDB-compatible DocumentDB cluster for the AI Talent Marketplace platform
# Version: AWS Provider ~> 4.0, Random Provider ~> 3.4

# Local variables for naming and tagging consistency
locals {
  namespace = "${var.project}-${var.environment}"
  default_tags = {
    Project     = var.project
    Environment = var.environment
    Terraform   = "true"
    Service     = "documentdb"
  }
  all_tags = merge(var.tags, local.default_tags)
}

# KMS key for encryption at rest
resource "aws_kms_key" "documentdb" {
  description             = "KMS key for DocumentDB encryption"
  deletion_window_in_days = var.kms_key_deletion_window_in_days
  enable_key_rotation     = true
  tags                    = local.all_tags
}

resource "aws_kms_alias" "documentdb" {
  name          = "alias/${local.namespace}-documentdb"
  target_key_id = aws_kms_key.documentdb.key_id
}

# Generate a secure random password for the DocumentDB master user
resource "random_password" "master_password" {
  length           = 16
  special          = false
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Security group for DocumentDB cluster
resource "aws_security_group" "documentdb_sg" {
  name        = "${local.namespace}-documentdb-sg"
  description = "Allow DocumentDB traffic from application services"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.application.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.all_tags
}

# Security group for application access to DocumentDB
resource "aws_security_group" "application" {
  name        = "${local.namespace}-docdb-app-sg"
  description = "Security group for applications to access DocumentDB"
  vpc_id      = var.vpc_id
  
  tags = local.all_tags
}

# Subnet group for DocumentDB cluster
resource "aws_docdb_subnet_group" "documentdb" {
  name       = "${local.namespace}-docdb-subnet-group"
  subnet_ids = var.subnet_ids
  
  tags = local.all_tags
}

# Parameter group for DocumentDB cluster
resource "aws_docdb_cluster_parameter_group" "documentdb" {
  family      = "docdb4.0"
  name        = "${local.namespace}-docdb-params"
  description = "DocDB parameter group for ${var.project} ${var.environment}"
  
  parameter {
    name  = "tls"
    value = "enabled"
  }
  
  parameter {
    name  = "ttl_monitor"
    value = "enabled"
  }
  
  tags = local.all_tags
}

# Store DocumentDB credentials in Secrets Manager
resource "aws_secretsmanager_secret" "documentdb_credentials" {
  name        = "${local.namespace}-docdb-credentials"
  description = "DocumentDB credentials for ${var.project} ${var.environment}"
  kms_key_id  = aws_kms_key.documentdb.arn
  
  tags = local.all_tags
}

resource "aws_secretsmanager_secret_version" "documentdb_credentials" {
  secret_id = aws_secretsmanager_secret.documentdb_credentials.id
  secret_string = jsonencode({
    username           = var.master_username
    password           = random_password.master_password.result
    engine             = "docdb"
    host               = aws_docdb_cluster.documentdb.endpoint
    port               = 27017
    dbClusterIdentifier = aws_docdb_cluster.documentdb.cluster_identifier
  })
}

# DocumentDB cluster for unstructured data storage
resource "aws_docdb_cluster" "documentdb" {
  cluster_identifier              = "${local.namespace}-docdb"
  engine                         = "docdb"
  engine_version                 = "4.0.0"
  master_username                = var.master_username
  master_password                = random_password.master_password.result
  db_subnet_group_name           = aws_docdb_subnet_group.documentdb.name
  vpc_security_group_ids         = [aws_security_group.documentdb_sg.id]
  storage_encrypted              = true
  kms_key_id                     = aws_kms_key.documentdb.arn
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.documentdb.name
  backup_retention_period        = var.backup_retention_period
  preferred_backup_window        = var.backup_window
  preferred_maintenance_window   = var.maintenance_window
  skip_final_snapshot            = var.skip_final_snapshot
  final_snapshot_identifier      = "${local.namespace}-docdb-final-snapshot"
  deletion_protection            = var.deletion_protection
  apply_immediately              = var.apply_immediately
  
  tags = local.all_tags
}

# DocumentDB cluster instances
resource "aws_docdb_cluster_instance" "documentdb" {
  count              = var.cluster_size
  identifier         = "${local.namespace}-docdb-${count.index}"
  cluster_identifier = aws_docdb_cluster.documentdb.id
  instance_class     = var.instance_class
  apply_immediately  = var.apply_immediately
  
  tags = local.all_tags
}

# CloudWatch alarm for CPU utilization
resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  alarm_name          = "${local.namespace}-docdb-cpu-utilization"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/DocDB"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alert when CPU utilization exceeds 80%"
  dimensions = {
    DBClusterIdentifier = aws_docdb_cluster.documentdb.id
  }
  alarm_actions             = [var.sns_topic_arn]
  ok_actions                = [var.sns_topic_arn]
  insufficient_data_actions = []
  treat_missing_data        = "missing"
  
  tags = local.all_tags
}

# CloudWatch alarm for available memory
resource "aws_cloudwatch_metric_alarm" "freeable_memory" {
  alarm_name          = "${local.namespace}-docdb-low-memory"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeableMemory"
  namespace           = "AWS/DocDB"
  period              = 300
  statistic           = "Average"
  threshold           = 1073741824  # 1GB in bytes
  alarm_description   = "Alert when freeable memory falls below 1GB"
  dimensions = {
    DBClusterIdentifier = aws_docdb_cluster.documentdb.id
  }
  alarm_actions             = [var.sns_topic_arn]
  ok_actions                = [var.sns_topic_arn]
  insufficient_data_actions = []
  treat_missing_data        = "missing"
  
  tags = local.all_tags
}

# CloudWatch alarm for maximum connections
resource "aws_cloudwatch_metric_alarm" "connections" {
  alarm_name          = "${local.namespace}-docdb-connections"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/DocDB"
  period              = 300
  statistic           = "Average"
  threshold           = var.max_connections_threshold
  alarm_description   = "Alert when number of connections exceeds threshold"
  dimensions = {
    DBClusterIdentifier = aws_docdb_cluster.documentdb.id
  }
  alarm_actions             = [var.sns_topic_arn]
  ok_actions                = [var.sns_topic_arn]
  insufficient_data_actions = []
  treat_missing_data        = "missing"
  
  tags = local.all_tags
}

# Outputs for reference by other modules
output "endpoint" {
  description = "The endpoint of the DocumentDB cluster for database connections"
  value       = aws_docdb_cluster.documentdb.endpoint
}

output "port" {
  description = "The port on which the DocumentDB cluster accepts connections (27017)"
  value       = 27017
}

output "cluster_id" {
  description = "The ID of the DocumentDB cluster for references in other resources"
  value       = aws_docdb_cluster.documentdb.id
}

output "master_username" {
  description = "The master username for the DocumentDB cluster"
  value       = var.master_username
}

output "security_group_id" {
  description = "The ID of the security group for the DocumentDB cluster"
  value       = aws_security_group.documentdb_sg.id
}

output "app_security_group_id" {
  description = "The ID of the application security group that has access to the DocumentDB cluster"
  value       = aws_security_group.application.id
}

output "connection_string" {
  description = "Formatted MongoDB connection string for application configuration"
  value       = "mongodb://${var.master_username}:${random_password.master_password.result}@${aws_docdb_cluster.documentdb.endpoint}:27017/?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred"
  sensitive   = true
}

output "secret_arn" {
  description = "The ARN of the Secrets Manager secret containing the DocumentDB credentials"
  value       = aws_secretsmanager_secret.documentdb_credentials.arn
}

output "kms_key_arn" {
  description = "The ARN of the KMS key used for DocumentDB encryption"
  value       = aws_kms_key.documentdb.arn
}

output "parameter_group_id" {
  description = "The ID of the parameter group used by the DocumentDB cluster"
  value       = aws_docdb_cluster_parameter_group.documentdb.id
}

output "subnet_group_id" {
  description = "The ID of the subnet group where the DocumentDB cluster is deployed"
  value       = aws_docdb_subnet_group.documentdb.id
}

output "replica_count" {
  description = "The number of replica instances in the DocumentDB cluster"
  value       = var.cluster_size
}