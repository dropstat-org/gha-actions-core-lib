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
exports.uploadSarif = uploadSarif;
const zlib = __importStar(require("zlib"));
const github_1 = require("@actions/github");
const Credentials_1 = require("./Credentials");
const Env_1 = require("./Env");
const FileUtil_1 = require("./FileUtil");
const Logger_1 = require("./Logger");
async function uploadSarif(sarifFile) {
    if (!FileUtil_1.FileUtil.exists(sarifFile)) {
        Logger_1.Logger.warn(`SARIF file not found: ${sarifFile} — skipping upload`);
        return;
    }
    const token = Credentials_1.Credentials.ghToken();
    if (!token) {
        Logger_1.Logger.warn('SARIF upload skipped — GH_TOKEN not set or GitHub Advanced Security not enabled');
        return;
    }
    const { owner, name: repo } = Env_1.Env.repositoryParts();
    const commitSha = Env_1.Env.sha();
    const ref = Env_1.Env.ref();
    try {
        const sarif = zlib.gzipSync(FileUtil_1.FileUtil.readBuffer(sarifFile)).toString('base64');
        const octokit = (0, github_1.getOctokit)(token);
        await octokit.request('POST /repos/{owner}/{repo}/code-scanning/sarifs', {
            owner,
            repo,
            commit_sha: commitSha,
            ref,
            sarif,
        });
        Logger_1.Logger.info(`Security report: ${Env_1.Env.serverUrl()}/${owner}/${repo}/security/code-scanning`);
    }
    catch (err) {
        Logger_1.Logger.warn(`SARIF upload skipped — requires GitHub Advanced Security on private repos (${err.message})`);
    }
}
//# sourceMappingURL=SarifUploader.js.map