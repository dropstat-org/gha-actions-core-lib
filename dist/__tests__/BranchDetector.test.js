"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BranchDetector_1 = require("../utils/BranchDetector");
const BranchType_1 = require("../enums/BranchType");
function withEnv(vars, fn) {
    const originals = {};
    for (const [k, v] of Object.entries(vars)) {
        originals[k] = process.env[k];
        process.env[k] = v;
    }
    try {
        fn();
    }
    finally {
        for (const [k, v] of Object.entries(originals)) {
            if (v === undefined)
                delete process.env[k];
            else
                process.env[k] = v;
        }
    }
}
describe('detectBranchType', () => {
    it('returns PULL_REQUEST for pull_request event', () => {
        withEnv({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_REF: 'refs/pull/1/merge' }, () => {
            expect((0, BranchDetector_1.detectBranchType)()).toBe(BranchType_1.BranchType.PULL_REQUEST);
        });
    });
    it('returns MASTER for refs/heads/master', () => {
        withEnv({ GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/master' }, () => {
            expect((0, BranchDetector_1.detectBranchType)()).toBe(BranchType_1.BranchType.MASTER);
        });
    });
    it('returns MASTER for refs/heads/main', () => {
        withEnv({ GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main' }, () => {
            expect((0, BranchDetector_1.detectBranchType)()).toBe(BranchType_1.BranchType.MASTER);
        });
    });
    it('returns DEVELOP for refs/heads/develop', () => {
        withEnv({ GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/develop' }, () => {
            expect((0, BranchDetector_1.detectBranchType)()).toBe(BranchType_1.BranchType.DEVELOP);
        });
    });
    it('returns HOTFIX for hotfix/* branch', () => {
        withEnv({ GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/hotfix/issue-123' }, () => {
            expect((0, BranchDetector_1.detectBranchType)()).toBe(BranchType_1.BranchType.HOTFIX);
        });
    });
    it('returns FEATURE for feature/* branch', () => {
        withEnv({ GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/feature/my-feature' }, () => {
            expect((0, BranchDetector_1.detectBranchType)()).toBe(BranchType_1.BranchType.FEATURE);
        });
    });
    it('returns FEATURE for unknown branch', () => {
        withEnv({ GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/some-random-branch' }, () => {
            expect((0, BranchDetector_1.detectBranchType)()).toBe(BranchType_1.BranchType.FEATURE);
        });
    });
});
//# sourceMappingURL=BranchDetector.test.js.map