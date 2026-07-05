import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import periodRoutes from './routes/periods';
import reportRoutes from './routes/reports';
import monthlySummariesRouter from './routes/monthly-summaries';
import dashboardRouter from './routes/dashboard';
import auditLogsRouter from './routes/audit-logs';
import archiveRouter from './routes/archive';
import notificationRouter from './routes/notifications';
import { closeDatabase, connectDatabase, getDatabaseStatus } from './config/db';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { seedDefaultAdmin } from './services/auth.service';

const app = express();

app.use(cors({ origin: env.frontendOrigin }));
app.use(express.json());

import { ensureCurrentWeekPeriod } from './services/period.service';

void connectDatabase().then(async (connected) => {
  if (connected) {
    await seedDefaultAdmin();
    await ensureCurrentWeekPeriod();
  }
  return undefined;
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/monthly-summaries', monthlySummariesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/admin/logs', auditLogsRouter);
app.use('/api/archive', archiveRouter);
app.use('/api/notifications', notificationRouter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'API is running',
    mongodb: getDatabaseStatus(),
    port: env.port,
  });
});

app.use(errorHandler);

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
