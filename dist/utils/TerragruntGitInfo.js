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
exports.TerragruntGitInfo = void 0;
const exec = __importStar(require("@actions/exec"));
const Logger_1 = require("./Logger");
/**
 * Ports TerragruntUtils.getTerragruntGitInfo + getTerragruntGitInfo + valAccountsByBranch
 * from the Groovy pipeline library.
 *
 * Usage:
 *   const info = await TerragruntGitInfo.get('./envs/dev/my-module');
 *   TerragruntGitInfo.validateBranchMatch(info.gitBranch, 'develop');
 */
class TerragruntGitInfo {
    /**
     * Runs `terragrunt terragrunt-info` inside moduleDir and returns the WorkingDir
     * field (the resolved terraform working directory for that module).
     */
    static async getWorkingDir(moduleDir) {
        let stdout = '';
        await exec.exec('terragrunt', ['terragrunt-info'], {
            cwd: moduleDir,
            silent: true,
            listeners: { stdout: (d) => { stdout += d.toString(); } },
        });
        const parsed = JSON.parse(stdout.trim());
        return parsed.WorkingDir;
    }
    /**
     * Full port of TerragruntUtils.getTerragruntGitInfo.
     * Runs terragrunt-info in moduleDir to get the WorkingDir, then extracts
     * git url, branch and commit hash from that directory.
     *
     * Returns "No disponible" strings for each field if the directory doesn't exist,
     * mirroring the Groovy fallback behavior.
     */
    static async get(moduleDir) {
        let workingDir;
        try {
            workingDir = await this.getWorkingDir(moduleDir);
        }
        catch {
            Logger_1.Logger.warn(`TerragruntGitInfo: could not run terragrunt-info in '${moduleDir}'`);
            return {
                workingDir: 'No disponible',
                gitUrl: 'No disponible',
                gitBranch: 'No disponible',
                gitCommitHash: 'No disponible',
            };
        }
        const git = async (args) => {
            let out = '';
            await exec.exec('git', args, {
                cwd: workingDir,
                silent: true,
                listeners: { stdout: (d) => { out += d.toString(); } },
            });
            return out.trim();
        };
        try {
            const gitUrl = await git(['config', '--get', 'remote.origin.url']);
            let gitBranch = await git(['rev-parse', '--abbrev-ref', 'HEAD']);
            if (gitBranch === 'HEAD') {
                // Detached HEAD — on a tag or specific commit
                gitBranch = await git(['describe', '--tags']);
            }
            const gitCommitHash = await git(['rev-parse', 'HEAD']);
            const info = { workingDir, gitUrl, gitBranch, gitCommitHash };
            Logger_1.Logger.info(`Infra module git info: ${JSON.stringify(info)}`);
            return info;
        }
        catch {
            Logger_1.Logger.warn(`TerragruntGitInfo: could not read git info in '${workingDir}'`);
            return {
                workingDir,
                gitUrl: 'No disponible',
                gitBranch: 'No disponible',
                gitCommitHash: 'No disponible',
            };
        }
    }
    /**
     * Validates that the infra module's branch matches the expected deploy branch.
     * Mirrors the Groovy check:
     *   if ((!branchInfra.contains(branchType) && !Utils.isTagFormatValid(branchInfra)) || branchInfra.contains("/"))
     *
     * Logs a warning on mismatch — never throws (same as Groovy behavior).
     * Returns true when valid, false on mismatch.
     *
     * @param gitBranch   - branch name returned by get()
     * @param deployBranch - expected branch string, e.g. 'develop', 'master', 'release'
     */
    static validateBranchMatch(gitBranch, deployBranch) {
        if (gitBranch === 'No disponible')
            return true; // already warned upstream
        const isTag = /^v?\d+\.\d+\.\d+/.test(gitBranch);
        const hasSlash = gitBranch.includes('/');
        const matches = gitBranch.includes(deployBranch);
        if (hasSlash || (!matches && !isTag)) {
            Logger_1.Logger.warn(`Infra branch mismatch: module is on '${gitBranch}' but expected '${deployBranch}'. ` +
                `Verify the infra module is on the correct branch before deploying.`);
            return false;
        }
        return true;
    }
    /**
     * Runs `terragrunt output-module-groups` and returns the parsed JSON.
     * Result shape: { groupName: [[absolutePath, ...], ...] }
     * Returns {} silently when the command fails (mirrors the Groovy try/catch).
     *
     * @param workingDir - optional directory to run the command in
     */
    static async getModuleGroups(workingDir) {
        let stdout = '';
        const opts = {
            ignoreReturnCode: true,
            silent: true,
            listeners: { stdout: (d) => { stdout += d.toString(); } },
        };
        if (workingDir)
            opts.cwd = workingDir;
        await exec.exec('bash', ['-c', 'terragrunt output-module-groups 2>/dev/null'], opts);
        if (!stdout.trim())
            return {};
        try {
            return JSON.parse(stdout.trim());
        }
        catch {
            Logger_1.Logger.warn('TerragruntGitInfo: could not parse terragrunt output-module-groups JSON');
            return {};
        }
    }
}
exports.TerragruntGitInfo = TerragruntGitInfo;
//# sourceMappingURL=TerragruntGitInfo.js.map