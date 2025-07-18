# Recipe Website - Quick Reference

## Architecture Overview
- **Frontend**: Next.js static site → S3 → CloudFront (HTTPS)
- **Backend**: API Gateway → Lambda (Node.js) → DynamoDB
- **Infrastructure**: Terraform managed in AWS us-east-1
- **Repository**: https://github.com/MitchStokes/personal-recipe-website

## Quick Start Commands

### Build & Deploy Frontend
```bash
cd frontend
npm run build
aws s3 sync out/ s3://$(cd ../terraform && terraform output -raw s3_bucket_name) --delete
```

### Infrastructure Management
```bash
cd terraform
terraform plan    # Review changes
terraform apply   # Deploy infrastructure
terraform output  # Show current endpoints
```

### Development
```bash
cd frontend
npm run dev  # Local development server
```

## Current Infrastructure

| Service | Value |
|---------|-------|
| **Live Site** | https://d246kr8h2r9m8y.cloudfront.net |
| **API Endpoint** | https://m68ds2kcmd.execute-api.us-east-1.amazonaws.com/prod |
| **S3 Bucket** | recipe-website-frontend-2snfzocw |
| **DynamoDB Table** | recipes |

## Environment Setup

### Required Environment Variables (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://m68ds2kcmd.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_CREATE_RECIPE_PASSWORD=Pickles39815!
```

### AWS Configuration
- Region: us-east-1
- Requires AWS CLI configured with appropriate permissions
- Terraform state stored locally (no remote backend)

## Data Schema

### Recipe Object (DynamoDB)
```javascript
{
  id: string,           // Primary key (UUID)
  name: string,         // Recipe title
  content: string,      // Recipe instructions/ingredients
  createdAt: string,    // ISO timestamp
  updatedAt?: string    // ISO timestamp (only on edits)
}
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/recipes` | List all recipes (supports ?search=query) |
| POST | `/recipes` | Create new recipe |
| PUT | `/recipes/{id}` | Update existing recipe |
| DELETE | `/recipes/{id}` | Delete recipe |

## Key Features

### Security
- ✅ Password protection for create/edit/delete operations
- ✅ HTTPS via CloudFront with free SSL certificate
- ✅ CORS configured for cross-origin requests
- ✅ S3 bucket secured (no public access, CloudFront only)

### Search & UI
- ✅ Case-sensitive search (cost-optimized with DynamoDB FilterExpression)
- ✅ Responsive design with Tailwind CSS
- ✅ Edit functionality with inline forms
- ✅ Proper error handling and loading states

## Current State & Known Issues

### Working Features
- ✅ Recipe CRUD operations with password protection
- ✅ Search functionality (case-sensitive)
- ✅ SSL/HTTPS access via CloudFront
- ✅ Edit mode for existing recipes
- ✅ Proper SPA routing with query parameters

### Known Issues
- ⚠️ Two CloudFront distributions exist - can delete old one manually (E3OLVMWKOVNIMW)
- 🔍 Search is case-sensitive (intentional cost optimization)
- 📝 No rich text editor (plain text only)

### Technical Debt
- No automated testing
- No CI/CD pipeline
- No remote Terraform state
- No monitoring/logging

## File Structure

```
recipe-website/
├── frontend/          # Next.js application
│   ├── src/app/       # App router pages
│   ├── src/components/# Reusable components
│   └── src/lib/       # Utilities (config, etc.)
├── lambda/            # AWS Lambda functions
│   ├── create-recipe.js  # Handles POST/PUT recipes
│   ├── get-recipes.js    # Handles GET recipes + search
│   └── delete-recipe.js  # Handles DELETE recipes
├── terraform/         # Infrastructure as code
│   ├── main.tf        # Main infrastructure config
│   └── outputs.tf     # Infrastructure outputs
└── CLAUDE.md          # This file
```

## Shared Components

### PasswordModal (`frontend/src/components/PasswordModal.tsx`)
Reusable modal for password authentication used across create/edit/delete operations.

### Config (`frontend/src/lib/config.ts`)
Centralized configuration with build-time validation for environment variables.

## Recent Major Changes

- **2025-01-18**: Fixed CloudFront routing - enabled query string forwarding for recipe pages
- **2025-01-18**: Implemented SSL via CloudFront with free AWS Certificate Manager cert
- **2025-01-18**: Added comprehensive password protection for all CRUD operations
- **2025-01-18**: Refactored to shared components and centralized configuration
- **2025-01-18**: Optimized search to use DynamoDB FilterExpression (case-sensitive, cost-efficient)

## Next Potential Improvements

### Short Term
- [ ] Delete old CloudFront distribution manually
- [ ] Add rich text editor for recipe content
- [ ] Implement recipe categories/tags
- [ ] Add recipe images

### Long Term
- [ ] Set up automated testing
- [ ] Implement CI/CD with GitHub Actions
- [ ] Add user authentication (multi-user support)
- [ ] Recipe sharing/public URLs
- [ ] Mobile app