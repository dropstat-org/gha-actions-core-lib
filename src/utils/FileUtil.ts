import * as fs from 'fs';
import * as path from 'path';

/** fs wrapper — consistent error handling, auto-mkdir, JSON helpers. */
export class FileUtil {
  static exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  static read(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8');
  }

  static readBuffer(filePath: string): Buffer {
    return fs.readFileSync(filePath);
  }

  static readJson<T>(filePath: string): T {
    return JSON.parse(this.read(filePath)) as T;
  }

  /** Writes content, creating parent directories as needed. */
  static write(filePath: string, content: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }

  static writeJson(filePath: string, data: unknown): void {
    this.write(filePath, JSON.stringify(data, null, 2));
  }

  static append(filePath: string, content: string): void {
    fs.appendFileSync(filePath, content, 'utf8');
  }

  /** Copies src to dest, creating parent directories as needed. */
  static copy(src: string, dest: string): void {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }

  /** Removes a file or directory (no error if it doesn't exist). */
  static remove(filePath: string): void {
    if (fs.existsSync(filePath)) fs.rmSync(filePath, { recursive: true, force: true });
  }

  static ensureDir(dirPath: string): void {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  static chmod(filePath: string, mode: number): void {
    fs.chmodSync(filePath, mode);
  }

  /** Returns file size in bytes, or -1 if the file doesn't exist. */
  static size(filePath: string): number {
    if (!fs.existsSync(filePath)) return -1;
    return fs.statSync(filePath).size;
  }
}
