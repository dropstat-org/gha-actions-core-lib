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
exports.GithubArtifact = void 0;
const exec = __importStar(require("@actions/exec"));
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
class GithubArtifact {
    artifactName;
    constructor(artifactName) {
        this.artifactName = artifactName;
    }
    async upload(source, _destination) {
        core.info(`Uploading artifact ${this.artifactName} from ${source}`);
        await exec.exec('gh', ['actions', 'upload-artifact', this.artifactName, '--path', source]);
    }
    async move(source, destination) {
        core.info(`Moving artifact from ${source} to ${destination}`);
        await exec.exec('cp', ['-r', source, destination]);
    }
    async checkFile(path) {
        return fs.existsSync(path);
    }
}
exports.GithubArtifact = GithubArtifact;
//# sourceMappingURL=GithubArtifact.js.map