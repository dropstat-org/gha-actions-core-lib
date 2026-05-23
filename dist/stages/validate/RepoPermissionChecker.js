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
exports.RepoPermissionChecker = void 0;
const core = __importStar(require("@actions/core"));
const github_1 = require("@actions/github");
// Ordered from highest to lowest — a lower index means more privilege.
const PERMISSION_LEVELS = ['admin', 'maintain', 'write', 'read', 'none'];
function permissionRank(permission) {
    return PERMISSION_LEVELS.indexOf(permission);
}
class RepoPermissionChecker {
    minPermission;
    githubToken;
    constructor(minPermission, githubToken) {
        this.minPermission = minPermission;
        this.githubToken = githubToken;
    }
    async check(context) {
        const [owner, repo] = context.repo.split('/');
        const octokit = (0, github_1.getOctokit)(this.githubToken);
        const required = this.minPermission || 'maintain';
        let permission;
        try {
            const { data } = await octokit.rest.repos.getCollaboratorPermissionLevel({
                owner,
                repo,
                username: context.actor,
            });
            permission = data.permission;
        }
        catch {
            permission = 'none';
        }
        core.info(`Actor: ${context.actor} | Permission: ${permission} | Required: ${required}+`);
        const actorRank = permissionRank(permission);
        const minRank = permissionRank(required);
        if (actorRank < 0 || minRank < 0)
            return false;
        const authorized = actorRank <= minRank;
        if (authorized)
            core.info(`✓ ${context.actor} authorized (permission: ${permission} >= ${required})`);
        else
            core.info(`✗ ${context.actor} not authorized — has '${permission}', needs '${required}' or higher`);
        return authorized;
    }
    describe() {
        return `repo collaborator permission (>= ${this.minPermission || 'maintain'})`;
    }
}
exports.RepoPermissionChecker = RepoPermissionChecker;
//# sourceMappingURL=RepoPermissionChecker.js.map