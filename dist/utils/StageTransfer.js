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
exports.StageTransfer = exports.PlanGlobs = exports.PlanArtifacts = void 0;
const core = __importStar(require("@actions/core"));
const globModule = __importStar(require("@actions/glob"));
const artifact_1 = require("@actions/artifact");
const client = new artifact_1.DefaultArtifactClient();
/**
 * Artifact names used when passing terraform plan files between stages.
 * Mirrors the Groovy Cache keys: "analysis-source" and "terragrunt-plan".
 */
exports.PlanArtifacts = {
    JSON: 'analysis-source',
    BINARY: 'terragrunt-plan',
};
/**
 * Glob patterns that match the plan file naming convention:
 *   tfplan{index}-{accountName}.json / tfplan{index}-...{hash}.binary
 */
exports.PlanGlobs = {
    JSON: '**/tfplan*-*.json',
    BINARY: '**/tfplan*.binary',
};
/**
 * Equivalent of the Groovy Cache utility — saves and restores files
 * between pipeline stages using GitHub Actions artifacts.
 *
 * Usage in a plan stage:
 *   await StageTransfer.saveByGlob(PlanArtifacts.JSON, PlanGlobs.JSON);
 *
 * Usage in a checkov stage:
 *   await StageTransfer.restoreByName(PlanArtifacts.JSON);
 *   const plans = await StageTransfer.findFiles(PlanGlobs.JSON);
 */
class StageTransfer {
    /**
     * Finds all files matching `pattern` and uploads them as a named artifact.
     * Equivalent to Groovy: Cache.saveByInclude(name, tfplanListForCache)
     */
    static async saveByGlob(name, pattern, retentionDays) {
        const globber = await globModule.create(pattern);
        const files = await globber.glob();
        if (files.length === 0) {
            core.warning(`StageTransfer.saveByGlob '${name}': no files matched '${pattern}'`);
            return;
        }
        core.info(`Saving ${files.length} file(s) as artifact '${name}'`);
        await client.uploadArtifact(name, files, process.cwd(), { retentionDays });
    }
    /**
     * Uploads an explicit list of file paths as a named artifact.
     * Equivalent to Groovy: Cache.saveByInclude(name, paths.join(','))
     */
    static async saveByPaths(name, files, retentionDays) {
        if (files.length === 0) {
            core.warning(`StageTransfer.saveByPaths '${name}': empty file list`);
            return;
        }
        core.info(`Saving ${files.length} file(s) as artifact '${name}'`);
        await client.uploadArtifact(name, files, process.cwd(), { retentionDays });
    }
    /**
     * Downloads a named artifact into the workspace.
     * Equivalent to Groovy: Cache.restoreByName(name)
     */
    static async restoreByName(name, destPath) {
        core.info(`Restoring artifact '${name}'`);
        const { artifact } = await client.getArtifact(name);
        await client.downloadArtifact(artifact.id, {
            path: destPath ?? process.cwd(),
        });
    }
    /**
     * Returns the list of files matching a glob pattern.
     * Equivalent to Groovy: jenkins.findFiles(glob: pattern)
     */
    static async findFiles(pattern) {
        const globber = await globModule.create(pattern);
        return globber.glob();
    }
}
exports.StageTransfer = StageTransfer;
//# sourceMappingURL=StageTransfer.js.map