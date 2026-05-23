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
exports.UnitTestStage = void 0;
const core = __importStar(require("@actions/core"));
const AbstractStage_1 = require("./base/AbstractStage");
const ActionYaml_1 = require("../entities/ActionYaml");
const ErrorCode_1 = require("../enums/ErrorCode");
class UnitTestStage extends AbstractStage_1.AbstractStage {
    async run(stage) {
        if (!stage.commands || stage.commands.length === 0) {
            throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.MISSING_STAGE_COMMANDS, `Stage '${stage.name}' requires at least one command`);
        }
        const end = this.startGroup(`unit_test: ${stage.name}`);
        try {
            await this.execCommands(stage.commands, this._effectiveTools(stage));
            if (stage.junitPath) {
                core.info(`JUnit results expected at: ${stage.junitPath}`);
            }
        }
        finally {
            end();
        }
    }
}
exports.UnitTestStage = UnitTestStage;
//# sourceMappingURL=UnitTestStage.js.map