# Primary RDS instance outputs
output "db_instance_id" {
  description = "The ID of the PostgreSQL RDS instance"
  value       = aws_db_instance.postgres.id
}

output "endpoint" {
  description = "The connection endpoint of the PostgreSQL RDS instance"
  value       = aws_db_instance.postgres.endpoint
}

output "address" {
  description = "The DNS address of the PostgreSQL RDS instance"
  value       = aws_db_instance.postgres.address
}

output "port" {
  description = "The port on which the PostgreSQL instance accepts connections"
  value       = aws_db_instance.postgres.port
}

output "username" {
  description = "The master username for the PostgreSQL database"
  value       = aws_db_instance.postgres.username
}

output "database_name" {
  description = "The name of the PostgreSQL database"
  value       = aws_db_instance.postgres.db_name
}

# Read replica outputs
output "replica_endpoint" {
  description = "The connection endpoint of the PostgreSQL read replica instance"
  value       = var.create_replica ? aws_db_instance.postgres_replica[0].endpoint : null
}

# Security and Access outputs
output "secret_arn" {
  description = "The ARN of the Secrets Manager secret containing database credentials"
  value       = aws_secretsmanager_secret.postgres_credentials.arn
}

output "security_group_id" {
  description = "The ID of the security group for the PostgreSQL RDS instance"
  value       = aws_security_group.postgres.id
}

output "kms_key_arn" {
  description = "The ARN of the KMS key used for database encryption"
  value       = aws_kms_key.postgres.arn
}

# Configuration outputs
output "parameter_group_name" {
  description = "The name of the DB parameter group"
  value       = aws_db_parameter_group.postgres.name
}

output "subnet_group_name" {
  description = "The name of the DB subnet group"
  value       = aws_db_subnet_group.postgres.name
}

output "monitoring_role_arn" {
  description = "The ARN of the IAM role used for enhanced monitoring"
  value       = aws_iam_role.rds_monitoring_role.arn
}

# Monitoring outputs
output "cloudwatch_alarms" {
  description = "Map of CloudWatch alarm ARNs for database monitoring"
  value = {
    cpu_utilization_high   = aws_cloudwatch_metric_alarm.cpu_utilization_high.arn
    freeable_memory_low    = aws_cloudwatch_metric_alarm.freeable_memory_low.arn
    disk_queue_depth_high  = aws_cloudwatch_metric_alarm.disk_queue_depth_high.arn
    free_storage_space_low = aws_cloudwatch_metric_alarm.free_storage_space_low.arn
  }
}

# Application connection string
output "connection_string" {
  description = "PostgreSQL connection string for application configuration"
  value       = "postgresql://${aws_db_instance.postgres.username}:${random_password.postgres_password.result}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}"
  sensitive   = true
}