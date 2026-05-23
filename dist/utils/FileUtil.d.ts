/** fs wrapper — consistent error handling, auto-mkdir, JSON helpers. */
export declare class FileUtil {
    static exists(filePath: string): boolean;
    static read(filePath: string): string;
    static readBuffer(filePath: string): Buffer;
    static readJson<T>(filePath: string): T;
    /** Writes content, creating parent directories as needed. */
    static write(filePath: string, content: string): void;
    static writeJson(filePath: string, data: unknown): void;
    static append(filePath: string, content: string): void;
    /** Copies src to dest, creating parent directories as needed. */
    static copy(src: string, dest: string): void;
    /** Removes a file or directory (no error if it doesn't exist). */
    static remove(filePath: string): void;
    static ensureDir(dirPath: string): void;
    static chmod(filePath: string, mode: number): void;
    /** Returns file size in bytes, or -1 if the file doesn't exist. */
    static size(filePath: string): number;
}
//# sourceMappingURL=FileUtil.d.ts.map