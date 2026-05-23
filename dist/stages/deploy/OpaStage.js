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
exports.OpaStage = void 0;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const AbstractDeployStage_1 = require("./AbstractDeployStage");
const ErrorCode_1 = require("../../enums/ErrorCode");
// OPA / conftest exit code mapping
// 0 = all passed
// 1 = failures found
// 2 = error (parse / internal)
const OPA_RESULT_MAP = {
    0: 'success',
    1: 'failure',
    2: 'failure',
};
// Políticas internas
const POLICY_DIR = 'policy';
const INPUT_FILE = 'input.json';
const SOFT_FAIL = false;
class OpaStage extends AbstractDeployStage_1.AbstractDeployStage {
    async run(stage) {
        const end = this.startGroup(`deploy_opa: ${stage.name}`);
        try {
            const namespace = stage.opa?.namespace;
            const args = ['test', POLICY_DIR, INPUT_FILE];
            if (namespace)
                args.push('--namespace', namespace);
            const exitCode = await exec.exec('conftest', args, { ignoreReturnCode: true });
            const result = OPA_RESULT_MAP[exitCode] ?? 'failure';
            if (result === 'failure') {
                if (SOFT_FAIL) {
                    core.warning(`[${ErrorCode_1.ErrorCode.OPA_POLICY_FAILED}] OPA policy check failed (soft_fail, continuing)`);
                }
                else {
                    core.setFailed(`[${ErrorCode_1.ErrorCode.OPA_POLICY_FAILED}] OPA policy check failed`);
                }
            }
            else {
                core.info('OPA policy check passed');
            }
        }
        finally {
            end();
        }
    }
    async onDefault(stage) {
        await this.run(stage);
    }
}
exports.OpaStage = OpaStage;
//# sourceMappingURL=OpaStage.js.map