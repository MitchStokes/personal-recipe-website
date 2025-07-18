terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# DynamoDB Table for recipes
resource "aws_dynamodb_table" "recipes" {
  name           = "recipes"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name = "${var.project_name}-recipes"
  }
}

# S3 bucket for static website hosting
resource "aws_s3_bucket" "website" {
  bucket = "${var.project_name}-frontend-${random_string.bucket_suffix.result}"
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 bucket policy will be handled by the CloudFront policy below

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "${var.project_name}-oac"
  description                       = "Origin Access Control for ${var.project_name} S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "website" {
  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
    origin_id                = "S3-${aws_s3_bucket.website.bucket}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} static website"
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.website.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Name = "${var.project_name}-cloudfront"
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# S3 bucket policy to allow CloudFront access
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.website.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.website.arn
          }
        }
      }
    ]
  })

  depends_on = [
    aws_cloudfront_distribution.website,
    aws_s3_bucket_public_access_block.website
  ]
}

# IAM role for Lambda functions
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_name}-lambda-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.recipes.arn
      }
    ]
  })
}

# Lambda function for getting recipes
data "archive_file" "get_recipes_zip" {
  type        = "zip"
  source_dir  = "../lambda"
  output_path = "get-recipes.zip"
  excludes    = ["*.zip", "*.md"]
}

resource "aws_lambda_function" "get_recipes" {
  filename         = "get-recipes.zip"
  function_name    = "${var.project_name}-get-recipes"
  role            = aws_iam_role.lambda_role.arn
  handler         = "get-recipes.handler"
  source_code_hash = data.archive_file.get_recipes_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30
}

# Lambda function for creating recipes
data "archive_file" "create_recipe_zip" {
  type        = "zip"
  source_dir  = "../lambda"
  output_path = "create-recipe.zip"
  excludes    = ["*.zip", "*.md"]
}

resource "aws_lambda_function" "create_recipe" {
  filename         = "create-recipe.zip"
  function_name    = "${var.project_name}-create-recipe"
  role            = aws_iam_role.lambda_role.arn
  handler         = "create-recipe.handler"
  source_code_hash = data.archive_file.create_recipe_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30
}

# Lambda function for deleting recipes
data "archive_file" "delete_recipe_zip" {
  type        = "zip"
  source_dir  = "../lambda"
  output_path = "delete-recipe.zip"
  excludes    = ["*.zip", "*.md"]
}

resource "aws_lambda_function" "delete_recipe" {
  filename         = "delete-recipe.zip"
  function_name    = "${var.project_name}-delete-recipe"
  role            = aws_iam_role.lambda_role.arn
  handler         = "delete-recipe.handler"
  source_code_hash = data.archive_file.delete_recipe_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30
}

# API Gateway
resource "aws_api_gateway_rest_api" "recipe_api" {
  name        = "${var.project_name}-api"
  description = "Recipe API"
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# API Gateway resources
resource "aws_api_gateway_resource" "recipes" {
  rest_api_id = aws_api_gateway_rest_api.recipe_api.id
  parent_id   = aws_api_gateway_rest_api.recipe_api.root_resource_id
  path_part   = "recipes"
}

resource "aws_api_gateway_resource" "recipe_by_id" {
  rest_api_id = aws_api_gateway_rest_api.recipe_api.id
  parent_id   = aws_api_gateway_resource.recipes.id
  path_part   = "{id}"
}

# GET method for recipes
resource "aws_api_gateway_method" "get_recipes" {
  rest_api_id   = aws_api_gateway_rest_api.recipe_api.id
  resource_id   = aws_api_gateway_resource.recipes.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_recipes" {
  rest_api_id = aws_api_gateway_rest_api.recipe_api.id
  resource_id = aws_api_gateway_resource.recipes.id
  http_method = aws_api_gateway_method.get_recipes.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.get_recipes.invoke_arn
}

# POST method for recipes
resource "aws_api_gateway_method" "post_recipes" {
  rest_api_id   = aws_api_gateway_rest_api.recipe_api.id
  resource_id   = aws_api_gateway_resource.recipes.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "post_recipes" {
  rest_api_id = aws_api_gateway_rest_api.recipe_api.id
  resource_id = aws_api_gateway_resource.recipes.id
  http_method = aws_api_gateway_method.post_recipes.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.create_recipe.invoke_arn
}

# Enable CORS
resource "aws_api_gateway_method" "options_recipes" {
  rest_api_id   = aws_api_gateway_rest_api.recipe_api.id
  resource_id   = aws_api_gateway_resource.recipes.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_recipes" {
  rest_api_id = aws_api_gateway_rest_api.recipe_api.id
  resource_id = aws_api_gateway_resource.recipes.id
  http_method = aws_api_gateway_method.options_recipes.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_recipes" {
  rest_api_id = aws_api_gateway_rest_api.recipe_api.id
  resource_id = aws_api_gateway_resource.recipes.id
  http_method = aws_api_gateway_method.options_recipes.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_recipes" {
  rest_api_id = aws_api_gateway_rest_api.recipe_api.id
  resource_id = aws_api_gateway_resource.recipes.id
  http_method = aws_api_gateway_method.options_recipes.http_method
  status_code = aws_api_gateway_method_response.options_recipes.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Deploy API
resource "aws_api_gateway_deployment" "recipe_api" {
  depends_on = [
    aws_api_gateway_integration.get_recipes,
    aws_api_gateway_integration.post_recipes,
    aws_api_gateway_integration.options_recipes,
    aws_api_gateway_integration.delete_recipe,
    aws_api_gateway_integration.options_recipe_by_id
  ]

  rest_api_id = aws_api_gateway_rest_api.recipe_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.recipes.id,
      aws_api_gateway_resource.recipe_by_id.id,
      aws_api_gateway_method.get_recipes.id,
      aws_api_gateway_method.post_recipes.id,
      aws_api_gateway_method.delete_recipe.id,
      aws_api_gateway_integration.get_recipes.id,
      aws_api_gateway_integration.post_recipes.id,
      aws_api_gateway_integration.delete_recipe.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.recipe_api.id
  rest_api_id   = aws_api_gateway_rest_api.recipe_api.id
  stage_name    = "prod"
}

# Method responses for GET
resource "aws_api_gateway_method_response" "get_recipes" {
  rest_api_id = aws_api_gateway_rest_api.recipe_api.id
  resource_id = aws_api_gateway_resource.recipes.id
  http_method = aws_api_gateway_method.get_recipes.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# Method responses for POST
resource "aws_api_gateway_method_response" "post_recipes" {
  rest_api_id = aws_api_gateway_rest_api.recipe_api.id
  resource_id = aws_api_gateway_resource.recipes.id
  http_method = aws_api_gateway_method.post_recipes.http_method
  status_code = "201"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# DELETE method for individual recipes
resource "aws_api_gateway_method" "delete_recipe" {
  rest_api_id   = aws_api_gateway_rest_api.recipe_api.id
  resource_id   = aws_api_gateway_resource.recipe_by_id.id
  http_method   = "DELETE"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "delete_recipe" {
  rest_api_id = aws_api_gateway_rest_api.recipe_api.id
  resource_id = aws_api_gateway_resource.recipe_by_id.id
  http_method = aws_api_gateway_method.delete_recipe.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.delete_recipe.invoke_arn
}

# OPTIONS method for recipe by ID (CORS)
resource "aws_api_gateway_method" "options_recipe_by_id" {
  rest_api_id   = aws_api_gateway_rest_api.recipe_api.id
  resource_id   = aws_api_gateway_resource.recipe_by_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_recipe_by_id" {
  rest_api_id = aws_api_gateway_rest_api.recipe_api.id
  resource_id = aws_api_gateway_resource.recipe_by_id.id
  http_method = aws_api_gateway_method.options_recipe_by_id.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_recipe_by_id" {
  rest_api_id = aws_api_gateway_rest_api.recipe_api.id
  resource_id = aws_api_gateway_resource.recipe_by_id.id
  http_method = aws_api_gateway_method.options_recipe_by_id.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_recipe_by_id" {
  rest_api_id = aws_api_gateway_rest_api.recipe_api.id
  resource_id = aws_api_gateway_resource.recipe_by_id.id
  http_method = aws_api_gateway_method.options_recipe_by_id.http_method
  status_code = aws_api_gateway_method_response.options_recipe_by_id.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Method response for DELETE
resource "aws_api_gateway_method_response" "delete_recipe" {
  rest_api_id = aws_api_gateway_rest_api.recipe_api.id
  resource_id = aws_api_gateway_resource.recipe_by_id.id
  http_method = aws_api_gateway_method.delete_recipe.http_method
  status_code = "204"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# Lambda permissions
resource "aws_lambda_permission" "get_recipes" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_recipes.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.recipe_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "create_recipe" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_recipe.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.recipe_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "delete_recipe" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete_recipe.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.recipe_api.execution_arn}/*/*"
}