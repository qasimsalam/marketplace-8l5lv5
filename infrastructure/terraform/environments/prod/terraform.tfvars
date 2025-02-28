# General Settings
project                 = "ai-talent-marketplace"
environment             = "prod"
aws_region              = "us-east-1"
additional_aws_regions  = ["us-west-2", "eu-west-1"]
tags = {
  Project      = "AI Talent Marketplace"
  Environment  = "Production"
  ManagedBy    = "Terraform"
  BusinessUnit = "Engineering"
}

# VPC Configuration
vpc_cidr                     = "10.0.0.0/16"
azs                          = ["us-east-1a", "us-east-1b", "us-east-1c"]
private_subnets              = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnets               = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
database_subnets             = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
create_database_subnet_group = true
enable_nat_gateway           = true
single_nat_gateway           = false
one_nat_gateway_per_az       = true
enable_vpn_gateway           = false
enable_dns_hostnames         = true
enable_dns_support           = true
enable_flow_log              = true
flow_log_destination_type    = "cloud-watch-logs"
flow_log_retention_in_days   = 90
flow_log_traffic_type        = "ALL"

# EKS Configuration
cluster_version              = "1.27"
node_groups = {
  general = {
    instance_types = ["t3.xlarge"]
    min_size       = 3
    max_size       = 10
    desired_size   = 5
    disk_size      = 100
    capacity_type  = "ON_DEMAND"
  }
  cpu = {
    instance_types = ["c6i.2xlarge"]
    min_size       = 2
    max_size       = 8
    desired_size   = 4
    disk_size      = 100
    capacity_type  = "ON_DEMAND"
  }
  memory = {
    instance_types = ["r6i.2xlarge"]
    min_size       = 2
    max_size       = 6
    desired_size   = 3
    disk_size      = 100
    capacity_type  = "ON_DEMAND"
  }
}
enable_cluster_encryption      = true
cluster_log_types              = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
cluster_log_retention_days     = 90
enable_private_endpoint        = true
enable_public_endpoint         = true
public_access_cidrs            = ["0.0.0.0/0"]
enable_aws_load_balancer_controller = true

# RDS Configuration
instance_class                        = "db.m5.xlarge"
replica_instance_class                = "db.m5.large"
allocated_storage                     = 100
max_allocated_storage                 = 1000
multi_az                              = true
create_replica                        = true
database_name                         = "ai_talent_marketplace"
database_username                     = "dbadmin"
backup_retention_period               = 30
backup_window                         = "03:00-05:00"
maintenance_window                    = "sun:05:00-sun:09:00"
monitoring_interval                   = 60
deletion_protection                   = true
skip_final_snapshot                   = false
performance_insights_enabled          = true
performance_insights_retention_period = 731
enabled_cloudwatch_logs_exports       = ["postgresql", "upgrade"]

# ElastiCache Configuration
node_type         = "cache.m5.large"
num_cache_nodes   = 3
maintenance_window = "sun:05:00-sun:09:00"
snapshot_window    = "03:00-05:00"

# OpenSearch Configuration
instance_type             = "m5.large.search"
instance_count            = 3
dedicated_master_enabled  = true
dedicated_master_type     = "m5.large.search"
dedicated_master_count    = 3
ebs_volume_size           = 100
master_user_name          = "opensearch-admin"
create_service_linked_role = true

# DocumentDB Configuration
instance_class                     = "db.r5.large"
cluster_size                       = 3
master_username                    = "docdb-admin"
backup_retention_period            = 30
backup_window                      = "03:00-05:00"
maintenance_window                 = "sun:06:00-sun:09:00"
apply_immediately                  = false
deletion_protection                = true
skip_final_snapshot                = false
kms_key_deletion_window_in_days    = 30
max_connections_threshold          = 1000

# Security Settings
allowed_cidr_blocks     = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
waf_enabled             = true
shield_advanced_enabled = true
guardduty_enabled       = true

# Monitoring Settings
alarm_actions         = ["arn:aws:sns:us-east-1:123456789012:prod-alerts"]
ok_actions            = ["arn:aws:sns:us-east-1:123456789012:prod-alerts"]
notification_topic_arn = "arn:aws:sns:us-east-1:123456789012:prod-notifications"