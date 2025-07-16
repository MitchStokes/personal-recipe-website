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

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website.arn}/*"
      },
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.website]
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
  source_file = "../lambda/get-recipes.js"
  output_path = "get-recipes.zip"
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
  source_file = "../lambda/create-recipe.js"
  output_path = "create-recipe.zip"
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
    aws_api_gateway_integration.options_recipes
  ]

  rest_api_id = aws_api_gateway_rest_api.recipe_api.id
  stage_name  = "prod"
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