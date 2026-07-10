/**
 * Lightweight logger matching the pattern used across the gh-tools family.
 * Debug output is gated behind a flag so production runs stay quiet.
 */

export type Logger = {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
};

export function createLogger(debugEnabled = false): Logger {
  return {
    info(message) {
      console.log(message);
    },
    warn(message) {
      console.warn(message);
    },
    error(message) {
      console.error(message);
    },
    debug(message) {
      if (debugEnabled) {
        console.error(`[debug] ${message}`);
      }
    },
  };
}
