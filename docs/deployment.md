# AWS Production Deployment Guide for CloudVault

This guide provides step-by-step instructions to deploy CloudVault onto AWS. The deployment is structured in 13 progressive phases, taking you from local Docker containers to a secure, highly available, and automated cloud infrastructure.

---

## Architecture Blueprint

```
                      [Route 53 DNS]
                            │
               [AWS Certificate Manager (SSL)]
                            │
               [Application Load Balancer] (Port 80/443)
                            │
               ┌────────────┴────────────┐
               ▼ (Public Subnets)        ▼
         [EC2 Instance 1]          [EC2 Instance 2]
          (Docker App)              (Docker App)
               │                         │
               └────────────┬────────────┘
                            │ (Private Subnets)
                            ▼
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
       [RDS MySQL]     [S3 Bucket]    [ElastiCache]
       (Users/Files)   (Raw Files)    (Cache/Sessions)
                            │ (Event)
                            ▼
                      [AWS Lambda] (Thumbnails)
```

---

## Phase 1: Local Development with Docker

Verify that the application works seamlessly on your machine.

1. **Prerequisites**: Ensure Docker and Docker Compose are installed.
2. **Build and Run**: In the root directory `CloudVault/`, run:
   ```bash
   docker-compose up --build
   ```
3. **Verify**:
   - Access the frontend dashboard at `http://localhost`.
   - The frontend automatically routes `/api` requests through Nginx to the backend container (port 5000), which connects to the MySQL container (port 3306).
   - Sign up the first user. It will automatically be assigned the `admin` role. Upload, preview, and download documents to verify.

---

## Phase 2: Design the Network (VPC)

Isolate your application in a custom virtual network.

1. **Create VPC**: Go to AWS console → VPC → **Create VPC**.
   - Name: `cloudvault-vpc`
   - CIDR block: `10.0.0.0/16`
2. **Create Subnets**: Set up 4 subnets in 2 Availability Zones (AZs) for high availability:
   - **Public Subnet 1**: `10.0.1.0/24` (AZ: `us-east-1a`)
   - **Public Subnet 2**: `10.0.2.0/24` (AZ: `us-east-1b`)
   - **Private Subnet 1**: `10.0.11.0/24` (AZ: `us-east-1a`)
   - **Private Subnet 2**: `10.0.12.0/24` (AZ: `us-east-1b`)
3. **Internet Gateway (IGW)**: Create an IGW and attach it to `cloudvault-vpc`.
4. **NAT Gateway**: Create a NAT Gateway in `Public Subnet 1` and allocate an Elastic IP. This allows servers in private subnets to download updates from the internet securely without exposing them.
5. **Route Tables**:
   - **Public Route Table**: Associate with Public subnets. Add route: `0.0.0.0/0` → `IGW`.
   - **Private Route Table**: Associate with Private subnets. Add route: `0.0.0.0/0` → `NAT Gateway`.

---

## Phase 3: Deploy the Backend (EC2 & Security Groups)

Launch your compute instances inside the secure private network.

1. **Security Groups**:
   - **ALB Security Group**: Inbound: `80`, `443` from `0.0.0.0/0`.
   - **EC2 Security Group**: Inbound: `80` (HTTP) only from the **ALB Security Group**; `22` (SSH) only from your IP.
2. **IAM Instance Profile**: Create an IAM Role for EC2 with `AmazonS3FullAccess` (or custom scoped policy) and attach it to the EC2 instances. This eliminates storing AWS access keys inside the app code.
3. **Launch EC2 Instance**: Launch a `t2.micro` instance running Amazon Linux 2023 inside `Private Subnet 1`.
4. **Setup Docker**: SSH into the instance (via Bastion host or SSM Session Manager) and run:
   ```bash
   sudo yum update -y
   sudo yum install -y docker
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -aG docker ec2-user
   ```

---

## Phase 4: Move Files to Object Storage (Amazon S3)

Move file storage out of the transient EC2 instance onto durable S3.

1. **Create S3 Bucket**: Create a private S3 bucket (e.g., `cloudvault-storage-prod-xxxxx`). Keep Block Public Access turned **ON**.
2. **Update Backend Code for S3**:
   - Install the AWS SDK in the backend: `npm install @aws-sdk/client-s3`.
   - Replace the local upload controller in `backend/server.js` with an S3 upload helper (e.g., `s3Client.send(new PutObjectCommand(...))`).
   - S3 credentials will resolve automatically from the EC2 IAM Instance Profile role.
3. **Redeploy Backend**: Restart the container to ensure uploads write directly to S3.

---

## Phase 5: Move Database to Managed RDS

Migrate data storage to a managed database inside a private subnet.

1. **Create RDS Subnet Group**: Group your database subnets (e.g., `10.0.21.0/24` and `10.0.22.0/24` in `us-east-1a`/`us-east-1b`).
2. **Create Database**: Create an Amazon RDS MySQL (or PostgreSQL) instance.
    - Choose **Free Tier** (`db.t4g.micro` or `db.t3.micro`).
    - Place it in your VPC's private database subnets.
    - Assign the **RDS Security Group** (allowing MySQL port 3306 from the EC2 Security Group only).
3. **Connect and Configure**: Update the EC2 backend configuration variables:
   - `DB_HOST` = RDS endpoint (e.g., `cloudvault-db.xxxx.us-east-1.rds.amazonaws.com`).
   - `DB_USER` = db master user.
   - `DB_PASSWORD` = db password.
   - The backend's `initDB` will auto-run the table migrations upon startup.

---

## Phase 6: Custom Domain, Load Balancer, and HTTPS (Route 53 & ACM)

Implement industry-standard transport layer security.

1. **Domain Name**: Register a domain on Route 53 or import an external domain.
2. **SSL Certificate**: Go to **AWS Certificate Manager (ACM)**, request a public certificate for `cloudvault.com` and `*.cloudvault.com`, and validate via DNS records.
3. **Application Load Balancer (ALB)**: Create an ALB in the public subnets.
   - Target Group: Port `80` (HTTP) pointing to the EC2 instances.
   - HTTP Listener (Port 80): Redirects all requests to HTTPS (Port 443).
   - HTTPS Listener (Port 443): Associates the ACM SSL certificate and forwards requests to the Target Group.
4. **Route 53 Alias**: Add an A Record in Route 53: `cloudvault.com` → Alias to the ALB DNS name.

---

## Phase 7: Setup Auto Scaling Group

Ensure your application can handle load spikes and heal automatically.

1. **Create Launch Template**: Create an EC2 Launch Template using the AMI of your configured EC2 instance.
2. **Create Auto Scaling Group (ASG)**:
   - Associate with private subnets `Private Subnet 1` and `Private Subnet 2`.
   - Link to the ALB Target Group.
   - Set capacities: Minimum: `1`, Desired: `2`, Maximum: `3`.
3. **Auto Scaling Policy**: Configure target tracking scaling (e.g., scale out when average CPU exceeds 70%).

---

## Phase 8: Add CloudFront CDN & Caching (ElastiCache)

Optimize asset loading speed and cached API queries.

1. **CloudFront CDN**: Set up a CloudFront distribution pointing to the ALB. Static pages and previews can be cached at AWS edge locations.
2. **ElastiCache Redis**: Launch an ElastiCache Redis cluster inside the private subnet.
3. **Caching Layer**: Update backend code to store API session tokens, active share metadata, and search queries in Redis to reduce RDS query loads.

---

## Phase 9: Auditing, Monitoring, and Alerts (CloudWatch & SNS)

Create a proactive operations posture.

1. **Log Collection**: Install the CloudWatch agent on EC2 instances to stream application logs to CloudWatch Log Groups.
2. **Metric Alarms**: Create a CloudWatch Alarm:
   - Metric: `CPUUtilization` (on ASG or EC2) > `80%`.
   - Period: 5 minutes.
3. **Alerts via SNS**: Create an SNS Topic (e.g., `cloudvault-alerts`), subscribe your email address, and link the CloudWatch alarm to publish notifications to this topic.

---

## Phase 10: Automate CI/CD Pipeline

Setup deployment automation to remove manual steps.

1. **Create GitHub Webhook Connection**: In AWS Developer Tools, establish a connection to your GitHub repository.
2. **CodeBuild**: Create a `buildspec.yml` in your repo to:
   - Log into Amazon ECR (Elastic Container Registry).
   - Build the frontend and backend Docker images.
   - Push images to ECR.
3. **CodePipeline**: Setup a pipeline that triggers on every commit to `main`:
   - **Source**: GitHub.
   - **Build**: CodeBuild (builds & pushes docker images).
   - **Deploy**: CodeDeploy / ECS / EC2 rolling deployments to update container versions running on the hosts.

---

## Phase 11: Provision Infrastructure as Code (Terraform)

Instead of manual clicking, manage all resources declaratively.

1. **Initialize Terraform**: Enter the `terraform/` directory. Run:
   ```bash
   terraform init
   ```
2. **Plan**: Generate an execution plan to verify the resources that will be provisioned:
   ```bash
   terraform plan -out=tfplan
   ```
3. **Deploy**: Provision VPC, RDS, S3, ALB, ASG, and IAM configurations:
   ```bash
   terraform apply tfplan
   ```
4. **Teardown**: To clean up resources and avoid AWS charges:
   ```bash
   terraform destroy
   ```

---

## Phase 12: Add Serverless Processing (Lambda)

Implement event-driven microservices.

1. **S3 Event Trigger**: Configure your S3 storage bucket to send notifications on `ObjectCreated` events.
2. **AWS Lambda function**: Create a Node.js/Python Lambda function.
3. **Thumbnail Generation / Virus Scan**: The Lambda function intercepts S3 event metadata, downloads the image, resizes it into a thumbnail (e.g., using `sharp` package), and uploads it back to a `thumbnails/` folder on S3.

---

## Phase 13: Hardening Security & Backups

Enforce enterprise-grade security controls.

1. **AWS Secrets Manager**: Store database password, JWT signing keys, and external API keys. Let the application query these secrets dynamically upon boot rather than reading `.env` files.
2. **AWS WAF**: Attach AWS Web Application Firewall to the ALB. Apply rulesets to block SQL Injection, Cross-Site Scripting (XSS), and automated bot scraping.
3. **AWS Backup**: Configure a daily backup plan for the RDS MySQL instance and EC2 volumes, enforcing a 30-day retention policy.
