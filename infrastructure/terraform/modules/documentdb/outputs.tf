# DocumentDB cluster outputs for use by other modules and components
# These outputs expose connection details, security configurations, and resource identifiers

output "endpoint" {
  description = "The connection endpoint of the DocumentDB cluster"
  value       = aws_docdb_cluster.documentdb.endpoint
}

output "port" {
  description = "The port on which the DocumentDB cluster accepts connections"
  value       = 27017
}

output "cluster_id" {
  description = "The ID of the DocumentDB cluster"
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
  description = "The ID of the application security group that has access to DocumentDB"
  value       = aws_security_group.application.id
}

output "connection_string" {
  description = "MongoDB connection string for application configuration"
  value       = "mongodb://${var.master_username}:${random_password.master_password.result}@${aws_docdb_cluster.documentdb.endpoint}:27017/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
  sensitive   = true
}

output "secret_arn" {
  description = "The ARN of the Secrets Manager secret containing DocumentDB credentials"
  value       = aws_secretsmanager_secret.documentdb_credentials.arn
}

output "kms_key_arn" {
  description = "The ARN of the KMS key used for DocumentDB encryption"
  value       = aws_kms_key.documentdb.arn
}

output "parameter_group_id" {
  description = "The ID of the parameter group for the DocumentDB cluster"
  value       = aws_docdb_cluster_parameter_group.documentdb.id
}

output "subnet_group_id" {
  description = "The ID of the subnet group for the DocumentDB cluster"
  value       = aws_docdb_subnet_group.documentdb.id
}

output "replica_count" {
  description = "The number of replica instances in the DocumentDB cluster"
  value       = var.cluster_size - 1
}

output "cloudwatch_alarms" {
  description = "Map of CloudWatch alarm ARNs for DocumentDB monitoring"
  value = {
    cpu_utilization    = aws_cloudwatch_metric_alarm.docdb-cpu-utilization.arn
    memory_utilization = aws_cloudwatch_metric_alarm.docdb-low-memory.arn
    connections        = aws_cloudwatch_metric_alarm.docdb-connections.arn
  }
}