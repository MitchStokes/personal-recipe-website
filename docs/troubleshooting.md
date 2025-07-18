# Troubleshooting Guide

## Common Issues

### Build Failures

**Frontend build fails with missing environment variables**
```bash
# Error: NEXT_PUBLIC_CREATE_RECIPE_PASSWORD environment variable is required
# Solution: Ensure .env.local exists with required variables
cp .env.example .env.local  # If you have an example file
# Then edit .env.local with actual values
```

**NPM install fails**
```bash
# Clear npm cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Deployment Issues

**S3 sync fails with access denied**
```bash
# Check AWS credentials
aws sts get-caller-identity
# Ensure your AWS user has S3 permissions for the bucket
```

**CloudFront not updating after S3 sync**
```bash
# CloudFront caches content - wait 5-10 minutes or create invalidation
aws cloudfront create-invalidation --distribution-id E4140ND83HYSU --paths "/*"
```

**Terraform apply fails**
```bash
# Check if AWS credentials are configured
aws configure list
# Ensure you're in the right directory
cd terraform
terraform plan  # Review what will change
```

### Runtime Issues

**Recipe pages show "access denied"**
- Wait 5-10 minutes after CloudFront configuration changes
- Check that query string forwarding is enabled in CloudFront
- Verify the recipe ID exists in DynamoDB

**API calls fail with CORS errors**
- Check that API Gateway has CORS enabled
- Verify the frontend is making requests to the correct API URL
- Check browser developer tools for specific error messages

**Search returns 500 error**
- Check Lambda function logs in CloudWatch
- Verify DynamoDB table permissions
- Ensure search query doesn't contain special characters

### Performance Issues

**Slow page loads**
- CloudFront cache may need time to warm up
- Check CloudWatch metrics for Lambda cold starts
- Consider implementing caching for DynamoDB queries

**High AWS costs**
- Review DynamoDB read/write units consumed
- Check CloudFront data transfer usage
- Monitor Lambda execution time and memory usage

## Debug Commands

### Check Infrastructure Status
```bash
cd terraform
terraform output  # Show all infrastructure endpoints
aws cloudfront list-distributions --query 'DistributionList.Items[].{Id:Id,Comment:Comment,Status:Status}'
aws dynamodb describe-table --table-name recipes
```

### Monitor Logs
```bash
# Lambda function logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/recipe-website
aws logs tail /aws/lambda/recipe-website-get-recipes --follow

# API Gateway access logs (if enabled)
aws logs tail API-Gateway-Execution-Logs_$(cd terraform && terraform output -raw api_gateway_id)/prod --follow
```

### Test API Directly
```bash
# Test recipe listing
curl "https://m68ds2kcmd.execute-api.us-east-1.amazonaws.com/prod/recipes"

# Test search
curl "https://m68ds2kcmd.execute-api.us-east-1.amazonaws.com/prod/recipes?search=chicken"
```

### DynamoDB Operations
```bash
# List all recipes
aws dynamodb scan --table-name recipes

# Get specific recipe
aws dynamodb get-item --table-name recipes --key '{"id":{"S":"your-recipe-id"}}'
```

## Emergency Procedures

### Rollback Deployment
```bash
# Revert to previous git commit
git log --oneline -5  # Find previous working commit
git checkout <commit-hash>

# Rebuild and redeploy
cd frontend && npm run build
aws s3 sync out/ s3://$(cd ../terraform && terraform output -raw s3_bucket_name) --delete
```

### Infrastructure Recovery
```bash
# If Terraform state is corrupted
terraform import aws_s3_bucket.website recipe-website-frontend-2snfzocw
terraform import aws_cloudfront_distribution.website E4140ND83HYSU
# Import other resources as needed

# Nuclear option: destroy and recreate (WILL LOSE DATA)
terraform destroy  # BE VERY CAREFUL
terraform apply
```

### Data Backup/Recovery
```bash
# Backup DynamoDB data
aws dynamodb scan --table-name recipes > recipes-backup.json

# Restore from backup (if table exists)
# Convert and batch write items back to DynamoDB
```

## Getting Help

1. Check this troubleshooting guide first
2. Review recent git commits for what changed
3. Check AWS CloudWatch logs for specific errors
4. Use `claude-code --resume` to continue previous conversation context
5. When asking for help, include:
   - Error messages (exact text)
   - What you were trying to do
   - Recent changes made
   - Output of `terraform output` and `git log --oneline -3`