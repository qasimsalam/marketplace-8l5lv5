output "domain_name" {
  description = "The name of the provisioned OpenSearch domain"
  value       = aws_opensearch_domain.main.domain_name
}

output "domain_endpoint" {
  description = "The endpoint URL for the OpenSearch domain"
  value       = aws_opensearch_domain.main.endpoint
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
  description = "The endpoint URL for OpenSearch Dashboards (Kibana)"
  value       = aws_opensearch_domain.main.kibana_endpoint
}

output "master_user_name" {
  description = "The master username for the OpenSearch domain"
  value       = var.master_user_name
}