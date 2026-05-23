import * as core from '@actions/core';

/** Structured logging wrapper around @actions/core. */
export class Logger {
  static info(message: string): void   { core.info(message); }
  static warn(message: string): void   { core.warning(message); }
  static error(message: string): void  { core.error(message); }
  static debug(message: string): void  { core.debug(message); }
  static notice(message: string): void { core.notice(message); }

  /**
   * Opens a collapsible log group and returns a closer function.
   * The closer logs the elapsed time when called.
   *
   * @example
   * const end = Logger.group('install trivy');
   * try { ... } finally { end(); }
   */
  static group(name: string): () => void {
    const start = Date.now();
    core.startGroup(name);
    return () => {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      core.endGroup();
      core.info(`'${name}' completed in ${elapsed}s`);
    };
  }

  /**
   * Runs fn inside a named log group and always closes it.
   *
   * @example
   * await Logger.withGroup('plan', async () => { ... });
   */
  static async withGroup<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const end = this.group(name);
    try {
      return await fn();
    } finally {
      end();
    }
  }

  /**
   * Prints a visible banner — useful at the start of a stage to make
   * it easy to spot in a long log.
   */
  static banner(title: string): void {
    const bar = '─'.repeat(title.length + 4);
    core.info(bar);
    core.info(`  ${title}`);
    core.info(bar);
  }

  /** Mask a value so it never appears in plain text in the logs. */
  static mask(value: string): void {
    core.setSecret(value);
  }
}
