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
exports.AbstractBranchStage = void 0;
const core = __importStar(require("@actions/core"));
const AbstractStage_1 = require("./AbstractStage");
const BranchType_1 = require("../../enums/BranchType");
const Environment_1 = require("../../enums/Environment");
class AbstractBranchStage extends AbstractStage_1.AbstractStage {
    branchType;
    environment;
    constructor(config, branchType) {
        super(config);
        this.branchType = branchType;
        this.environment = this.resolveEnvironment(branchType);
    }
    resolveEnvironment(branch) {
        switch (branch) {
            case BranchType_1.BranchType.MASTER: return Environment_1.Environment.PROD;
            case BranchType_1.BranchType.DEVELOP: return Environment_1.Environment.DEV;
            case BranchType_1.BranchType.RELEASE: return Environment_1.Environment.QA;
            case BranchType_1.BranchType.PULL_REQUEST: return Environment_1.Environment.QA;
            default: return Environment_1.Environment.DEV;
        }
    }
    async run(stage) {
        const end = this.startGroup(stage.name);
        try {
            switch (this.branchType) {
                case BranchType_1.BranchType.MASTER:
                    await this.onMaster(stage);
                    break;
                case BranchType_1.BranchType.DEVELOP:
                    await this.onDevelop(stage);
                    break;
                case BranchType_1.BranchType.RELEASE:
                    await this.onRelease(stage);
                    break;
                case BranchType_1.BranchType.PULL_REQUEST:
                    await this.onPullRequest(stage);
                    break;
                case BranchType_1.BranchType.HOTFIX:
                case BranchType_1.BranchType.HOTFIX_EMERGENCY:
                    await this.onHotfix(stage);
                    break;
                default:
                    await this.onFeature(stage);
                    break;
            }
        }
        finally {
            end();
        }
    }
    async onMaster(stage) {
        core.info(`Branch 'master': running default for stage '${stage.name}'`);
        await this.onDefault(stage);
    }
    async onDevelop(stage) {
        core.info(`Branch 'develop': running default for stage '${stage.name}'`);
        await this.onDefault(stage);
    }
    async onRelease(stage) {
        core.info(`Branch 'release': running default for stage '${stage.name}'`);
        await this.onDefault(stage);
    }
    async onFeature(stage) {
        core.info(`Branch 'feature': running default for stage '${stage.name}'`);
        await this.onDefault(stage);
    }
    async onHotfix(stage) {
        core.info(`Branch 'hotfix': running default for stage '${stage.name}'`);
        await this.onDefault(stage);
    }
    async onPullRequest(stage) {
        core.info(`Branch 'pullRequest': running default for stage '${stage.name}'`);
        await this.onDefault(stage);
    }
}
exports.AbstractBranchStage = AbstractBranchStage;
//# sourceMappingURL=AbstractBranchStage.js.map