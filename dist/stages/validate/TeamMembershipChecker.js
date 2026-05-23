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
exports.TeamMembershipChecker = void 0;
const core = __importStar(require("@actions/core"));
const github_1 = require("@actions/github");
class TeamMembershipChecker {
    teams;
    orgReadToken;
    constructor(teams, orgReadToken) {
        this.teams = teams;
        this.orgReadToken = orgReadToken;
    }
    async check(context) {
        const octokit = (0, github_1.getOctokit)(this.orgReadToken);
        for (const team of this.teams) {
            try {
                const { data } = await octokit.rest.teams.getMembershipForUserInOrg({
                    org: context.org,
                    team_slug: team.trim(),
                    username: context.actor,
                });
                if (data.state === 'active') {
                    core.info(`✓ ${context.actor} authorized via team: ${team}`);
                    return true;
                }
            }
            catch {
                // 404 = not a member of this team, try the next one
            }
        }
        core.info(`✗ ${context.actor} is not a member of any authorized team: [${this.teams.join(', ')}]`);
        return false;
    }
    describe() {
        return `team membership (ORG_READ_TOKEN) [${this.teams.join(', ')}]`;
    }
}
exports.TeamMembershipChecker = TeamMembershipChecker;
//# sourceMappingURL=TeamMembershipChecker.js.map