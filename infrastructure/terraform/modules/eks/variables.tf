variable "project" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "ai-talent-marketplace"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC where the EKS cluster will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs where EKS nodes will be deployed (should be private subnets)"
  type        = list(string)
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.27"
}

variable "node_groups" {
  description = "Map of node groups to create with their properties (instance types, min/max/desired capacity, disk size)"
  type        = map(any)
  default = {
    general = {
      instance_types = ["t3.xlarge"]
      min_size       = 2
      max_size       = 10
      desired_size   = 3
      disk_size      = 100
      capacity_type  = "ON_DEMAND"
    }
    cpu = {
      instance_types = ["c6i.2xlarge"]
      min_size       = 2
      max_size       = 8
      desired_size   = 2
      disk_size      = 100
      capacity_type  = "ON_DEMAND"
    }
    memory = {
      instance_types = ["r6i.2xlarge"]
      min_size       = 2
      max_size       = 6
      desired_size   = 2
      disk_size      = 100
      capacity_type  = "ON_DEMAND"
    }
  }
}

variable "enable_cluster_encryption" {
  description = "Whether to enable envelope encryption for Kubernetes secrets using AWS KMS"
  type        = bool
  default     = true
}

variable "cluster_log_types" {
  description = "List of control plane logging components to enable (api, audit, authenticator, controllerManager, scheduler)"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

variable "cluster_log_retention_days" {
  description = "Number of days to retain cluster logs in CloudWatch"
  type        = number
  default     = 90
}

variable "enable_private_endpoint" {
  description = "Whether to enable private endpoint access for the EKS API server"
  type        = bool
  default     = true
}

variable "enable_public_endpoint" {
  description = "Whether to enable public endpoint access for the EKS API server"
  type        = bool
  default     = true
}

variable "public_access_cidrs" {
  description = "List of CIDR blocks that can access the EKS API server public endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "additional_security_group_ids" {
  description = "List of additional security group IDs to attach to the EKS cluster"
  type        = list(string)
  default     = []
}

variable "enable_aws_load_balancer_controller" {
  description = "Whether to install the AWS Load Balancer Controller as an EKS add-on"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags to apply to all EKS resources"
  type        = map(string)
  default     = {}
}