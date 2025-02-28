#--------------------------------------------------------------
# AI Talent Marketplace - VPC Module Variables
# Defines all the input variables required to configure the VPC
# infrastructure for secure, multi-AZ deployment
#--------------------------------------------------------------

variable "project" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "ai-talent-marketplace"
  nullable    = false
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod) for resource naming"
  type        = string
  nullable    = false
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
  nullable    = false
}

variable "azs" {
  description = "List of availability zones to deploy resources in"
  type        = list(string)
  nullable    = false
}

variable "public_subnets" {
  description = "List of CIDR blocks for public subnets, one per AZ"
  type        = list(string)
  default     = []
  nullable    = true
}

variable "private_subnets" {
  description = "List of CIDR blocks for private subnets, one per AZ"
  type        = list(string)
  default     = []
  nullable    = true
}

variable "database_subnets" {
  description = "List of CIDR blocks for database subnets, one per AZ"
  type        = list(string)
  default     = []
  nullable    = true
}

variable "create_database_subnet_group" {
  description = "Flag to create a database subnet group from the database subnets"
  type        = bool
  default     = true
  nullable    = false
}

variable "enable_nat_gateway" {
  description = "Flag to enable NAT gateways for private subnet internet access"
  type        = bool
  default     = true
  nullable    = false
}

variable "single_nat_gateway" {
  description = "Flag to use a single NAT gateway for all private subnets (cost optimization)"
  type        = bool
  default     = false
  nullable    = false
}

variable "one_nat_gateway_per_az" {
  description = "Flag to deploy one NAT gateway per availability zone (high availability)"
  type        = bool
  default     = true
  nullable    = false
}

variable "enable_vpn_gateway" {
  description = "Flag to enable a VPN gateway for secure remote access"
  type        = bool
  default     = false
  nullable    = false
}

variable "enable_dns_hostnames" {
  description = "Flag to enable DNS hostnames in the VPC"
  type        = bool
  default     = true
  nullable    = false
}

variable "enable_dns_support" {
  description = "Flag to enable DNS support in the VPC"
  type        = bool
  default     = true
  nullable    = false
}

variable "enable_flow_log" {
  description = "Flag to enable VPC flow logs for network traffic monitoring and security analysis"
  type        = bool
  default     = true
  nullable    = false
}

variable "flow_log_destination_type" {
  description = "Type of flow log destination (cloud-watch-logs or s3)"
  type        = string
  default     = "cloud-watch-logs"
  nullable    = false
}

variable "flow_log_retention_in_days" {
  description = "Number of days to retain VPC flow logs in CloudWatch"
  type        = number
  default     = 30
  nullable    = false
}

variable "flow_log_traffic_type" {
  description = "Type of traffic to capture in flow logs (ACCEPT, REJECT, or ALL)"
  type        = string
  default     = "ALL"
  nullable    = false
}

variable "flow_log_log_format" {
  description = "Custom format for VPC flow logs"
  type        = string
  default     = null
  nullable    = true
}

variable "vpc_flow_log_tags" {
  description = "Additional tags for the VPC flow logs"
  type        = map(string)
  default     = {}
  nullable    = true
}

variable "tags" {
  description = "Map of tags to apply to all resources"
  type        = map(string)
  default     = {}
  nullable    = true
}