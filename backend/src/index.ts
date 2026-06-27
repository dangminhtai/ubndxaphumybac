import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import reportRoutes from './routes/reports';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5001', 10);

app.use(cors());
app.use(express.json());

// Connect to MongoDB — non-blocking, server starts regardless
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/report_system';
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err: unknown) => {
    console.warn('⚠️  MongoDB not available — API will return errors for DB operations.');
    console.warn('   Start MongoDB and restart the server, or set MONGODB_URI in .env');
    if (err instanceof Error) {
      console.warn('   Error:', err.message);
    }
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (_req: express.Request, res: express.Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', message: 'API is running', mongodb: mongoStatus });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start server with EADDRINUSE handling
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error(`   Run: taskkill /F /PID $(netstat -ano | findstr :${PORT})`);
    console.error(`   Or set a different PORT in .env`);
    process.exit(1);
  }
  throw err;
});

// Graceful shutdown — release port on SIGINT/SIGTERM
function shutdown() {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close().then(() => {
      process.exit(0);
    });
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
