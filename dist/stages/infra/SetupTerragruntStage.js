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
exports.SetupTerragruntStage = void 0;
const exec = __importStar(require("@actions/exec"));
const PlatformConfigLoader_1 = require("../../config/PlatformConfigLoader");
const FileUtil_1 = require("../../utils/FileUtil");
const Logger_1 = require("../../utils/Logger");
class SetupTerragruntStage {
    static async run() {
        const { terragrunt: version } = await PlatformConfigLoader_1.PlatformConfigLoader.toolVersions();
        const dest = '/usr/local/bin/terragrunt';
        const url = `https://github.com/gruntwork-io/terragrunt/releases/download/v${version}/terragrunt_linux_amd64`;
        Logger_1.Logger.info(`Installing Terragrunt ${version}...`);
        await exec.exec('curl', ['-s', '-L', '-o', dest, url]);
        FileUtil_1.FileUtil.chmod(dest, 0o755);
        Logger_1.Logger.info(`Terragrunt ${version} installed at ${dest}`);
    }
}
exports.SetupTerragruntStage = SetupTerragruntStage;
//# sourceMappingURL=SetupTerragruntStage.js.map