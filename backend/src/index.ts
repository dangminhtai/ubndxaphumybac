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
import documentCatalogRouter from './routes/document-catalog';
import {
  closeDatabase,
  connectDatabase,
  getDatabaseStatus,
  onDatabaseConnected,
} from './config/db';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { requestContext } from './middleware/request-context.middleware';
import { seedDefaultAdmin } from './services/auth.service';

const app = express();

app.use(requestContext);
app.use(cors({ origin: env.frontendOrigin }));
app.use(express.json());

import { ensureCurrentWeekPeriod } from './services/period.service';

onDatabaseConnected(async () => {
  await seedDefaultAdmin();
  await ensureCurrentWeekPeriod();
});
void connectDatabase();

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
app.use('/api/document-catalog', documentCatalogRouter);

app.get('/api/health', (_req, res) => {
  const mongodb = getDatabaseStatus();
  res.json({
    status: mongodb === 'connected' ? 'ok' : 'degraded',
    message: 'API is running',
    mongodb,
    port: env.port,
  });
});

app.get('/api/ready', (_req, res) => {
  const mongodb = getDatabaseStatus();
  res.status(mongodb === 'connected' ? 200 : 503).json({
    ready: mongodb === 'connected',
    mongodb,
  });
});

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
