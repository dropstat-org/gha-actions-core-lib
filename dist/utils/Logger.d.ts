/** Structured logging wrapper around @actions/core. */
export declare class Logger {
    static info(message: string): void;
    static warn(message: string): void;
    static error(message: string): void;
    static debug(message: string): void;
    static notice(message: string): void;
    /**
     * Opens a collapsible log group and returns a closer function.
     * The closer logs the elapsed time when called.
     *
     * @example
     * const end = Logger.group('install trivy');
     * try { ... } finally { end(); }
     */
    static group(name: string): () => void;
    /**
     * Runs fn inside a named log group and always closes it.
     *
     * @example
     * await Logger.withGroup('plan', async () => { ... });
     */
    static withGroup<T>(name: string, fn: () => Promise<T>): Promise<T>;
    /**
     * Prints a visible banner — useful at the start of a stage to make
     * it easy to spot in a long log.
     */
    static banner(title: string): void;
    /** Mask a value so it never appears in plain text in the logs. */
    static mask(value: string): void;
}
//# sourceMappingURL=Logger.d.ts.map