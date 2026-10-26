import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import periodRoutes from './routes/periods';
import reportRoutes from './routes/reports';
import weeklySummariesRouter from './routes/weekly-summaries';
import dashboardRouter from './routes/dashboard';
import auditLogsRouter from './routes/audit-logs';
import archiveRouter from './routes/archive';
import notificationRouter from './routes/notifications';
import workScheduleRouter from './routes/work-schedules';
import weeklyTaskRouter from './routes/weekly-tasks-registration';
import documentCatalogRouter from './routes/document-catalog';
import {
  closeDatabase,
  connectDatabase,
  getApplicationReadiness,
  onDatabaseConnected,
} from './config/db';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { requestContext } from './middleware/request-context.middleware';
import { seedDefaultAdmin } from './services/auth.service';

const app = express();

app.use(requestContext);
app.use(cors({ origin: env.frontendOrigin }));
app.use('/api/weekly-summaries', express.json({ limit: '2mb' }));
app.use(express.json());

import { ensureCurrentWeekPeriod } from './services/period.service';

onDatabaseConnected(async () => {
  await seedDefaultAdmin();
  await ensureCurrentWeekPeriod();
});
void connectDatabase();

app.get('/api/live', (_req, res) => res.json({ alive: true }));
app.get(['/api/health', '/api/ready'], (_req, res) => {
  const state = getApplicationReadiness();
  res.set('Cache-Control', 'no-store');
  res.status(state.ready ? 200 : 503).json({
    ...state, status: state.ready ? 'ok' : 'not_ready', port: env.port,
  });
});
app.use('/api', (_req, res, next) => {
  const state = getApplicationReadiness();
  if (state.ready) return next();
  res.set('Retry-After', '3').status(503).json({
    error: 'Hệ thống đang kết nối dữ liệu hoặc hoàn tất khởi tạo. Vui lòng chờ.',
    code: 'APPLICATION_NOT_READY', retryable: true,
    requestId: res.locals.requestId, ...state,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/weekly-summaries', weeklySummariesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/admin/logs', auditLogsRouter);
app.use('/api/archive', archiveRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/work-schedules', workScheduleRouter);
app.use('/api/weekly-tasks', weeklyTaskRouter);
app.use('/api/document-catalog', documentCatalogRouter);

app.use(errorHandler);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

const server = app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${env.port} is already in use.`);
    console.error(`Set a different PORT in backend/.env, or stop the process using that port.`);
    process.exit(1);
  }
  throw err;
});

function shutdown() {
  console.log('\nShutting down gracefully...');
  server.close(() => {
    closeDatabase().then(() => {
      process.exit(0);
    });
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
