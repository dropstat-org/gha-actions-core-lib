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
exports.ArtifactHandler = void 0;
const core = __importStar(require("@actions/core"));
const globModule = __importStar(require("@actions/glob"));
const artifact_1 = require("@actions/artifact");
const path = __importStar(require("path"));
const client = new artifact_1.DefaultArtifactClient();
class ArtifactHandler {
    async upload(uploads) {
        for (const upload of uploads) {
            const globber = await globModule.create(upload.path);
            const files = await globber.glob();
            if (files.length === 0) {
                core.warning(`artifact upload '${upload.name}': no files matched '${upload.path}'`);
                continue;
            }
            // Raíz común para que los paths dentro del artifact sean relativos
            const rootDir = files.length === 1 && !upload.path.includes('*')
                ? path.dirname(files[0])
                : process.cwd();
            core.info(`Uploading artifact '${upload.name}' (${files.length} file(s))`);
            await client.uploadArtifact(upload.name, files, rootDir, {
                retentionDays: upload.retentionDays,
            });
        }
    }
    async download(downloads) {
        for (const dl of downloads) {
            core.info(`Downloading artifact '${dl.name}'`);
            const { artifact } = await client.getArtifact(dl.name);
            await client.downloadArtifact(artifact.id, {
                path: dl.path ?? process.cwd(),
            });
        }
    }
}
exports.ArtifactHandler = ArtifactHandler;
//# sourceMappingURL=ArtifactHandler.js.map