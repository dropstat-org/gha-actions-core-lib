import * as core from '@actions/core';
import { ActionYaml, ActionsCoreLibError } from '../entities/ActionYaml';
import { StageName } from '../enums/StageName';
import { BranchType } from '../enums/BranchType';
import { ErrorCode } from '../enums/ErrorCode';
import { Workflow } from '../workflows/Workflow';
import { PlatformConfigLoader } from '../config/PlatformConfigLoader';

const STAGE_FLAGS: Array<{ output: string; stageName: StageName }> = [
  { output: 'compile_enabled',     stageName: StageName.COMPILE    },
  { output: 'unit_test_enabled',   stageName: StageName.UNIT_TEST  },
  { output: 'linter_enabled',      stageName: StageName.LINTER     },
  { output: 'semgrep_enabled',     stageName: StageName.SEMGREP    },
  { output: 'sonarqube_enabled',   stageName: StageName.SONARQUBE  },
  { output: 'trivy_enabled',       stageName: StageName.TRIVY      },
  { output: 'checkov_enabled',     stageName: StageName.CHECKOV    },
  { output: 'checkov_tf_enabled', stageName: StageName.CHECKOV_TF },
  { output: 'plan_enabled',        stageName: StageName.PLAN       },
  { output: 'publish_enabled',     stageName: StageName.PUBLISH    },
  { output: 'release_enabled',     stageName: StageName.RELEASE    },
  { output: 'deploy_enabled',      stageName: StageName.DEPLOY     },
  { output: 'pre_deploy_enabled',  stageName: StageName.PRE_DEPLOY  },
  { output: 'post_deploy_enabled', stageName: StageName.POST_DEPLOY },
];

export class OutputWriter {
  static async writeFlags(config: ActionYaml, branchType: BranchType, workflow: Workflow): Promise<void> {
    const stageNames  = new Set(config.stages.map(s => s.name));
    let allowedSlots  = new Set(workflow.stagesConfig(branchType).map(s => s.name as string));

    // Hotfix emergency: validate repo authorization and remove skippable stages
    if (branchType === BranchType.HOTFIX_EMERGENCY) {
      const policy = await PlatformConfigLoader.hotfixPolicy();
      const repo   = process.env.GITHUB_REPOSITORY ?? '';
      if (!policy.allowed_repos.includes(repo)) {
        throw new ActionsCoreLibError(
          ErrorCode.HOTFIX_EXCEPTION_NOT_ALLOWED,
          `repo '${repo}' is not authorized for hotfix/emergency mode — contact the platform team`,
        );
      }
      for (const stage of policy.skippable_stages) allowedSlots.delete(stage);
      core.warning(`Hotfix emergency mode active for ${repo} — skipping: ${policy.skippable_stages.join(', ')}`);
    }

    for (const { output, stageName } of STAGE_FLAGS) {
      const enabled = stageNames.has(stageName) && allowedSlots.has(stageName as string);
      core.setOutput(output, String(enabled));
    }

    const tools = config.tools ?? {};
    core.setOutput('tools_java',    tools.java    ?? '');
    core.setOutput('tools_maven',   tools.maven   ?? '');
    core.setOutput('tools_gradle',  tools.gradle  ?? '');
    core.setOutput('tools_node',    tools.node    ?? '');
    core.setOutput('tools_pnpm',    tools.pnpm    ?? '');
    core.setOutput('tools_go',      tools.go      ?? '');
    core.setOutput('tools_python',  tools.python  ?? '');
    core.setOutput('tools_dotnet',  tools.dotnet  ?? '');
    core.setOutput('ActionsCoreLib_type',  config.type);

    const deployPolicies = await PlatformConfigLoader.deployPolicy();
    const policy = deployPolicies[config.type] ?? { teams: [], users: [], min_permission: '' };
    core.setOutput('deploy_approver_teams', policy.teams.join(','));
    core.setOutput('deploy_approver_users', policy.users.join(','));
    core.setOutput('deploy_min_permission', policy.min_permission);

    core.info(`ActionsCoreLib type: ${config.type} | branch: ${branchType}`);
    core.info(`Stages configured: ${[...stageNames].join(', ')}`);
    core.info(`Stages allowed for branch: ${[...allowedSlots].join(', ')}`);
  }
}
