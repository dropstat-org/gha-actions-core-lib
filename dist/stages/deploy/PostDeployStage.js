"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostDeployStage = void 0;
const AbstractDeployStage_1 = require("./AbstractDeployStage");
class PostDeployStage extends AbstractDeployStage_1.AbstractDeployStage {
    async run(stage) {
        const end = this.startGroup(`post_deploy: ${stage.name}`);
        try {
            await super.run(stage);
        }
        finally {
            end();
        }
    }
}
exports.PostDeployStage = PostDeployStage;
//# sourceMappingURL=PostDeployStage.js.map