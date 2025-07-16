# Personal Recipe Website

A simple recipe website where you can create, store, and search recipes. Built with Next.js frontend and AWS serverless backend.

## Architecture

- **Frontend**: Next.js static site (hosted on S3)
- **Backend**: AWS Lambda functions
- **Database**: DynamoDB
- **Infrastructure**: Managed with Terraform

## Features

- Create recipes with name and text content
- Real-time search by recipe name
- Simple, responsive UI
- Serverless architecture (low cost, no maintenance)

## Deployment

### Prerequisites

- AWS CLI configured with appropriate permissions
- Terraform installed
- Node.js 18+ installed

### 1. Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

This creates:
- DynamoDB table for recipes
- Lambda functions for API
- API Gateway for HTTP endpoints
- S3 bucket for static hosting

### 2. Configure Frontend

After Terraform deployment, copy the API endpoint URL from the output:

```bash
# Copy .env.example to .env.local
cd ../frontend
cp .env.example .env.local

# Edit .env.local and set the API URL from Terraform output
NEXT_PUBLIC_API_URL=https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/prod
```

### 3. Build and Deploy Frontend

```bash
cd frontend
npm install
npm run build
```

Upload the `out/` folder contents to your S3 bucket:

```bash
aws s3 sync out/ s3://your-bucket-name --delete
```

### 4. Access Your Website

Visit the S3 website URL from Terraform output to access your recipe website.

## Development

Run locally for development:

```bash
cd frontend
npm run dev
```

Note: You'll need the deployed backend infrastructure for the API calls to work.

## Project Structure

```
recipe-website/
├── frontend/           # Next.js application
│   ├── src/app/
│   │   ├── page.tsx   # Home page with search
│   │   └── create/
│   │       └── page.tsx # Create recipe page
│   └── .env.example
├── lambda/            # AWS Lambda functions
│   ├── get-recipes.js # Search/list recipes
│   └── create-recipe.js # Create new recipe
├── terraform/         # Infrastructure as code
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
└── README.md
```

## Costs

This setup is designed to be very cost-effective for personal use:
- DynamoDB: Pay per request (very cheap for low usage)
- Lambda: Free tier covers most personal usage
- S3: Minimal storage costs for static files
- API Gateway: Pay per request

Expected monthly cost for personal use: < $5