output "website_url" {
  description = "URL of the static website"
  value       = "http://${aws_s3_bucket.website.bucket}.s3-website-${var.aws_region}.amazonaws.com"
}

output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = "${aws_api_gateway_rest_api.recipe_api.execution_arn}"
}

output "api_endpoint" {
  description = "API endpoint URL"
  value       = "https://${aws_api_gateway_rest_api.recipe_api.id}.execute-api.${var.aws_region}.amazonaws.com/prod"
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.website.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "cloudfront_url" {
  description = "HTTPS URL of the website via CloudFront"
  value       = "https://${aws_cloudfront_distribution.website.domain_name}"
}