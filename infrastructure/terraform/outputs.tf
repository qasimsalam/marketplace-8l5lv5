# Main VPC output
output "vpc_id" {
  description = "The ID of the main VPC"
  value       = module.vpc.vpc_id
}

# Kubernetes (EKS) cluster outputs
output "kubernetes_cluster_endpoint" {
  description = "The endpoint for the Kubernetes API server"
  value       = module.eks.cluster_endpoint
}

output "kubernetes_cluster_name" {
  description = "The name of the Kubernetes cluster"
  value       = module.eks.cluster_name
}

output "kubernetes_cluster_certificate_authority_data" {
  description = "The certificate authority data for the Kubernetes cluster"
  value       = module.eks.cluster_certificate_authority_data
}

# Database endpoint outputs
output "database_endpoints" {
  description = "Map of database endpoints"
  value = {
    postgres   = module.rds.endpoint
    documentdb = module.documentdb.endpoint
    redis      = module.elasticache.redis_endpoint
    opensearch = module.opensearch.domain_endpoint
  }
}

# Database credentials secret ARNs
output "database_credentials_secret_arns" {
  description = "Map of ARNs for secrets containing database credentials"
  value = {
    postgres   = module.rds.secret_arn
    documentdb = module.documentdb.secret_arn
  }
}

# S3 bucket outputs
output "s3_buckets" {
  description = "Map of S3 bucket names"
  value = {
    logs   = aws_s3_bucket.logs.bucket
    assets = aws_s3_bucket.assets.bucket
  }
}

# CloudFront output
output "cloudfront_domain_name" {
  description = "The domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.assets.domain_name
}

# Detailed network information
output "network_details" {
  description = "Detailed network information"
  value = {
    vpc_id           = module.vpc.vpc_id
    public_subnets   = module.vpc.public_subnets
    private_subnets  = module.vpc.private_subnets
    database_subnets = module.vpc.database_subnets
    vpc_cidr_block   = module.vpc.vpc_cidr_block
    azs              = module.vpc.azs
  }
}

# Monitoring tool endpoints
output "monitoring_endpoints" {
  description = "Endpoints for monitoring tools"
  value = {
    prometheus           = var.monitoring_enabled ? aws_lb.monitoring[0].dns_name : ""
    grafana              = var.monitoring_enabled ? aws_route53_record.grafana[0].fqdn : ""
    opensearch_dashboards = module.opensearch.kibana_endpoint
  }
}