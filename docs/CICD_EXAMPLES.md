# CI/CD Pipeline Examples

This document provides example CI/CD pipelines for the Process Engineering Suite using GitHub Actions.

## GitHub Actions Workflow

### Complete Pipeline (.github/workflows/ci-cd.yml)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Test and build
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linters
        run: npm run lint

      - name: Run type checking
        run: npm run check-types

      - name: Run tests
        run: npm run test:run

      - name: Build applications
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-artifacts
          path: |
            apps/*/dist
            apps/*/.next

  # Security scanning
  security:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: "fs"
          scan-ref: "."
          format: "sarif"
          output: "trivy-results.sarif"

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: "trivy-results.sarif"

  # Build and push Docker image
  build:
    runs-on: ubuntu-latest
    needs: [test, security]
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # Deploy to staging
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment"
          # Add your staging deployment commands here
          # Example: kubectl apply -f k8s/staging/

  # Deploy to production
  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying to production environment"
          # Add your production deployment commands here
          # Example: kubectl apply -f k8s/production/

  # E2E testing (optional)
  e2e:
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run E2E tests
        run: |
          npm run test:e2e
          # Or use Playwright, Cypress, etc.
```

### Pipeline Stages Explained

#### 1. Test Stage

- Runs on every push and PR
- Installs dependencies and caches them
- Runs linting, type checking, and unit tests
- Builds all applications
- Uploads build artifacts for later stages

#### 2. Security Stage

- Runs security vulnerability scanning with Trivy
- Uploads results to GitHub Security tab
- Can block deployment if critical vulnerabilities found

#### 3. Build Stage

- Builds and pushes Docker images to GitHub Container Registry
- Uses build cache for faster builds
- Tags images with branch, PR, and SHA information

#### 4. Deployment Stages

- **Staging**: Automatic deployment from develop branch
- **Production**: Manual approval required for main branch
- Uses GitHub Environments for secrets management

#### 5. E2E Testing (Optional)

- Runs end-to-end tests against staging environment
- Can use tools like Playwright, Cypress, or custom scripts

## Alternative CI/CD Platforms

### GitLab CI (.gitlab-ci.yml)

```yaml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2

test:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm run lint
    - npm run check-types
    - npm run test:run
  cache:
    key: npm
    paths:
      - .npm/
  only:
    - merge_requests
    - main

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only:
    - main

deploy_staging:
  stage: deploy
  script:
    - echo "Deploy to staging"
    # Add deployment commands
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - develop

deploy_production:
  stage: deploy
  script:
    - echo "Deploy to production"
    # Add deployment commands
  environment:
    name: production
    url: https://app.example.com
  when: manual
  only:
    - main
```

### Jenkins Pipeline (Jenkinsfile)

```groovy
pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'process-engineering-suite'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            agent {
                docker { image 'node:18' }
            }
            steps {
                sh 'npm ci'
                sh 'npm run lint'
                sh 'npm run check-types'
                sh 'npm run test:run'
            }
        }

        stage('Build') {
            steps {
                script {
                    docker.build("${DOCKER_IMAGE}:${DOCKER_TAG}")
                }
            }
        }

        stage('Deploy Staging') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    docker.image("${DOCKER_IMAGE}:${DOCKER_TAG}").run('-d --name staging-app -p 3000:3000')
                }
            }
        }

        stage('Deploy Production') {
            when {
                branch 'main'
            }
            steps {
                timeout(time: 1, unit: 'DAYS') {
                    input message: 'Deploy to production?'
                }
                script {
                    docker.image("${DOCKER_IMAGE}:${DOCKER_TAG}").run('-d --name prod-app -p 80:3000')
                }
            }
        }
    }

    post {
        always {
            sh 'docker system prune -f'
        }
    }
}
```

## Best Practices

### Security

- Use GitHub Environments for secrets management
- Scan for vulnerabilities in dependencies and containers
- Use read-only tokens with minimal permissions
- Rotate access tokens regularly

### Performance

- Cache dependencies and Docker layers
- Use matrix builds for multiple Node.js versions if needed
- Parallelize independent jobs
- Archive and reuse test results

### Reliability

- Implement proper error handling and retries
- Use health checks before declaring deployment successful
- Rollback procedures for failed deployments
- Monitor pipeline performance and optimize slow steps

### Branch Protection

```yaml
# .github/settings.yml
repository:
  name: process-engineering-suite
  private: false
  has_wiki: false
  has_projects: false

branches:
  - name: main
    protection:
      required_status_checks:
        contexts:
          - test
          - security
          - build
      required_pull_request_reviews:
        required_approving_review_count: 1
      restrictions: {}
  - name: develop
    protection:
      required_status_checks:
        contexts:
          - test
      required_pull_request_reviews:
        required_approving_review_count: 1
```

## Monitoring and Alerts

### Pipeline Metrics

- Track build times and failure rates
- Monitor test coverage trends
- Alert on security vulnerabilities
- Dashboard for deployment frequency

### Integration with Monitoring Tools

```yaml
# Send notifications to Slack
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  if: always()
  with:
    status: ${{ job.status }}
    channel: "#deployments"
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Related Documentation

- `DEPLOYMENT_GUIDE.md` - Deployment overview
- `DOCKER_DEPLOYMENT.md` - Docker commands
- `BACKUP_RESTORE.md` - Backup procedures
- `TROUBLESHOOTING.md` - Issue resolution
