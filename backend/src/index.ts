import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PORT, FRONTEND_URL } from './utils/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import roomRoutes from './modules/rooms/rooms.routes';
import rentPaymentRoutes from './modules/rentPayments/rentPayments.routes';
import roomClosureRoutes from './modules/roomClosure/roomClosure.routes';
import reportRoutes from './modules/reports/reports.routes';
import { unpaidAlert } from './modules/reports/rentReports.controller';
import advanceRequestRoutes from './modules/advanceRequests/advanceRequests.routes';
import reimbursementRoutes from './modules/reimbursements/reimbursements.routes';
import uploadRoutes from './modules/upload/upload.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import auditLogsRoutes from './modules/auditLogs/auditLogs.routes';
import taskRoutes from './modules/tasks/tasks.routes';
import { authenticate } from './middleware/authenticate';
import { initCronJobs } from './jobs/cron';
import path from 'path';

dotenv.config();

const app = express();

initCronJobs();

app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use(cors({
  origin: (origin, callback) => {
    // If no origin (e.g. mobile apps, curl, or server-to-server requests), allow it
    if (!origin) {
      return callback(null, true);
    }
    
    // In development mode, allow any origin (e.g. network IPs like 80.0.x.x, local hostnames)
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Default to matching the configured frontend URL
    if (origin === FRONTEND_URL) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', message: 'Precision Mapping GIS API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);

// Nested routes for payments and closure under rooms
app.use('/api/rooms/:id/payments', rentPaymentRoutes);
app.use('/api/rooms/:id/closure', roomClosureRoutes);

// Unpaid alert
app.get('/api/rooms/unpaid-alert', authenticate, unpaidAlert);

// Reports
app.use('/api/reports', reportRoutes);

// ReMS
app.use('/api/advance-requests', advanceRequestRoutes);
app.use('/api/reimbursements', reimbursementRoutes);

// Uploads
app.use('/api/upload', uploadRoutes);

// Notifications
app.use('/api/notifications', notificationRoutes);

// Audit Logs
app.use('/api/audit-logs', auditLogsRoutes);

// Tasks
app.use('/api/tasks', taskRoutes);

// Global error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
