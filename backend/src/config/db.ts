import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

const INITIAL_RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

type ConnectedHandler = () => void | Promise<void>;

let connectPromise: Promise<boolean> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempt = 0;
let shuttingDown = false;
let listenersRegistered = false;
let connectedHandlersRunning = false;
let initialized = false;
let initializationFailed = false;
let connectionGeneration = 0;
let initializationRetryTimer: NodeJS.Timeout | null = null;
const connectedHandlers = new Set<ConnectedHandler>();

export function getReconnectDelay(attempt: number) {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  return Math.min(INITIAL_RECONNECT_DELAY_MS * (2 ** safeAttempt), MAX_RECONNECT_DELAY_MS);
}

function clearReconnectTimer() {
  if (!reconnectTimer) return;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

async function runConnectedHandlers() {
  if (connectedHandlersRunning || shuttingDown || mongoose.connection.readyState !== 1) return;
  if (initializationRetryTimer) clearTimeout(initializationRetryTimer);
  initializationRetryTimer = null;
  const generation = connectionGeneration;
  connectedHandlersRunning = true;
  initialized = false;
  initializationFailed = false;
  try {
    for (const handler of connectedHandlers) {
      await handler();
    }
    initialized = generation === connectionGeneration && mongoose.connection.readyState === 1 && !shuttingDown;
    if (initialized) logger.info('Application ready: MongoDB connected and initialization complete');
  } catch (error) {
    initializationFailed = true;
    logger.error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    connectedHandlersRunning = false;
    if (!initialized && !shuttingDown && mongoose.connection.readyState === 1 && !initializationRetryTimer) {
      initializationRetryTimer = setTimeout(() => {
        initializationRetryTimer = null;
        void runConnectedHandlers();
      }, 5_000);
      initializationRetryTimer.unref();
    }
  }
}

function scheduleReconnect() {
  if (shuttingDown || reconnectTimer || mongoose.connection.readyState === 1) return;

  const delay = getReconnectDelay(reconnectAttempt);
  reconnectAttempt += 1;
  logger.warn(`MongoDB reconnect scheduled in ${delay}ms (attempt ${reconnectAttempt})`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectDatabase();
  }, delay);
  reconnectTimer.unref();
}

function registerConnectionListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('connected', () => {
    clearReconnectTimer();
    reconnectAttempt = 0;
    logger.info('Connected to MongoDB');
    void runConnectedHandlers();
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('Reconnected to MongoDB');
  });

  mongoose.connection.on('disconnected', () => {
    initialized = false;
    connectionGeneration += 1;
    if (shuttingDown) return;
    logger.warn('MongoDB disconnected');
    scheduleReconnect();
  });

  mongoose.connection.on('error', (error) => {
    logger.error(`MongoDB connection error: ${error.message}`);
  });
}

export function onDatabaseConnected(handler: ConnectedHandler) {
  connectedHandlers.add(handler);
  initialized = false;
  if (mongoose.connection.readyState === 1) void runConnectedHandlers();
  return () => connectedHandlers.delete(handler);
}

export async function connectDatabase() {
  registerConnectionListeners();
  shuttingDown = false;

  if (mongoose.connection.readyState === 1) return true;
  if (connectPromise) return connectPromise;

  if (mongoose.connection.readyState === 2) {
    scheduleReconnect();
    return false;
  }

  connectPromise = mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 5_000,
    heartbeatFrequencyMS: 10_000,
  }).then(() => true).catch((error: unknown) => {
    logger.warn(`MongoDB unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    scheduleReconnect();
    return false;
  }).finally(() => {
    connectPromise = null;
  });

  return connectPromise;
}

export function getDatabaseStatus() {
  switch (mongoose.connection.readyState) {
    case 0: return 'disconnected';
    case 1: return 'connected';
    case 2: return 'connecting';
    case 3: return 'disconnecting';
    default: return 'unknown';
  }
}

export function getApplicationReadiness() {
  const mongodb = getDatabaseStatus();
  const ready = mongodb === 'connected' && initialized && !shuttingDown;
  const phase = shuttingDown ? 'shutting_down' : ready ? 'ready'
    : mongodb !== 'connected' ? 'waiting_for_database'
      : initializationFailed ? 'initialization_failed' : 'initializing';
  return { ready, mongodb, phase };
}

export async function closeDatabase() {
  shuttingDown = true;
  initialized = false;
  connectionGeneration += 1;
  if (initializationRetryTimer) clearTimeout(initializationRetryTimer);
  initializationRetryTimer = null;
  clearReconnectTimer();
  connectedHandlers.clear();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}
