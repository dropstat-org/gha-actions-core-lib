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
exports.AbstractStage = void 0;
const exec = __importStar(require("@actions/exec"));
const ArtifactHandler_1 = require("../../utils/ArtifactHandler");
const SummaryWriter_1 = require("../../utils/SummaryWriter");
const Logger_1 = require("../../utils/Logger");
class AbstractStage {
    config;
    artifactHandler = new ArtifactHandler_1.ArtifactHandler();
    summaryWriter = new SummaryWriter_1.SummaryWriter();
    constructor(config) {
        this.config = config;
    }
    // Punto de entrada público — orquesta el ciclo completo del stage
    async execute(stage) {
        if (stage.artifacts?.download?.length) {
            await this.artifactHandler.download(stage.artifacts.download);
        }
        await this.run(stage);
        if (stage.artifacts?.upload?.length) {
            await this.artifactHandler.upload(stage.artifacts.upload);
        }
        if (stage.summary) {
            await this.summaryWriter.write(stage.summary);
        }
    }
    async execCommands(commands, tools) {
        const env = this._buildEnv(tools);
        for (const cmd of commands) {
            Logger_1.Logger.info(`$ ${cmd}`);
            await exec.exec('bash', ['-c', cmd], { env: env });
        }
    }
    _buildEnv(tools) {
        const t = tools;
        const env = { ...process.env };
        if (t?.java)
            env['JAVA_VERSION'] = t.java;
        if (t?.maven)
            env['MAVEN_VERSION'] = t.maven;
        if (t?.gradle)
            env['GRADLE_VERSION'] = t.gradle;
        if (t?.node)
            env['NODE_VERSION'] = t.node;
        if (t?.pnpm)
            env['PNPM_VERSION'] = t.pnpm;
        if (t?.go)
            env['GO_VERSION'] = t.go;
        if (t?.python)
            env['PYTHON_VERSION'] = t.python;
        if (t?.dotnet)
            env['DOTNET_VERSION'] = t.dotnet;
        return env;
    }
    _effectiveTools(stage) {
        if (stage?.tools && Object.keys(stage.tools).length > 0)
            return stage.tools;
        return this.config.tools;
    }
    startGroup(name) {
        return Logger_1.Logger.group(name);
    }
}
exports.AbstractStage = AbstractStage;
//# sourceMappingURL=AbstractStage.js.map