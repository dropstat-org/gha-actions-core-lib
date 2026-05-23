"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LintStage = void 0;
const AbstractStage_1 = require("./base/AbstractStage");
const ActionYaml_1 = require("../entities/ActionYaml");
const ErrorCode_1 = require("../enums/ErrorCode");
class LintStage extends AbstractStage_1.AbstractStage {
    async run(stage) {
        if (!stage.commands || stage.commands.length === 0) {
            throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.MISSING_STAGE_COMMANDS, `Stage '${stage.name}' requires at least one command`);
        }
        const end = this.startGroup(`linter: ${stage.name}`);
        try {
            await this.execCommands(stage.commands, this._effectiveTools(stage));
        }
        finally {
            end();
        }
    }
}
exports.LintStage = LintStage;
//# sourceMappingURL=LintStage.js.map