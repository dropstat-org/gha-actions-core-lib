"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StageValidator = void 0;
const StageName_1 = require("../enums/StageName");
const ActionYaml_1 = require("../entities/ActionYaml");
const ErrorCode_1 = require("../enums/ErrorCode");
const KNOWN_STAGE_TYPES = new Set(Object.values(StageName_1.StageName));
class StageValidator {
    static validate(stages) {
        for (const stage of stages) {
            if (!stage.name) {
                throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.INVALID_STAGE_TYPE, 'Each stage must have a name');
            }
            if (stage.type && !KNOWN_STAGE_TYPES.has(stage.type)) {
                throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.INVALID_STAGE_TYPE, `Unknown stage type '${stage.type}' for stage '${stage.name}'`);
            }
        }
    }
}
exports.StageValidator = StageValidator;
//# sourceMappingURL=StageValidator.js.map