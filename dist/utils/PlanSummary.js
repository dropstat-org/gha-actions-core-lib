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
exports.PlanSummary = void 0;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const Logger_1 = require("./Logger");
function resolveAction(actions) {
    if (actions.includes('delete') && actions.includes('create'))
        return 'replace';
    if (actions[0] === 'create')
        return 'create';
    if (actions[0] === 'update')
        return 'update';
    if (actions[0] === 'delete')
        return 'delete';
    return 'no-op';
}
/**
 * Parses the per-account terraform plan JSON produced by PlanStage
 * and emits a human-readable summary of resource changes.
 *
 * Quick usage:
 *   const result = PlanSummary.fromFile('tfplan1-acct-d-01.json');
 *   console.log(PlanSummary.toMarkdown(result));
 *
 * Wired into PlanStage — writes automatically to GitHub Job Summary after every plan run.
 * Also callable from any custom stage:
 *   const files = await StageTransfer.findFiles(PlanGlobs.JSON);
 *   await PlanSummary.writeSummaryForPlans(files);
 */
class PlanSummary {
    /**
     * Parse a single per-account plan JSON file from disk.
     * The file must contain a full terraform plan JSON object (not JSONL).
     * Account name is inferred from the filename: tfplan{n}-{account}.json
     */
    static fromFile(filePath) {
        const base = path.basename(filePath, '.json');
        const account = base.replace(/^tfplan\d+-/, '');
        const raw = fs.readFileSync(filePath, 'utf8');
        return this.fromJson(JSON.parse(raw), account);
    }
    /**
     * Parse from an already-loaded plan JSON object.
     * Reads `resource_changes[].change.actions` to classify each resource.
     */
    static fromJson(planJson, account = 'unknown') {
        const result = {
            account,
            toCreate: [], toUpdate: [], toDelete: [], toReplace: [], noOp: [],
        };
        const changes = (planJson.resource_changes ?? []);
        for (const rc of changes) {
            const action = resolveAction(rc.change?.actions ?? ['no-op']);
            const entry = { address: rc.address, type: rc.type, action };
            switch (action) {
                case 'create':
                    result.toCreate.push(entry);
                    break;
                case 'update':
                    result.toUpdate.push(entry);
                    break;
                case 'delete':
                    result.toDelete.push(entry);
                    break;
                case 'replace':
                    result.toReplace.push(entry);
                    break;
                default:
                    result.noOp.push(entry);
                    break;
            }
        }
        return result;
    }
    /**
     * Renders the summary as markdown for GitHub Job Summary.
     * Includes a count table and per-action resource lists.
     */
    static toMarkdown(r) {
        const lines = [
            `## Terraform Plan: \`${r.account}\``,
            '',
            '| Action    | Count |',
            '|-----------|------:|',
            `| ➕ Create  | ${r.toCreate.length}  |`,
            `| 🔄 Update  | ${r.toUpdate.length}  |`,
            `| 🗑️ Delete  | ${r.toDelete.length}  |`,
            `| ♻️ Replace | ${r.toReplace.length} |`,
            '',
        ];
        if (r.toCreate.length)
            lines.push(...resourceSection('➕ Resources to Create', r.toCreate));
        if (r.toUpdate.length)
            lines.push(...resourceSection('🔄 Resources to Update', r.toUpdate));
        if (r.toDelete.length)
            lines.push(...resourceSection('🗑️ Resources to Delete (destructive)', r.toDelete));
        if (r.toReplace.length)
            lines.push(...resourceSection('♻️ Resources to Replace', r.toReplace));
        return lines.join('\n');
    }
    /**
     * Logs a one-line inline summary to the GitHub Actions log.
     * Useful for quick feedback without writing to the Job Summary.
     *
     * Output: +2 ~1 -0 ±1  (create/update/delete/replace)
     */
    static logInline(r) {
        Logger_1.Logger.info(`Plan '${r.account}': ` +
            `+${r.toCreate.length} create  ` +
            `~${r.toUpdate.length} update  ` +
            `-${r.toDelete.length} delete  ` +
            `±${r.toReplace.length} replace`);
    }
    /**
     * Parses all per-account plan JSON files and writes a combined markdown
     * report to the GitHub Actions Job Summary.
     *
     * Called automatically by PlanStage. Also available for custom stages:
     *   const files = await StageTransfer.findFiles(PlanGlobs.JSON);
     *   await PlanSummary.writeSummaryForPlans(files);
     */
    static async writeSummaryForPlans(planFiles) {
        if (planFiles.length === 0) {
            Logger_1.Logger.warn('PlanSummary: no plan files to summarize');
            return;
        }
        let hasContent = false;
        for (const filePath of planFiles) {
            if (!fs.existsSync(filePath)) {
                Logger_1.Logger.warn(`PlanSummary: file not found: ${filePath}`);
                continue;
            }
            try {
                const result = this.fromFile(filePath);
                this.logInline(result);
                core.summary.addRaw(this.toMarkdown(result) + '\n\n---\n\n');
                hasContent = true;
            }
            catch (err) {
                Logger_1.Logger.warn(`PlanSummary: could not parse ${filePath}: ${err.message}`);
            }
        }
        if (hasContent) {
            await core.summary.write();
        }
    }
}
exports.PlanSummary = PlanSummary;
function resourceSection(title, items) {
    return [
        `### ${title}`,
        '',
        ...items.map(r => `- \`${r.address}\` *(${r.type})*`),
        '',
    ];
}
//# sourceMappingURL=PlanSummary.js.map