output "redis_endpoint" {
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  description = "The primary endpoint address of the ElastiCache Redis cluster"
}

output "redis_port" {
  value       = aws_elasticache_replication_group.redis.port
  description = "The port number that Redis is listening on for connections"
}

output "redis_security_group_id" {
  value       = aws_security_group.redis.id
  description = "Security group ID for the Redis cluster to configure network access rules"
}

output "redis_connection_string" {
  value       = var.auth_token != "" ? "redis://:${var.auth_token}@${aws_elasticache_replication_group.redis.primary_endpoint_address}:${aws_elasticache_replication_group.redis.port}" : "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:${aws_elasticache_replication_group.redis.port}"
  description = "Complete Redis connection string in URI format for application configuration"
  sensitive   = true
}

output "redis_cluster_id" {
  value       = aws_elasticache_replication_group.redis.id
  description = "ElastiCache Redis cluster identifier for referencing in other resources"
}

output "redis_auth_enabled" {
  value       = var.auth_token != "" ? true : false
  description = "Boolean flag indicating whether Redis authentication is enabled"
}