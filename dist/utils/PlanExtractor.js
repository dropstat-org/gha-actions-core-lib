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
exports.PlanExtractor = void 0;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Ports the plan-extraction logic from Groovy PreDeployStage.
 *
 * Covers three command shapes:
 *   terragrunt plan
 *   terragrunt run-all plan
 *   terragrunt plan --terragrunt-working-dir <dir>
 *   terragrunt run-all plan --terragrunt-working-dir <dir>
 */
class PlanExtractor {
    projectId;
    serviceId;
    versionTag;
    constructor(metadata) {
        this.projectId = metadata.projectId;
        this.serviceId = metadata.serviceId;
        this.versionTag = metadata.commitHash
            ? `${metadata.version}-${metadata.commitHash}`
            : metadata.version;
    }
    // ── Command detection ─────────────────────────────────────────────────────
    /** True when the command should produce a plan file (contains the word "plan"). */
    static isPlanCommand(cmd) {
        return cmd.trim().split(/\s+/).includes('plan');
    }
    /**
     * Extracts the flags that change how terragrunt plan is invoked.
     * Mirrors: Utils.isSpecified("run-all") / Utils.getParm("--terragrunt-working-dir")
     */
    static parseFlags(cmd) {
        const args = cmd.trim().split(/\s+/);
        const runAll = args.includes('run-all');
        const wdIdx = args.indexOf('--terragrunt-working-dir');
        const workingDir = wdIdx !== -1 ? (args[wdIdx + 1] ?? null) : null;
        return { runAll, workingDir };
    }
    // ── File naming ───────────────────────────────────────────────────────────
    /**
     * Raw binary name produced by `plan --out`.
     * e.g. tfplan1-myproject-myservice-1.0.0-abc1234.binary
     */
    rawBinaryName(cmdIndex) {
        return `tfplan${cmdIndex}-${this.projectId}-${this.serviceId}-${this.versionTag}.binary`;
    }
    /**
     * Raw JSONL name produced by `show -json` (one JSON object per line = one module).
     * e.g. tfplan1-myproject-myservice-1.0.0-abc1234.json
     */
    rawJsonName(cmdIndex) {
        return `tfplan${cmdIndex}-${this.projectId}-${this.serviceId}-${this.versionTag}.json`;
    }
    /**
     * Per-account file name written after parsing the JSONL.
     * e.g. tfplan1-my-account.json
     */
    static perAccountName(cmdIndex, accountName) {
        return `tfplan${cmdIndex}-${accountName}.json`;
    }
    // ── Command builders ──────────────────────────────────────────────────────
    /**
     * Returns the two shell commands that replace the original plan invocation:
     *   1. original plan command  + --out <binary>
     *   2. terragrunt [run-all] show -json <binary> [--terragrunt-working-dir <dir>]  > <json>
     *
     * Mirrors lines 54-55 in PreDeployStage.groovy.
     */
    buildRunCommands(cmd, cmdIndex) {
        const { runAll, workingDir } = PlanExtractor.parseFlags(cmd);
        const binary = this.rawBinaryName(cmdIndex);
        const json = this.rawJsonName(cmdIndex);
        const ra = runAll ? 'run-all ' : '';
        const wd = workingDir ? ` --terragrunt-working-dir ${workingDir}` : '';
        // Strip any user-supplied -out / --out so we control the output filename.
        // Handles both forms: --out=file  and  --out file
        const cleanCmd = cmd.replace(/\s+-{1,2}out(?:=\S+|\s+\S+)/g, '').trimEnd();
        const planCmd = `${cleanCmd} --out ${binary}`;
        const showCmd = `terragrunt ${ra}show -json ${binary}${wd} > ${json}`;
        return [planCmd, showCmd];
    }
    /**
     * Command to collect module groups used for multi-module account resolution.
     * Mirrors line 59 in PreDeployStage.groovy.
     */
    buildModuleGroupsCommand(cmd) {
        const { workingDir } = PlanExtractor.parseFlags(cmd);
        const wd = workingDir ? ` --terragrunt-working-dir ${workingDir}` : '';
        return `terragrunt output-module-groups${wd} 2>/dev/null`;
    }
    // ── Plan parsing ──────────────────────────────────────────────────────────
    /**
     * Reads the raw JSONL plan file and writes one per-account JSON for each line.
     * Returns the list of file paths created.
     *
     * Account name resolution order (mirrors TerragruntUtils.getVarEnvIdFromPlan):
     *   1. planJson.variables.env_id.value
     *   2. fallbackAccount
     */
    extractPerAccountPlans(cmdIndex, fallbackAccount) {
        const rawFile = this.rawJsonName(cmdIndex);
        if (!fs.existsSync(rawFile)) {
            core.warning(`PlanExtractor: raw plan file not found: ${rawFile}`);
            return [];
        }
        const lines = fs
            .readFileSync(rawFile, 'utf8')
            .split('\n')
            .filter(l => l.trim().length > 0);
        const created = [];
        for (const line of lines) {
            let planJson;
            try {
                planJson = JSON.parse(line);
            }
            catch {
                core.warning(`PlanExtractor: skipping non-JSON line in ${rawFile}`);
                continue;
            }
            const accountName = PlanExtractor.resolveAccountName(planJson, fallbackAccount);
            const filePath = PlanExtractor.perAccountName(cmdIndex, accountName);
            fs.writeFileSync(filePath, JSON.stringify(planJson, null, 2), 'utf8');
            core.info(`Extracted plan → ${filePath}  (account: ${accountName})`);
            created.push({ cmdIndex, accountName, filePath });
        }
        return created;
    }
    /**
     * Reads env_id from plan variables, falls back to the provided string.
     * Mirrors: planJson?.variables?.env_id?.value ?: backAccount
     */
    static resolveAccountName(planJson, fallback) {
        const vars = planJson?.variables;
        const envId = vars?.env_id?.value;
        return typeof envId === 'string' && envId.length > 0 ? envId : fallback;
    }
    // ── File filtering ────────────────────────────────────────────────────────
    /**
     * From a flat list of tfplan*.json paths, removes the raw JSONL parent files
     * that follow the naming convention tfplan{n}-{projectId}-{serviceId}-*.json.
     *
     * The Groovy version uses a TODO comment to delete these; here we exclude them
     * explicitly so checkov only receives single-object plan files.
     */
    filterPerAccountPlans(files) {
        const escapedProject = escapeRegex(this.projectId);
        const escapedService = escapeRegex(this.serviceId);
        const parentRe = new RegExp(`^tfplan\\d+-${escapedProject}-${escapedService}-`);
        return files.filter(f => !parentRe.test(path.basename(f)));
    }
}
exports.PlanExtractor = PlanExtractor;
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=PlanExtractor.js.map