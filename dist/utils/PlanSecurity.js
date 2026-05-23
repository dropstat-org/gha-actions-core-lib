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
exports.PlanSecurity = void 0;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
// Variable names that suggest sensitive data.
// Terraform marks provider-managed secrets as "(sensitive value)" automatically,
// but user-defined variables declared without sensitive=true appear in plain text.
const SENSITIVE_NAME_RE = /password|secret|token|key|credential|private|cert|auth|api_key/i;
/**
 * Security checks for Terraform plan JSON artifacts.
 *
 * Why: plan JSON files are uploaded as GitHub Actions artifacts and are readable
 * by anyone with repository read access. Variables not marked sensitive=true
 * in Terraform will appear as plain text in the plan JSON.
 *
 * Usage: called automatically by PlanStage before uploading the artifact.
 */
class PlanSecurity {
    /**
     * Scans the plan JSON variables section for names that match common secret
     * patterns. Warns when a variable looks sensitive but its value is plain text
     * (i.e., not masked by Terraform's sensitive=true mechanism).
     *
     * Does NOT fail the build — it's a loud reminder, not a gate.
     */
    static warnIfSensitiveVariables(filePath) {
        let plan;
        try {
            plan = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        catch {
            return; // already warned by PlanSummary if unparseable
        }
        const variables = (plan.variables ?? {});
        const exposed = [];
        for (const [name, def] of Object.entries(variables)) {
            const isStringValue = typeof def?.value === 'string' && def.value.length > 0;
            const isSensitiveName = SENSITIVE_NAME_RE.test(name);
            if (isSensitiveName && isStringValue) {
                exposed.push(name);
            }
        }
        if (exposed.length > 0) {
            core.warning(`PlanSecurity [${filePath}]: the following variables have sensitive-looking names ` +
                `but appear as plain text in the plan JSON — mark them with sensitive=true in ` +
                `Terraform so their values are masked before upload: ${exposed.join(', ')}`);
        }
    }
    /**
     * Logs a reminder that plan JSON artifacts are readable by anyone with
     * repository read access. Called once per plan stage run.
     */
    static warnArtifactVisibility() {
        core.info('PlanSecurity: plan JSON artifact (analysis-source) is accessible to all ' +
            'repository collaborators. Retention is set to 1 day to minimize exposure. ' +
            'Ensure all sensitive Terraform variables are declared with sensitive=true.');
    }
}
exports.PlanSecurity = PlanSecurity;
//# sourceMappingURL=PlanSecurity.js.map