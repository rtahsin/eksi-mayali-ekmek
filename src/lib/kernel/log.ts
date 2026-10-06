export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  time: string;
  msg: string;
  [key: string]: unknown;
}

function writeLog(level: LogLevel, msg: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    time: new Date().toISOString(),
    msg,
    ...context,
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function logInfo(msg: string, context?: Record<string, unknown>): void {
  writeLog("info", msg, context);
}

export function logWarn(msg: string, context?: Record<string, unknown>): void {
  writeLog("warn", msg, context);
}

export function logError(msg: string, error?: unknown, context?: Record<string, unknown>): void {
  const errContext =
    error instanceof Error
      ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
      : error !== undefined
      ? { rawError: error }
      : {};

  writeLog("error", msg, { ...errContext, ...context });
}

export function logDebug(msg: string, context?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "production") {
    writeLog("debug", msg, context);
  }
}
