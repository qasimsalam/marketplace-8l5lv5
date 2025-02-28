# Outputs for EKS cluster
# These outputs expose essential information about the created Amazon EKS cluster
# for use by other modules, CI/CD pipelines, and external tools

output "cluster_name" {
  description = "The name of the EKS cluster"
  value       = aws_eks_cluster.this.name
}

output "cluster_id" {
  description = "The ID of the EKS cluster"
  value       = aws_eks_cluster.this.id
}

output "cluster_arn" {
  description = "The Amazon Resource Name (ARN) of the EKS cluster"
  value       = aws_eks_cluster.this.arn
}

output "cluster_endpoint" {
  description = "The endpoint URL for the Kubernetes API server"
  value       = aws_eks_cluster.this.endpoint
}

output "cluster_certificate_authority_data" {
  description = "The base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.this.certificate_authority[0].data
  sensitive   = false
}

output "cluster_security_group_id" {
  description = "The security group ID attached to the EKS cluster control plane"
  value       = aws_eks_cluster.this.vpc_config[0].cluster_security_group_id
}

output "node_security_group_id" {
  description = "The security group ID attached to the EKS worker nodes"
  value       = aws_security_group.node_group_sg.id
}

output "node_role_arn" {
  description = "The Amazon Resource Name (ARN) of the IAM role used by the EKS node groups"
  value       = aws_iam_role.node_role.arn
}

output "oidc_provider_arn" {
  description = "The ARN of the OIDC Provider for EKS to enable IAM roles for service accounts"
  value       = aws_iam_openid_connect_provider.eks_oidc.arn
}

output "oidc_provider_url" {
  description = "The URL of the OIDC Provider for configuring IAM roles for service accounts"
  value       = replace(aws_iam_openid_connect_provider.eks_oidc.url, "https://", "")
}

output "node_groups" {
  description = "Map of all EKS node groups created with their attributes"
  value = {
    general = {
      name     = try(aws_eks_node_group.general[*].node_group_name, null)
      status   = try(aws_eks_node_group.general[*].status, null)
      capacity = try(aws_eks_node_group.general[*].scaling_config[0].desired_size, null)
    }
    cpu_optimized = {
      name     = try(aws_eks_node_group.cpu_optimized[*].node_group_name, null)
      status   = try(aws_eks_node_group.cpu_optimized[*].status, null)
      capacity = try(aws_eks_node_group.cpu_optimized[*].scaling_config[0].desired_size, null)
    }
    memory_optimized = {
      name     = try(aws_eks_node_group.memory_optimized[*].node_group_name, null)
      status   = try(aws_eks_node_group.memory_optimized[*].status, null)
      capacity = try(aws_eks_node_group.memory_optimized[*].scaling_config[0].desired_size, null)
    }
  }
}

output "kubeconfig" {
  description = "Kubeconfig for connecting to the EKS cluster"
  value       = local.kubeconfig
  sensitive   = true
}

# Local value to generate kubeconfig content
locals {
  kubeconfig = <<KUBECONFIG
apiVersion: v1
clusters:
- cluster:
    server: ${aws_eks_cluster.this.endpoint}
    certificate-authority-data: ${aws_eks_cluster.this.certificate_authority[0].data}
  name: ${aws_eks_cluster.this.name}
contexts:
- context:
    cluster: ${aws_eks_cluster.this.name}
    user: ${aws_eks_cluster.this.name}
  name: ${aws_eks_cluster.this.name}
current-context: ${aws_eks_cluster.this.name}
kind: Config
preferences: {}
users:
- name: ${aws_eks_cluster.this.name}
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: aws
      args:
        - "eks"
        - "get-token"
        - "--cluster-name"
        - "${aws_eks_cluster.this.name}"
        - "--region"
        - "${data.aws_region.current.name}"
KUBECONFIG
}

# Get current AWS region for kubeconfig
data "aws_region" "current" {}