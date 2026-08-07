# CloudVault - Secure Cloud Document Management Platform

CloudVault is a secure cloud document management platform designed as a production-grade portfolio project. It demonstrates local Docker orchestration, secure user isolation, administrative audits, public document sharing, and a robust roadmap for multi-AZ AWS cloud deployments.

---

## Technical Stack & Features

- **Frontend**: React + Vite, Tailwind CSS (Dark Glassmorphic UI), Lucide Icons, Axios.
- **Backend**: Node.js, Express, JWT Authentication, Multer file upload handler.
- **Database**: Dual Support (MySQL for Docker/Production; SQLite `cloudvault.db` for instant local fallback).
- **Containerization & Reverse Proxy**: Docker, Docker Compose, Nginx.
- **Infrastructure**: Terraform (VPC, ALB, ASG, RDS, S3, IAM Roles).

### Key Features
1. **User Authentication**: Register/Login system. The first user to register automatically becomes an **Administrator**.
2. **Dashboard**: Storage indicators, total upload stats, download trackers, and chronological audit logs.
3. **File Explorer**: Upload files, download files, live search, sort by file attributes, and preview images, text files, PDFs, videos, and audios.
4. **Secure Share Center**: Create public access tokens with optional download limits, password encryption, and expiration timers. Revoke active links at any time.
5. **Security Audits**: Continuous recording of all login attempts, file uploads, file deletions, and access downloads.
6. **Admin Panel**: Dashboard metrics across all users, user account audit directory (with deletion capabilities), and system storage database control.

---

## Folder Structure

```
CloudVault/
├── backend/            # Express Node.js Server & database layer
│   ├── uploads/        # Local upload cache directory
│   ├── db.js           # SQLite / MySQL client initializer
│   ├── server.js       # Main server routes & middleware
│   └── Dockerfile      # Backend image setup
├── frontend/           # React SPA
│   ├── src/
│   │   ├── components/ # Reusable React UI elements
│   │   ├── api.js      # Interceptor-equipped Axios client
│   │   ├── App.jsx     # Main interface & routing controller
│   │   └── main.jsx    # Virtual DOM mount
│   ├── index.html      # SEO metadata & document root
│   ├── tailwind.config.js
│   └── Dockerfile      # Multi-stage build image setup
├── nginx/              # Nginx configurations
│   └── nginx.conf      # Local routing proxy config
├── terraform/          # IaC configurations
│   └── main.tf         # AWS resources manifest
├── docs/               # Architecture guides
│   └── deployment.md   # Step-by-step 13-phase AWS manual
├── docker-compose.yml  # Orchestrator config
└── README.md
```

---

## Running Locally

You can run CloudVault in two ways:

### Option A: Zero-Setup Local Dev (SQLite Fallback)
No database configurations or Docker engines required.

1. **Start Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   *The server starts on port 5000 and automatically creates a local SQLite database (`cloudvault.db`).*

2. **Start Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
   *The frontend starts on port 5173. Open `http://localhost:5173` in your browser.*

---

### Option B: Local Docker Stack (Clones AWS Production)
Runs the entire stack in isolated Docker containers with Nginx proxy and MySQL DB.

1. **Start Containers**: In the root directory, execute:
   ```bash
   docker-compose up --build
   ```
2. **Access App**: Open `http://localhost` in your browser. Nginx intercepts traffic:
   - Port 80 `/` routes to Frontend static assets.
   - Port 80 `/api` proxies to Node.js Backend.
   - Database writes to containerized MySQL (port 3306) with volume persistence.

---

## Cloud Deployment

For deploying this codebase on AWS (VPC, RDS, S3, ALB, ASG, ACM, Route 53, Secrets Manager, CI/CD pipelines, and Terraform), follow the step-by-step instructions in the [docs/deployment.md](file:///c:/Users/BILL/Downloads/CloudVault/docs/deployment.md) guide.
