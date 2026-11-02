# Precision Mapping GIS — Internal Enterprise Suite

An integrated, role-based internal enterprise system consisting of two key modules:
- **RMS-Rent** (Rent Management System): Manages rented accommodations, owner KYC, and occupancy tracking across multiple cities.
- **ReMS** (Reimbursement Management System): Handles employee advances and expense reimbursement claims with multi-level approval paths.

---

## Folder Structure

```
precision-mapping-gis/
├── frontend/                   # React + Next.js 15 App Router (Frontend)
├── backend/                    # Node.js + Express.js API (Backend)
├── nginx/                      # Nginx configurations for reverse proxy
├── .github/                    # CI/CD Workflows (GitHub Actions)
├── docker-compose.yml          # Local PostgreSQL services container definition
├── .env.example                # Example global variables configurations
└── README.md                   # Setup guide and instructions
```

---

## Local Development Setup

### Prerequisites
- Node.js (v20 or higher recommended)
- PostgreSQL database (runs on port `5432` by default local service or via Docker)

### 1. Database Setup
Ensure a local PostgreSQL instance is running. If Docker Desktop is installed, you can start the container:
```bash
docker compose up -d
```
Otherwise, use the local PostgreSQL service (configured on port `5432` on this workstation).

### 2. Environment Variables Configuration
- Copy `.env.example` to `.env` in `backend/` directory:
  ```bash
  cp .env.example backend/.env
  ```
- Verify the `DATABASE_URL` in `backend/.env` is correct. E.g., for local PostgreSQL:
  ```env
  DATABASE_URL=postgresql://postgres:root%40mrsac@localhost:5432/pmgis_db
  ```
- Copy `.env.example` to `.env.local` in `frontend/` directory:
  ```bash
  cp frontend/.env.example frontend/.env.local
  ```

### 3. Backend Setup
Navigate to the `backend/` directory, install packages, apply migrations, and start the development server:
```bash
cd backend
npm install
npx prisma db push
npm run dev
```
The API will run on `http://localhost:3001`.

### 4. Frontend Setup
Navigate to the `frontend/` directory, install packages, and start the Next.js development server:
```bash
cd frontend
npm install
npm run dev
```
The user interface will be accessible at `http://localhost:3000`.

---

## Production Deployment Runbook

Follow these steps to deploy to a clean Ubuntu 22.04 LTS instance:

### 1. Provision Server
- Minimum specs: 2 vCPU / 4GB RAM / 20GB SSD
- Security groups: Open ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

### 2. Install Dependencies on Server
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx postgresql nodejs npm git certbot python3-certbot-nginx
sudo npm install -g pm2
```

### 3. Clone Repository & Install Components
```bash
git clone <repo-url> /var/www/pmgis
cd /var/www/pmgis/backend && npm install
cd /var/www/pmgis/frontend && npm install && npm run build
```

### 4. Configure Production Environment
- Set up production `.env` files in both directories.
- Configure `NODE_ENV=production` and plug in active SendGrid/MSG91 keys.
- Set `STORAGE_PROVIDER=s3` along with AWS S3 credentials.

### 5. Setup Production Database
```bash
cd /var/www/pmgis/backend
npx prisma migrate deploy
npx prisma db seed
```

### 6. Process Manager (PM2) Startup
```bash
cd /var/www/pmgis/backend
pm2 start npm --name "pmgis-backend" -- run start
cd /var/www/pmgis/frontend
pm2 start npm --name "pmgis-frontend" -- run start
pm2 save && pm2 startup
```

### 7. Configure Nginx Reverse Proxy
Copy/link the Nginx configuration:
```nginx
server {
  listen 80;
  server_name yourdomain.com;
  location /api/ { proxy_pass http://localhost:3001; }
  location / { proxy_pass http://localhost:3000; }
}
```
Reload Nginx:
```bash
sudo systemctl restart nginx
```

### 8. Enable SSL via Let's Encrypt
```bash
sudo certbot --nginx -d yourdomain.com
```
HR Admin: hradmin@precisionmappinggis.com / Admin@1234
Finance Manager: finance@precisionmappinggis.com / Finance@1234
HOD (Approver): hod@precisionmappinggis.com / Hod@1234
Project Manager: pm1@precisionmappinggis.com / Pm@1234 or pm2@precisionmappinggis.com / Pm@1234
Reporting Manager: manager@precisionmappinggis.com / Manager@1234



if Login Get slow 
RUn this 
cd backend
npx prisma db push
npm run seed



How to Run the Project Now
Open two separate terminals (or split terminal):

Terminal 1 — Backend (API on http://localhost:3001)
powershell
cd backend
npm run dev
(Or from the root folder: npm run dev:backend)

Terminal 2 — Frontend (UI on http://localhost:3000)
powershell
cd frontend
npm run dev
(Or from the root folder: npm run dev:frontend)




Role	Email	Password
HR Admin	hradmin@precisionmappinggis.com	Admin@1234
Finance Manager	finance@precisionmappinggis.com	Finance@1234
HOD (Approver)	hod@precisionmappinggis.com	Hod@1234
Project Manager	pm1@precisionmappinggis.com	Pm@1234
Employee	employee@precisionmappinggis.com	Employee@1234
