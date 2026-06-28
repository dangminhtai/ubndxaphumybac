import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import reportRoutes from './routes/reports';
import { closeDatabase, connectDatabase, getDatabaseStatus } from './config/db';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());

void connectDatabase();

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

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
