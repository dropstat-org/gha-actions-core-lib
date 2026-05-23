import { ActionsType } from '../enums/ActionsType';
import { Metadata } from './Metadata';
import { StageConfig, StageTools } from './StageConfig';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { ErrorCode } from '../enums/ErrorCode';
import { injectMandatoryStages } from '../config/MandatoryStages';
import { resolveImageSHA } from '../utils/ImageSHA';

export interface ActionYamlData {
  version?: string;
  type: ActionsType | string;
  metadata: Metadata;
  tools?: StageTools;
  env?: Record<string, string>;
  stages: StageConfig[];
}

export class ActionYaml implements ActionYamlData {
  version?: string;
  type: ActionsType | string;
  metadata: Metadata;
  tools?: StageTools;
  env?: Record<string, string>;
  stages: StageConfig[];

  constructor(data: ActionYamlData) {
    this.version = data.version;
    this.type = data.type;
    this.metadata = {
      ...data.metadata,
      artifactId: `${data.metadata.projectId}-${data.metadata.serviceId}`,
      commitHash: data.metadata.commitHash ?? resolveImageSHA(),
    };
    this.tools = data.tools;
    this.env = data.env;
    this.stages = injectMandatoryStages(data.stages ?? [], data.type);
  }

  static load(configPath: string): ActionYaml {
    if (!fs.existsSync(configPath)) {
      throw new ActionsCoreLibError(ErrorCode.CONFIG_NOT_FOUND, `Config file not found: ${configPath}`);
    }
    let raw: unknown;
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      raw = yaml.load(content);
    } catch (e) {
      throw new ActionsCoreLibError(ErrorCode.CONFIG_PARSE_ERROR, `Failed to parse ${configPath}: ${(e as Error).message}`);
    }
    return new ActionYaml(raw as ActionYamlData);
  }
}

export class ActionsCoreLibError extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = 'ActionsCoreLibError';
  }
}
