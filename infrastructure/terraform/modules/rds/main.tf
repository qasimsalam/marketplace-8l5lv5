#--------------------------------------------------------------
# Provider Requirements
#--------------------------------------------------------------

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

#--------------------------------------------------------------
# Local Variables
#--------------------------------------------------------------

locals {
  name_prefix = "${var.project}-${var.environment}"
  
  db_identifier      = "${local.name_prefix}-postgres"
  replica_identifier = "${local.name_prefix}-postgres-replica"
  
  parameter_group_name = "${local.name_prefix}-pg15"
  subnet_group_name    = "${local.name_prefix}-subnet-group"
  
  master_username = var.database_username
  database_name   = var.database_name
  
  port = 5432
  
  default_tags = {
    Project     = var.project
    Environment = var.environment
    Terraform   = "true"
    Module      = "rds"
  }
  
  tags = merge(local.default_tags, var.tags)
}

#--------------------------------------------------------------
# Random Password Generation
#--------------------------------------------------------------

resource "random_password" "postgres_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
  
  # Ensure password doesn't change on every apply
  keepers = {
    identifier = local.db_identifier
  }
}

#--------------------------------------------------------------
# KMS Key for Encryption
#--------------------------------------------------------------

resource "aws_kms_key" "postgres" {
  description             = "KMS key for PostgreSQL encryption for ${local.name_prefix}"
  deletion_window_in_days = 10
  enable_key_rotation     = true
  
  tags = local.tags
}

resource "aws_kms_alias" "postgres" {
  name          = "alias/${local.name_prefix}-postgres"
  target_key_id = aws_kms_key.postgres.key_id
}

#--------------------------------------------------------------
# Security Groups
#--------------------------------------------------------------

resource "aws_security_group" "postgres" {
  name        = "${local.name_prefix}-postgres-sg"
  description = "Security group for PostgreSQL instances"
  vpc_id      = var.vpc_id
  
  tags = merge(local.tags, {
    Name = "${local.name_prefix}-postgres-sg"
  })
}

resource "aws_security_group" "application" {
  name        = "${local.name_prefix}-postgres-app-sg"
  description = "Security group for application servers to access PostgreSQL"
  vpc_id      = var.vpc_id
  
  tags = merge(local.tags, {
    Name = "${local.name_prefix}-postgres-app-sg"
  })
}

# Postgres SG rules - only allow application SG to connect on port 5432
resource "aws_security_group_rule" "postgres_ingress" {
  type                     = "ingress"
  from_port                = local.port
  to_port                  = local.port
  protocol                 = "tcp"
  security_group_id        = aws_security_group.postgres.id
  source_security_group_id = aws_security_group.application.id
  description              = "Allow PostgreSQL access from application servers"
}

resource "aws_security_group_rule" "postgres_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  security_group_id = aws_security_group.postgres.id
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow all outbound traffic"
}

resource "aws_security_group_rule" "application_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  security_group_id = aws_security_group.application.id
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow all outbound traffic"
}

#--------------------------------------------------------------
# DB Subnet Group and Parameter Group
#--------------------------------------------------------------

resource "aws_db_subnet_group" "postgres" {
  name        = local.subnet_group_name
  description = "Subnet group for PostgreSQL instances spanning multiple AZs"
  subnet_ids  = var.subnet_ids
  
  tags = merge(local.tags, {
    Name = local.subnet_group_name
  })
}

resource "aws_db_parameter_group" "postgres" {
  name        = local.parameter_group_name
  family      = "postgres15"
  description = "Parameter group for PostgreSQL 15 with optimized settings"
  
  # Performance optimization parameters
  parameter {
    name  = "max_connections"
    value = "200"
    apply_method = "pending-reboot"
  }
  
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/32768}MB"
    apply_method = "pending-reboot"
  }
  
  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory/16384}MB"
    apply_method = "pending-reboot"
  }
  
  parameter {
    name  = "work_mem"
    value = "8MB"
    apply_method = "pending-reboot"
  }
  
  parameter {
    name  = "maintenance_work_mem"
    value = "64MB"
    apply_method = "pending-reboot"
  }
  
  parameter {
    name  = "random_page_cost"
    value = "1.1"
    apply_method = "pending-reboot"
  }
  
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
    apply_method = "immediate"
  }
  
  parameter {
    name  = "log_connections"
    value = "1"
    apply_method = "immediate"
  }
  
  parameter {
    name  = "log_disconnections"
    value = "1"
    apply_method = "immediate"
  }
  
  parameter {
    name  = "log_lock_waits"
    value = "1"
    apply_method = "immediate"
  }
  
  parameter {
    name  = "log_temp_files"
    value = "0"  # Log all temporary files
    apply_method = "immediate"
  }
  
  parameter {
    name  = "log_autovacuum_min_duration"
    value = "0"  # Log all autovacuum operations
    apply_method = "immediate"
  }
  
  tags = merge(local.tags, {
    Name = local.parameter_group_name
  })
}

#--------------------------------------------------------------
# IAM Role for Enhanced Monitoring
#--------------------------------------------------------------

resource "aws_iam_role" "rds_monitoring_role" {
  name = "${local.name_prefix}-rds-monitoring-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
  
  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
  ]
  
  tags = local.tags
}

#--------------------------------------------------------------
# Primary PostgreSQL Instance
#--------------------------------------------------------------

resource "aws_db_instance" "postgres" {
  identifier = local.db_identifier
  
  # Engine settings
  engine               = "postgres"
  engine_version       = "15.3"
  instance_class       = var.instance_class
  
  # Storage settings
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.postgres.arn
  
  # Database settings
  db_name                = local.database_name
  username               = local.master_username
  password               = random_password.postgres_password.result
  port                   = local.port
  
  # Network settings
  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = [aws_security_group.postgres.id]
  multi_az               = var.multi_az
  publicly_accessible    = false
  
  # Parameter group
  parameter_group_name = aws_db_parameter_group.postgres.name
  
  # Backup and maintenance
  backup_retention_period = var.backup_retention_period
  backup_window           = var.backup_window
  maintenance_window      = var.maintenance_window
  skip_final_snapshot     = var.skip_final_snapshot
  final_snapshot_identifier = "${local.db_identifier}-final-snapshot"
  copy_tags_to_snapshot     = true
  
  # Monitoring
  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = aws_iam_role.rds_monitoring_role.arn
  
  # Performance Insights
  performance_insights_enabled          = var.performance_insights_enabled
  performance_insights_retention_period = var.performance_insights_retention_period
  performance_insights_kms_key_id       = aws_kms_key.postgres.arn
  
  # CloudWatch logs
  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports
  
  # Protection
  deletion_protection = var.deletion_protection
  
  tags = merge(local.tags, {
    Name = local.db_identifier
  })
  
  # Avoid replacing the instance when the password changes
  lifecycle {
    ignore_changes = [password]
  }
}

#--------------------------------------------------------------
# Read Replica (Optional)
#--------------------------------------------------------------

resource "aws_db_instance" "postgres_replica" {
  count = var.create_replica ? 1 : 0
  
  identifier = local.replica_identifier
  
  # Source DB
  replicate_source_db = aws_db_instance.postgres.id
  
  # Instance settings
  instance_class = var.replica_instance_class
  
  # Storage settings
  storage_encrypted = true
  kms_key_id        = aws_kms_key.postgres.arn
  
  # Network settings
  vpc_security_group_ids = [aws_security_group.postgres.id]
  publicly_accessible    = false
  
  # Backup and maintenance
  backup_retention_period = 0  # No backups for replica
  skip_final_snapshot     = true
  
  # Monitoring
  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = aws_iam_role.rds_monitoring_role.arn
  
  # Performance Insights
  performance_insights_enabled          = var.performance_insights_enabled
  performance_insights_retention_period = var.performance_insights_retention_period
  performance_insights_kms_key_id       = aws_kms_key.postgres.arn
  
  # CloudWatch logs
  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports
  
  tags = merge(local.tags, {
    Name = local.replica_identifier
  })
  
  # Prevent instances from being created before the primary instance is ready
  depends_on = [
    aws_db_instance.postgres
  ]
}

#--------------------------------------------------------------
# Store Credentials in Secrets Manager
#--------------------------------------------------------------

resource "aws_secretsmanager_secret" "postgres_credentials" {
  name        = "${local.name_prefix}/postgres/credentials"
  description = "PostgreSQL credentials for ${local.name_prefix}"
  kms_key_id  = aws_kms_key.postgres.arn
  
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "postgres_credentials" {
  secret_id = aws_secretsmanager_secret.postgres_credentials.id
  
  secret_string = jsonencode({
    username             = aws_db_instance.postgres.username
    password             = random_password.postgres_password.result
    engine               = "postgres"
    host                 = aws_db_instance.postgres.address
    port                 = aws_db_instance.postgres.port
    dbname               = aws_db_instance.postgres.db_name
    dbInstanceIdentifier = aws_db_instance.postgres.id
    read_replica_host    = var.create_replica ? aws_db_instance.postgres_replica[0].address : null
  })
}

#--------------------------------------------------------------
# CloudWatch Alarms
#--------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "cpu_utilization_high" {
  alarm_name          = "${local.db_identifier}-cpu-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Average CPU utilization is too high"
  alarm_actions       = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []
  ok_actions          = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }
  
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "freeable_memory_low" {
  alarm_name          = "${local.db_identifier}-freeable-memory-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 500000000  # 500MB in bytes
  alarm_description   = "Average freeable memory is too low"
  alarm_actions       = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []
  ok_actions          = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }
  
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "disk_queue_depth_high" {
  alarm_name          = "${local.db_identifier}-disk-queue-depth-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DiskQueueDepth"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10
  alarm_description   = "Average disk queue depth is too high"
  alarm_actions       = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []
  ok_actions          = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }
  
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "free_storage_space_low" {
  alarm_name          = "${local.db_identifier}-free-storage-space-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5000000000  # 5GB in bytes
  alarm_description   = "Average free storage space is too low"
  alarm_actions       = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []
  ok_actions          = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }
  
  tags = local.tags
}

#--------------------------------------------------------------
# Outputs
#--------------------------------------------------------------

output "db_instance_id" {
  description = "The identifier of the PostgreSQL instance"
  value       = aws_db_instance.postgres.id
}

output "db_instance_endpoint" {
  description = "The connection endpoint of the PostgreSQL instance"
  value       = aws_db_instance.postgres.endpoint
}

output "db_instance_address" {
  description = "The address of the PostgreSQL instance"
  value       = aws_db_instance.postgres.address
}

output "db_instance_port" {
  description = "The port of the PostgreSQL instance"
  value       = aws_db_instance.postgres.port
}

output "db_instance_username" {
  description = "The master username for the PostgreSQL instance"
  value       = aws_db_instance.postgres.username
  sensitive   = true
}

output "db_instance_name" {
  description = "The database name"
  value       = aws_db_instance.postgres.db_name
}

output "replica_instance_id" {
  description = "The identifier of the PostgreSQL read replica"
  value       = var.create_replica ? aws_db_instance.postgres_replica[0].id : null
}

output "replica_instance_endpoint" {
  description = "The connection endpoint of the PostgreSQL read replica"
  value       = var.create_replica ? aws_db_instance.postgres_replica[0].endpoint : null
}

output "replica_instance_address" {
  description = "The address of the PostgreSQL read replica"
  value       = var.create_replica ? aws_db_instance.postgres_replica[0].address : null
}

output "db_subnet_group_id" {
  description = "The ID of the database subnet group"
  value       = aws_db_subnet_group.postgres.id
}

output "db_subnet_group_name" {
  description = "The name of the database subnet group"
  value       = aws_db_subnet_group.postgres.name
}

output "db_parameter_group_id" {
  description = "The ID of the database parameter group"
  value       = aws_db_parameter_group.postgres.id
}

output "db_parameter_group_name" {
  description = "The name of the database parameter group"
  value       = aws_db_parameter_group.postgres.name
}

output "security_group_id" {
  description = "The ID of the security group for PostgreSQL instances"
  value       = aws_security_group.postgres.id
}

output "application_security_group_id" {
  description = "The ID of the security group for application servers to access PostgreSQL"
  value       = aws_security_group.application.id
}

output "kms_key_id" {
  description = "The ID of the KMS key used for PostgreSQL encryption"
  value       = aws_kms_key.postgres.id
}

output "kms_key_arn" {
  description = "The ARN of the KMS key used for PostgreSQL encryption"
  value       = aws_kms_key.postgres.arn
}

output "secret_arn" {
  description = "The ARN of the Secrets Manager secret for PostgreSQL credentials"
  value       = aws_secretsmanager_secret.postgres_credentials.arn
}

output "monitoring_role_arn" {
  description = "The ARN of the IAM role for RDS enhanced monitoring"
  value       = aws_iam_role.rds_monitoring_role.arn
}