export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levels: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold: number = levels[(process.env.LOG_LEVEL as LogLevel) ?? 'info'] ?? 20;

function emit(level: LogLevel, msg: string, meta?: unknown) {
  if (levels[level] < threshold) return;
  const line = { ts: new Date().toISOString(), level, msg, ...(meta !== undefined ? { meta } : {}) };
  const out = JSON.stringify(line);
  if (level === 'error') console.error(out);
  else if (level === 'warn') console.warn(out);
  else console.log(out);
}

export const logger = {
  debug: (msg: string, meta?: unknown) => emit('debug', msg, meta),
  info: (msg: string, meta?: unknown) => emit('info', msg, meta),
  warn: (msg: string, meta?: unknown) => emit('warn', msg, meta),
  error: (msg: string, meta?: unknown) => emit('error', msg, meta),
};
