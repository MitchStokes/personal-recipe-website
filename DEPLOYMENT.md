# Recipe Website Deployment Guide

## Prerequisites

1. **Install AWS CLI**
   ```bash
   # On macOS
   brew install awscli
   
   # On Windows
   # Download from: https://aws.amazon.com/cli/
   
   # On Ubuntu/Debian
   sudo apt install awscli
   ```

2. **Install Terraform**
   ```bash
   # On macOS
   brew install terraform
   
   # On Windows with Chocolatey
   choco install terraform
   
   # On Ubuntu/Debian
   wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
   echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
   sudo apt update && sudo apt install terraform
   ```

3. **Configure AWS Credentials**
   ```bash
   aws configure
   ```
   You'll need:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region (e.g., us-east-1)
   - Default output format (json)

## Deployment Steps

### Step 1: Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

**Important:** Note the outputs from Terraform, especially:
- `api_endpoint` - Your API Gateway URL
- `s3_bucket_name` - Your S3 bucket name
- `website_url` - Your website URL

### Step 2: Configure Frontend

```bash
cd ../frontend
cp .env.example .env.local
```

Edit `.env.local` and set:
```
NEXT_PUBLIC_API_URL=https://YOUR_API_GATEWAY_ID.execute-api.us-east-1.amazonaws.com/prod
```

### Step 3: Build Frontend

```bash
npm install
npm run build
```

### Step 4: Deploy Frontend to S3

```bash
aws s3 sync out/ s3://YOUR_BUCKET_NAME --delete
```

### Step 5: Test Your Website

Visit the `website_url` from the Terraform output to test your recipe website!

## Cost Estimation

Expected monthly costs for personal use:
- **DynamoDB**: ~$0.50 (Pay per request)
- **Lambda**: ~$0.20 (Usually within free tier)
- **S3**: ~$0.50 (Storage for static files)
- **API Gateway**: ~$1.00 (Pay per request)

**Total: ~$2-3/month for typical personal usage**

## Troubleshooting

### Common Issues:

1. **Terraform Permission Errors**
   - Ensure your AWS user has Administrator permissions
   - Or create specific IAM policies for the required services

2. **Lambda Function Zip Issues**
   - The Lambda functions need to be zipped individually
   - Terraform handles this automatically

3. **CORS Issues**
   - The API Gateway is configured with CORS
   - If you have issues, check the browser console

4. **Environment Variables**
   - Make sure the API URL in `.env.local` matches your deployed API Gateway

### Getting Help

- Check AWS CloudWatch logs for Lambda errors
- Use `terraform destroy` to clean up resources if needed
- Review the README.md for additional details

## Security Notes

- The DynamoDB table and Lambda functions are configured with least-privilege access
- S3 bucket is configured for static website hosting only
- No sensitive data should be stored in recipes (they're stored in plain text)

## Updates and Maintenance

To update your website:
1. Make changes to the code
2. Rebuild the frontend: `npm run build`
3. Redeploy to S3: `aws s3 sync out/ s3://YOUR_BUCKET_NAME --delete`

For infrastructure changes:
1. Update Terraform files
2. Run `terraform plan` and `terraform apply`