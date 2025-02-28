#------------------------------------------------------------------------
# AI Talent Marketplace - VPC Module
# Creates a comprehensive AWS VPC infrastructure with multiple subnets,
# gateways, routing, and security configurations for the platform.
#------------------------------------------------------------------------

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.67.0"
    }
  }
}

locals {
  name = "${var.project}-${var.environment}"
  
  # If subnet CIDR blocks aren't provided, calculate them from the VPC CIDR
  public_subnets   = length(var.public_subnets) > 0 ? var.public_subnets : [
    for i, az in var.azs : cidrsubnet(var.vpc_cidr, 8, i)
  ]
  
  private_subnets  = length(var.private_subnets) > 0 ? var.private_subnets : [
    for i, az in var.azs : cidrsubnet(var.vpc_cidr, 8, i + length(var.azs))
  ]
  
  database_subnets = length(var.database_subnets) > 0 ? var.database_subnets : [
    for i, az in var.azs : cidrsubnet(var.vpc_cidr, 8, i + 2 * length(var.azs))
  ]
  
  # Determine how many NAT gateways to create
  nat_gateway_count = var.enable_nat_gateway ? (
    var.single_nat_gateway ? 1 : (
      var.one_nat_gateway_per_az ? length(var.azs) : 0
    )
  ) : 0
  
  # Common tags for all resources
  common_tags = merge(
    var.tags,
    {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  )
}

#---------------------------------------
# VPC
#---------------------------------------
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = var.enable_dns_support
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-vpc"
    }
  )
}

#---------------------------------------
# Public Subnets
#---------------------------------------
resource "aws_subnet" "public" {
  count = length(var.azs)
  
  vpc_id                  = aws_vpc.this.id
  cidr_block              = local.public_subnets[count.index]
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-public-subnet-${var.azs[count.index]}"
      Tier = "public"
    }
  )
}

#---------------------------------------
# Private Subnets
#---------------------------------------
resource "aws_subnet" "private" {
  count = length(var.azs)
  
  vpc_id                  = aws_vpc.this.id
  cidr_block              = local.private_subnets[count.index]
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = false
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-private-subnet-${var.azs[count.index]}"
      Tier = "private"
    }
  )
}

#---------------------------------------
# Database Subnets
#---------------------------------------
resource "aws_subnet" "database" {
  count = length(var.azs)
  
  vpc_id                  = aws_vpc.this.id
  cidr_block              = local.database_subnets[count.index]
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = false
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-database-subnet-${var.azs[count.index]}"
      Tier = "database"
    }
  )
}

#---------------------------------------
# Internet Gateway
#---------------------------------------
resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-igw"
    }
  )
}

#---------------------------------------
# NAT Gateway & Elastic IPs
#---------------------------------------
resource "aws_eip" "nat" {
  count = local.nat_gateway_count
  
  vpc = true
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-nat-eip-${count.index + 1}"
    }
  )
  
  depends_on = [aws_internet_gateway.this]
}

resource "aws_nat_gateway" "this" {
  count = local.nat_gateway_count
  
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-nat-gateway-${count.index + 1}"
    }
  )
  
  depends_on = [aws_internet_gateway.this]
}

#---------------------------------------
# Route Tables
#---------------------------------------
# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-public-rt"
      Tier = "public"
    }
  )
}

# Public Routes (to Internet Gateway)
resource "aws_route" "public_internet_gateway" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this.id
}

# Private Route Tables
resource "aws_route_table" "private" {
  count = local.nat_gateway_count > 0 ? length(var.azs) : 1
  
  vpc_id = aws_vpc.this.id
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-private-rt${local.nat_gateway_count > 1 ? "-${var.azs[count.index]}" : ""}"
      Tier = "private"
    }
  )
}

# Private Routes (to NAT Gateway)
resource "aws_route" "private_nat_gateway" {
  count = local.nat_gateway_count > 0 ? length(var.azs) : 0
  
  route_table_id         = aws_route_table.private[var.single_nat_gateway ? 0 : count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this[var.single_nat_gateway ? 0 : count.index].id
}

# Database Route Table
resource "aws_route_table" "database" {
  vpc_id = aws_vpc.this.id
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-database-rt"
      Tier = "database"
    }
  )
}

# Database Routes (to NAT Gateway if enabled)
resource "aws_route" "database_nat_gateway" {
  count = var.enable_nat_gateway && local.nat_gateway_count > 0 ? 1 : 0
  
  route_table_id         = aws_route_table.database.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this[0].id
}

#---------------------------------------
# Route Table Associations
#---------------------------------------
# Public Subnets
resource "aws_route_table_association" "public" {
  count = length(var.azs)
  
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private Subnets
resource "aws_route_table_association" "private" {
  count = length(var.azs)
  
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = var.single_nat_gateway ? aws_route_table.private[0].id : aws_route_table.private[count.index].id
}

# Database Subnets
resource "aws_route_table_association" "database" {
  count = length(var.azs)
  
  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.database.id
}

#---------------------------------------
# Database Subnet Group
#---------------------------------------
resource "aws_db_subnet_group" "database" {
  count = length(var.azs) > 0 && var.create_database_subnet_group ? 1 : 0
  
  name        = "${local.name}-db-subnet-group"
  description = "Database subnet group for ${local.name}"
  subnet_ids  = aws_subnet.database[*].id
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-db-subnet-group"
    }
  )
}

#---------------------------------------
# Security Groups
#---------------------------------------
# Default Security Group
resource "aws_security_group" "default" {
  name        = "${local.name}-default-sg"
  description = "Default security group for ${local.name} VPC"
  vpc_id      = aws_vpc.this.id
  
  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }
  
  # Allow internal communication
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
    description = "Allow internal communication"
  }
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-default-sg"
    }
  )
}

# Application Security Group (for EC2, ECS, EKS)
resource "aws_security_group" "application" {
  name        = "${local.name}-app-sg"
  description = "Security group for application services in ${local.name}"
  vpc_id      = aws_vpc.this.id
  
  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }
  
  # Allow HTTP/HTTPS from load balancer
  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.lb.id]
    description     = "Allow HTTP from load balancer"
  }
  
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.lb.id]
    description     = "Allow HTTPS from load balancer"
  }
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-app-sg"
    }
  )
}

# Load Balancer Security Group
resource "aws_security_group" "lb" {
  name        = "${local.name}-lb-sg"
  description = "Security group for load balancers in ${local.name}"
  vpc_id      = aws_vpc.this.id
  
  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }
  
  # Allow HTTP/HTTPS from internet
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP from internet"
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS from internet"
  }
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-lb-sg"
    }
  )
}

# Database Security Group
resource "aws_security_group" "database" {
  name        = "${local.name}-db-sg"
  description = "Security group for database instances in ${local.name}"
  vpc_id      = aws_vpc.this.id
  
  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }
  
  # Allow database access from application tier only
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.application.id]
    description     = "Allow PostgreSQL from application tier"
  }
  
  ingress {
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.application.id]
    description     = "Allow MongoDB from application tier"
  }
  
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.application.id]
    description     = "Allow Redis from application tier"
  }
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-db-sg"
    }
  )
}

#---------------------------------------
# VPC Flow Logs
#---------------------------------------
resource "aws_cloudwatch_log_group" "flow_log" {
  count = var.enable_flow_log && var.flow_log_destination_type == "cloud-watch-logs" ? 1 : 0
  
  name              = "/aws/vpc-flow-log/${aws_vpc.this.id}"
  retention_in_days = var.flow_log_retention_in_days
  
  tags = merge(
    local.common_tags,
    var.vpc_flow_log_tags,
    {
      Name = "${local.name}-vpc-flow-log-group"
    }
  )
}

resource "aws_iam_role" "vpc_flow_log" {
  count = var.enable_flow_log && var.flow_log_destination_type == "cloud-watch-logs" ? 1 : 0
  
  name = "${local.name}-vpc-flow-log-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-vpc-flow-log-role"
    }
  )
}

resource "aws_iam_policy" "vpc_flow_log" {
  count = var.enable_flow_log && var.flow_log_destination_type == "cloud-watch-logs" ? 1 : 0
  
  name        = "${local.name}-vpc-flow-log-policy"
  description = "IAM policy for VPC Flow Logs"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-vpc-flow-log-policy"
    }
  )
}

resource "aws_iam_role_policy_attachment" "vpc_flow_log" {
  count = var.enable_flow_log && var.flow_log_destination_type == "cloud-watch-logs" ? 1 : 0
  
  role       = aws_iam_role.vpc_flow_log[0].name
  policy_arn = aws_iam_policy.vpc_flow_log[0].arn
}

resource "aws_flow_log" "vpc_flow_log" {
  count = var.enable_flow_log ? 1 : 0
  
  iam_role_arn        = var.flow_log_destination_type == "cloud-watch-logs" ? aws_iam_role.vpc_flow_log[0].arn : null
  log_destination     = var.flow_log_destination_type == "cloud-watch-logs" ? aws_cloudwatch_log_group.flow_log[0].arn : null
  log_destination_type = var.flow_log_destination_type
  traffic_type        = var.flow_log_traffic_type
  vpc_id              = aws_vpc.this.id
  log_format          = var.flow_log_log_format
  
  tags = merge(
    local.common_tags,
    var.vpc_flow_log_tags,
    {
      Name = "${local.name}-vpc-flow-log"
    }
  )
}

#---------------------------------------
# VPN Gateway (if enabled)
#---------------------------------------
resource "aws_vpn_gateway" "this" {
  count = var.enable_vpn_gateway ? 1 : 0
  
  vpc_id = aws_vpc.this.id
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name}-vpn-gateway"
    }
  )
}