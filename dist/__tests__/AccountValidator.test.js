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
const core = __importStar(require("@actions/core"));
const AccountValidator_1 = require("../utils/AccountValidator");
const BranchType_1 = require("../enums/BranchType");
const Environment_1 = require("../enums/Environment");
const ErrorCode_1 = require("../enums/ErrorCode");
jest.mock('@actions/core', () => ({ info: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
describe('validateDeployForBranch — valid combinations', () => {
    it('develop → dev passes', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.DEV, BranchType_1.BranchType.DEVELOP)).not.toThrow();
    });
    it('release → qa passes', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.QA, BranchType_1.BranchType.RELEASE)).not.toThrow();
    });
    it('release → staging passes', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.STAGING, BranchType_1.BranchType.RELEASE)).not.toThrow();
    });
    it('master → prod passes', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.PROD, BranchType_1.BranchType.MASTER)).not.toThrow();
    });
    it('feature branch has no restriction — any env passes', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.PROD, BranchType_1.BranchType.FEATURE)).not.toThrow();
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.DEV, BranchType_1.BranchType.FEATURE)).not.toThrow();
    });
    it('pull_request has no restriction — any env passes', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.PROD, BranchType_1.BranchType.PULL_REQUEST)).not.toThrow();
    });
    it('hotfix has no restriction — any env passes', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.PROD, BranchType_1.BranchType.HOTFIX)).not.toThrow();
    });
    it('hotfix_emergency has no restriction — any env passes', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.PROD, BranchType_1.BranchType.HOTFIX_EMERGENCY)).not.toThrow();
    });
});
describe('validateDeployForBranch — invalid combinations', () => {
    it('develop → prod throws ACCOUNT_BRANCH_MISMATCH', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.PROD, BranchType_1.BranchType.DEVELOP))
            .toThrow(ErrorCode_1.ErrorCode.ACCOUNT_BRANCH_MISMATCH);
    });
    it('develop → staging throws ACCOUNT_BRANCH_MISMATCH', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.STAGING, BranchType_1.BranchType.DEVELOP))
            .toThrow(ErrorCode_1.ErrorCode.ACCOUNT_BRANCH_MISMATCH);
    });
    it('develop → qa throws ACCOUNT_BRANCH_MISMATCH', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.QA, BranchType_1.BranchType.DEVELOP))
            .toThrow(ErrorCode_1.ErrorCode.ACCOUNT_BRANCH_MISMATCH);
    });
    it('master → dev throws ACCOUNT_BRANCH_MISMATCH', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.DEV, BranchType_1.BranchType.MASTER))
            .toThrow(ErrorCode_1.ErrorCode.ACCOUNT_BRANCH_MISMATCH);
    });
    it('master → staging throws ACCOUNT_BRANCH_MISMATCH', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.STAGING, BranchType_1.BranchType.MASTER))
            .toThrow(ErrorCode_1.ErrorCode.ACCOUNT_BRANCH_MISMATCH);
    });
    it('master → qa throws ACCOUNT_BRANCH_MISMATCH', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.QA, BranchType_1.BranchType.MASTER))
            .toThrow(ErrorCode_1.ErrorCode.ACCOUNT_BRANCH_MISMATCH);
    });
    it('release → prod throws ACCOUNT_BRANCH_MISMATCH', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.PROD, BranchType_1.BranchType.RELEASE))
            .toThrow(ErrorCode_1.ErrorCode.ACCOUNT_BRANCH_MISMATCH);
    });
    it('release → dev throws ACCOUNT_BRANCH_MISMATCH', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.DEV, BranchType_1.BranchType.RELEASE))
            .toThrow(ErrorCode_1.ErrorCode.ACCOUNT_BRANCH_MISMATCH);
    });
    it('error message includes branch and environment names', () => {
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.PROD, BranchType_1.BranchType.DEVELOP))
            .toThrow(/develop/);
        expect(() => (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.PROD, BranchType_1.BranchType.DEVELOP))
            .toThrow(/prod/);
    });
});
describe('validateDeployForBranch — accounts logging', () => {
    it('logs account IDs when validation passes and accounts provided', () => {
        (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.DEV, BranchType_1.BranchType.DEVELOP, ['123456789012', '987654321098']);
        expect(core.info).toHaveBeenCalledWith(expect.stringContaining('123456789012'));
    });
    it('does not log when no accounts provided', () => {
        (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.DEV, BranchType_1.BranchType.DEVELOP);
        expect(core.info).not.toHaveBeenCalled();
    });
    it('does not log for unrestricted branch types even with accounts', () => {
        (0, AccountValidator_1.validateDeployForBranch)(Environment_1.Environment.PROD, BranchType_1.BranchType.FEATURE, ['123456789012']);
        expect(core.info).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=AccountValidator.test.js.map