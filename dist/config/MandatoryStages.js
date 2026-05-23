"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MANDATORY_STAGES = void 0;
exports.injectMandatoryStages = injectMandatoryStages;
const StageName_1 = require("../enums/StageName");
const ActionsType_1 = require("../enums/ActionsType");
// Mandatory stages enforced at platform level — developers cannot opt out.
// If a developer adds the same stage name to action.yaml, their config takes precedence.
exports.MANDATORY_STAGES = {
    [ActionsType_1.ActionsType.APP]: [
        {
            stage: { name: StageName_1.StageName.SEMGREP },
            insertAfter: StageName_1.StageName.LINTER,
            insertBefore: [StageName_1.StageName.SONARQUBE, StageName_1.StageName.TRIVY, StageName_1.StageName.CHECKOV, StageName_1.StageName.PUBLISH, StageName_1.StageName.RELEASE],
        },
    ],
    [ActionsType_1.ActionsType.LIBRARY]: [
        {
            stage: { name: StageName_1.StageName.SEMGREP },
            insertAfter: StageName_1.StageName.LINTER,
            insertBefore: [StageName_1.StageName.SONARQUBE, StageName_1.StageName.RELEASE],
        },
    ],
};
function injectMandatoryStages(stages, type) {
    const mandatory = exports.MANDATORY_STAGES[type];
    if (!mandatory?.length)
        return stages;
    const result = [...stages];
    for (const { stage, insertAfter, insertBefore } of mandatory) {
        if (result.some(s => s.name === stage.name))
            continue;
        const afterIdx = result.findIndex(s => s.name === insertAfter);
        if (afterIdx >= 0) {
            result.splice(afterIdx + 1, 0, { ...stage });
            continue;
        }
        // insertAfter not found — insert before the earliest following stage
        let insertAt = result.length;
        for (const beforeName of insertBefore) {
            const idx = result.findIndex(s => s.name === beforeName);
            if (idx >= 0 && idx < insertAt)
                insertAt = idx;
        }
        result.splice(insertAt, 0, { ...stage });
    }
    return result;
}
//# sourceMappingURL=MandatoryStages.js.map