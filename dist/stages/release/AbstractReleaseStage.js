"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractReleaseStage = void 0;
const AbstractBranchStage_1 = require("../base/AbstractBranchStage");
const ArchiveManager_1 = require("../../archive/ArchiveManager");
class AbstractReleaseStage extends AbstractBranchStage_1.AbstractBranchStage {
    archive;
    constructor(config, branchType) {
        super(config, branchType);
        this.archive = new ArchiveManager_1.ArchiveManager();
    }
}
exports.AbstractReleaseStage = AbstractReleaseStage;
//# sourceMappingURL=AbstractReleaseStage.js.map