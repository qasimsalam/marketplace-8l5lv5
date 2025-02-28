# Terraform configuration with required providers and minimum version
terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.67.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 4.80.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5.1"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2.0"
    }
  }
}

# Default AWS provider for primary region
provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# AWS provider for US East 1 (Virginia) region
provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Region      = "us-east-1"
    }
  }
}

# AWS provider for US West 2 (Oregon) region
provider "aws" {
  alias  = "us-west-2"
  region = "us-west-2"
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Region      = "us-west-2"
    }
  }
}

# AWS provider for EU West 1 (Ireland) region
provider "aws" {
  alias  = "eu-west-1"
  region = "eu-west-1"
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Region      = "eu-west-1"
    }
  }
}

# Google Cloud Platform provider for disaster recovery
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
  count   = var.gcp_project_id != "" ? 1 : 0
}

# Data sources for Kubernetes provider configuration
data "aws_eks_cluster" "main" {
  name = "${var.project}-${var.environment}"
}

data "aws_eks_cluster_auth" "main" {
  name = "${var.project}-${var.environment}"
}

# Kubernetes provider for EKS cluster management
provider "kubernetes" {
  host                   = data.aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    args        = ["eks", "get-token", "--cluster-name", "${var.project}-${var.environment}"]
    command     = "aws"
  }
}

# Common tags to be applied across resources
locals {
  default_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}