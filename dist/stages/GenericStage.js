"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericStage = void 0;
const AbstractStage_1 = require("./base/AbstractStage");
const ActionYaml_1 = require("../entities/ActionYaml");
const ErrorCode_1 = require("../enums/ErrorCode");
class GenericStage extends AbstractStage_1.AbstractStage {
    async run(stage) {
        if (!stage.name) {
            throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.MISSING_STAGE_COMMANDS, 'Generic stage requires a name');
        }
        const end = this.startGroup(`generic: ${stage.name}`);
        try {
            if (stage.commands && stage.commands.length > 0) {
                await this.execCommands(stage.commands, this._effectiveTools(stage));
            }
        }
        finally {
            end();
        }
    }
}
exports.GenericStage = GenericStage;
//# sourceMappingURL=GenericStage.js.map