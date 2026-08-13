export type Logger = {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
};

export function createLogger(debugEnabled: boolean): Logger {
  return {
    info: (message) => console.log(message),
    warn: (message) => console.warn(message),
    error: (message) => console.error(message),
    debug: (message) => {
      if (debugEnabled) {
        console.error(`[debug] ${message}`);
      }
    }
  };
}
