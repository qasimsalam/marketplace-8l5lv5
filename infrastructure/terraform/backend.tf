terraform {
  backend "s3" {
    bucket               = "ai-talent-marketplace-terraform-state"
    key                  = "terraform.tfstate"
    region               = "us-east-1"
    encrypt              = true
    dynamodb_table       = "terraform-state-lock"
    workspace_key_prefix = "environments"
  }
}