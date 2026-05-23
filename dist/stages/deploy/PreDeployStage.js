"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreDeployStage = void 0;
const AbstractDeployStage_1 = require("./AbstractDeployStage");
class PreDeployStage extends AbstractDeployStage_1.AbstractDeployStage {
    async run(stage) {
        const end = this.startGroup(`pre_deploy: ${stage.name}`);
        try {
            await super.run(stage);
        }
        finally {
            end();
        }
    }
}
exports.PreDeployStage = PreDeployStage;
//# sourceMappingURL=PreDeployStage.js.map