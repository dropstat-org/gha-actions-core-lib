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
exports.ActionsCoreLibError = exports.ActionYaml = void 0;
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
const ErrorCode_1 = require("../enums/ErrorCode");
const MandatoryStages_1 = require("../config/MandatoryStages");
const ImageSHA_1 = require("../utils/ImageSHA");
class ActionYaml {
    version;
    type;
    metadata;
    tools;
    env;
    stages;
    constructor(data) {
        this.version = data.version;
        this.type = data.type;
        this.metadata = {
            ...data.metadata,
            artifactId: `${data.metadata.projectId}-${data.metadata.serviceId}`,
            commitHash: data.metadata.commitHash ?? (0, ImageSHA_1.resolveImageSHA)(),
        };
        this.tools = data.tools;
        this.env = data.env;
        this.stages = (0, MandatoryStages_1.injectMandatoryStages)(data.stages ?? [], data.type);
    }
    static load(configPath) {
        if (!fs.existsSync(configPath)) {
            throw new ActionsCoreLibError(ErrorCode_1.ErrorCode.CONFIG_NOT_FOUND, `Config file not found: ${configPath}`);
        }
        let raw;
        try {
            const content = fs.readFileSync(configPath, 'utf8');
            raw = yaml.load(content);
        }
        catch (e) {
            throw new ActionsCoreLibError(ErrorCode_1.ErrorCode.CONFIG_PARSE_ERROR, `Failed to parse ${configPath}: ${e.message}`);
        }
        return new ActionYaml(raw);
    }
}
exports.ActionYaml = ActionYaml;
class ActionsCoreLibError extends Error {
    code;
    constructor(code, message) {
        super(`[${code}] ${message}`);
        this.code = code;
        this.name = 'ActionsCoreLibError';
    }
}
exports.ActionsCoreLibError = ActionsCoreLibError;
//# sourceMappingURL=ActionYaml.js.map