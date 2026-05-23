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
exports.StageMessage = exports.StageOutputKey = void 0;
const core = __importStar(require("@actions/core"));
/**
 * Well-known output keys produced by ActionsCoreLib stages.
 * Use these constants when emitting or consuming stage outputs to avoid
 * string typos and make inter-stage contracts explicit.
 */
var StageOutputKey;
(function (StageOutputKey) {
    // plan stage
    StageOutputKey["PLAN_FILE"] = "plan_file";
    StageOutputKey["PLAN_SUMMARY"] = "plan_summary";
    // publish stage
    StageOutputKey["IMAGE_TAG"] = "image_tag";
    StageOutputKey["IMAGE_VERSION"] = "image_version";
    StageOutputKey["IMAGE_REF"] = "image_ref";
    StageOutputKey["ARTIFACT_URL"] = "artifact_url";
    // release stage
    StageOutputKey["VERSION"] = "version";
    StageOutputKey["TAG"] = "tag";
    // deploy stage
    StageOutputKey["DEPLOY_ENV"] = "deploy_env";
    StageOutputKey["DEPLOY_URL"] = "deploy_url";
    // scan stages (checkov, trivy, semgrep)
    StageOutputKey["SCAN_PASSED"] = "scan_passed";
    StageOutputKey["SCAN_FINDINGS"] = "scan_findings";
})(StageOutputKey || (exports.StageOutputKey = StageOutputKey = {}));
/**
 * Typed inter-stage communication.
 *
 * emit()       → core.setOutput  (readable in same job via steps.id.outputs.key)
 * exportEnv()  → core.exportVariable  (readable by all subsequent steps in the job)
 * read()       → process.env lookup  (values injected by the workflow from prior outputs)
 */
class StageMessage {
    /**
     * Emits a named output for this step.
     * In the workflow YAML, reference it as: ${{ steps.<id>.outputs.<key> }}
     */
    static emit(key, value) {
        core.setOutput(key, value);
        core.debug(`[output] ${key}=${value}`);
    }
    /**
     * Exports a value as an environment variable visible to all subsequent
     * steps in the same job — no YAML wiring needed.
     */
    static exportEnv(name, value) {
        core.exportVariable(name, value);
        core.debug(`[env-export] ${name}=${value}`);
    }
    /**
     * Reads a value that was injected into this step's environment by the
     * workflow (typically from a previous job's output).
     */
    static read(envVarName, fallback = '') {
        return process.env[envVarName] ?? fallback;
    }
    /**
     * Reads a required env value — throws a clear error if absent,
     * making the missing wiring easy to diagnose.
     */
    static require(envVarName) {
        const value = process.env[envVarName] ?? '';
        if (!value) {
            throw new Error(`Stage input '${envVarName}' is not set. ` +
                `Check that the workflow passes this value via the step's env block.`);
        }
        return value;
    }
}
exports.StageMessage = StageMessage;
//# sourceMappingURL=StageMessage.js.map