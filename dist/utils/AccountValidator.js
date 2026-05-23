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
exports.validateDeployForBranch = validateDeployForBranch;
const core = __importStar(require("@actions/core"));
const BranchType_1 = require("../enums/BranchType");
const Environment_1 = require("../enums/Environment");
const ActionYaml_1 = require("../entities/ActionYaml");
const ErrorCode_1 = require("../enums/ErrorCode");
// Allowed deploy environments per branch type.
// RELEASE accepts both QA and STAGING to support different naming conventions.
const BRANCH_ALLOWED_ENVS = {
    [BranchType_1.BranchType.DEVELOP]: [Environment_1.Environment.DEV],
    [BranchType_1.BranchType.RELEASE]: [Environment_1.Environment.QA, Environment_1.Environment.STAGING],
    [BranchType_1.BranchType.MASTER]: [Environment_1.Environment.PROD],
};
function validateDeployForBranch(deployEnv, branchType, accounts) {
    const allowed = BRANCH_ALLOWED_ENVS[branchType];
    if (!allowed)
        return; // feature / PR / hotfix — no env restriction on plan-only branches
    if (!allowed.includes(deployEnv)) {
        throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.ACCOUNT_BRANCH_MISMATCH, `Branch '${branchType}' can only target [${allowed.join(', ')}] ` +
            `but stage declares environment '${deployEnv}'. ` +
            `Deploying to the wrong environment from this branch is not allowed.`);
    }
    if (accounts && accounts.length > 0) {
        core.info(`Account validation passed — target accounts for '${deployEnv}': ${accounts.join(', ')}`);
    }
}
//# sourceMappingURL=AccountValidator.js.map