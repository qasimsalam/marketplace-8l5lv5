# AWS ElastiCache Redis Terraform Module
# AWS Provider version: ~> 4.67.0
#
# This module provisions and configures AWS ElastiCache Redis clusters for the AI Talent Marketplace
# platform with appropriate security, scalability, and monitoring configurations.

# Local variables for resource naming and common tags
locals {
  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Component   = "redis"
  }
}

# Parameter group for Redis configuration
resource "aws_elasticache_parameter_group" "redis" {
  name        = "${var.project}-${var.environment}-redis-params"
  family      = "redis7"
  description = "Parameter group for ${var.project} ${var.environment} Redis cluster"
  
  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }
  
  parameter {
    name  = "notify-keyspace-events"
    value = "KEA"
  }
  
  tags = merge(local.tags, var.tags)
}

# Subnet group for Redis deployment
resource "aws_elasticache_subnet_group" "redis" {
  name        = "${var.project}-${var.environment}-redis-subnet"
  subnet_ids  = var.subnet_ids
  description = "Subnet group for ${var.project} ${var.environment} Redis cluster"
  tags        = merge(local.tags, var.tags)
}

# Security group for Redis access control
resource "aws_security_group" "redis" {
  name        = "${var.project}-${var.environment}-redis-sg"
  description = "Security group for ${var.project} ${var.environment} Redis cluster"
  vpc_id      = var.vpc_id
  
  ingress {
    description     = "Redis from application layer"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }
  
  egress {
    description      = "Allow all outbound traffic"
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
  
  tags = merge(local.tags, var.tags)
}

# Redis replication group (cluster)
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${var.project}-${var.environment}-redis"
  description                = "Redis cluster for ${var.project} ${var.environment}"
  engine                     = "redis"
  engine_version             = "7.0"
  node_type                  = var.node_type
  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.redis.name
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]
  automatic_failover_enabled = var.num_cache_nodes > 1 ? true : false
  multi_az_enabled           = var.num_cache_nodes > 1 ? true : false
  num_cache_clusters         = var.num_cache_nodes
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.auth_token
  snapshot_retention_limit   = 7
  snapshot_window            = var.snapshot_window
  maintenance_window         = var.maintenance_window
  notification_topic_arn     = var.notification_topic_arn != "" ? var.notification_topic_arn : null
  tags                       = merge(local.tags, var.tags)
}

# CloudWatch alarm for Redis CPU utilization
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.project}-${var.environment}-redis-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "This metric monitors Redis CPU utilization"
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.redis.id}-001"
  }
  
  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions
  tags          = merge(local.tags, var.tags)
}

# CloudWatch alarm for Redis memory utilization
resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.project}-${var.environment}-redis-memory-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "This metric monitors Redis memory utilization"
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.redis.id}-001"
  }
  
  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions
  tags          = merge(local.tags, var.tags)
}

# CloudWatch alarm for Redis connection count
resource "aws_cloudwatch_metric_alarm" "redis_connections" {
  alarm_name          = "${var.project}-${var.environment}-redis-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 5000
  alarm_description   = "This metric monitors Redis connection count"
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.redis.id}-001"
  }
  
  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions
  tags          = merge(local.tags, var.tags)
}

# Outputs for use by other modules
output "redis_endpoint" {
  description = "The address of the Redis primary endpoint for connection by application services"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  description = "The port number on which Redis accepts connections"
  value       = aws_elasticache_replication_group.redis.port
}

output "redis_security_group_id" {
  description = "The ID of the security group associated with the Redis cluster for network access control"
  value       = aws_security_group.redis.id
}

output "redis_connection_string" {
  description = "Formatted Redis connection string in URI format for easy application configuration"
  value       = "redis://:${var.auth_token}@${aws_elasticache_replication_group.redis.primary_endpoint_address}:${aws_elasticache_replication_group.redis.port}"
  sensitive   = true
}

output "redis_cluster_id" {
  description = "The ID of the ElastiCache replication group for reference in other AWS resources"
  value       = aws_elasticache_replication_group.redis.id
}