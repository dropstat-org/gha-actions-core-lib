"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUtil = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/** fs wrapper — consistent error handling, auto-mkdir, JSON helpers. */
class FileUtil {
    static exists(filePath) {
        return fs.existsSync(filePath);
    }
    static read(filePath) {
        return fs.readFileSync(filePath, 'utf8');
    }
    static readBuffer(filePath) {
        return fs.readFileSync(filePath);
    }
    static readJson(filePath) {
        return JSON.parse(this.read(filePath));
    }
    /** Writes content, creating parent directories as needed. */
    static write(filePath, content) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content, 'utf8');
    }
    static writeJson(filePath, data) {
        this.write(filePath, JSON.stringify(data, null, 2));
    }
    static append(filePath, content) {
        fs.appendFileSync(filePath, content, 'utf8');
    }
    /** Copies src to dest, creating parent directories as needed. */
    static copy(src, dest) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
    }
    /** Removes a file or directory (no error if it doesn't exist). */
    static remove(filePath) {
        if (fs.existsSync(filePath))
            fs.rmSync(filePath, { recursive: true, force: true });
    }
    static ensureDir(dirPath) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    static chmod(filePath, mode) {
        fs.chmodSync(filePath, mode);
    }
    /** Returns file size in bytes, or -1 if the file doesn't exist. */
    static size(filePath) {
        if (!fs.existsSync(filePath))
            return -1;
        return fs.statSync(filePath).size;
    }
}
exports.FileUtil = FileUtil;
//# sourceMappingURL=FileUtil.js.map