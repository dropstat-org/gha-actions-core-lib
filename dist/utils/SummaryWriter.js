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
exports.SummaryWriter = void 0;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const fs = __importStar(require("fs"));
class SummaryWriter {
    async write(config) {
        const content = await this.resolveContent(config);
        if (!content.trim())
            return;
        const summary = core.summary;
        if (config.title)
            summary.addHeading(config.title, 2);
        summary.addCodeBlock(content, config.format ?? 'text');
        await summary.write();
    }
    async resolveContent(config) {
        if (config.file) {
            if (!fs.existsSync(config.file)) {
                core.warning(`Summary file not found: ${config.file}`);
                return '';
            }
            return fs.readFileSync(config.file, 'utf8');
        }
        if (config.command) {
            let output = '';
            await exec.exec('bash', ['-c', config.command], {
                ignoreReturnCode: true,
                listeners: {
                    stdout: (data) => { output += data.toString(); },
                    stderr: (data) => { output += data.toString(); },
                },
            });
            return output;
        }
        return '';
    }
}
exports.SummaryWriter = SummaryWriter;
//# sourceMappingURL=SummaryWriter.js.map