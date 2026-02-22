/**
 * AIReady GitHub Action
 * 
 * Runs AI readiness analysis and blocks PRs that break your AI context budget.
 */

import * as core from '@actions/core';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

interface AnalysisResult {
  summary: {
    totalIssues: number;
    toolsRun: string[];
    executionTime: number;
  };
  patterns?: Array<{ issues: Array<{ severity: string }> }>;
  context?: Array<{ severity: string }>;
  consistency?: { summary: { totalIssues: number }; results?: Array<{ issues: Array<{ severity: string }> }> };
  scoring?: {
    overallScore: number;
    breakdown: Array<{ toolName: string; score: number }>;
  };
}

async function run(): Promise<void> {
  try {
    const directory = core.getInput('directory') || '.';
    const threshold = parseInt(core.getInput('threshold') || '70', 10);
    const failOn = core.getInput('fail-on') || 'critical';
    const tools = core.getInput('tools') || 'patterns,context,consistency';

    core.info('🚀 AIReady Check starting...');
    core.info(`   Directory: ${directory}`);
    core.info(`   Threshold: ${threshold}`);
    core.info(`   Fail on: ${failOn}`);

    const tmpDir = join(process.cwd(), '.aiready-action');
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true });
    }
    const outputFile = join(tmpDir, 'aiready-results.json');

    const cliCommand = `npx @aiready/cli scan "${directory}" --tools ${tools} --output json --output-file "${outputFile}" --score`;
    core.info(`\n📦 Running: ${cliCommand}\n`);

    try {
      const { stdout } = await execAsync(cliCommand, { maxBuffer: 50 * 1024 * 1024 });
      core.info(stdout);
    } catch (error: any) {
      if (error.stdout) core.info(error.stdout);
      if (error.stderr) core.warning(error.stderr);
    }

    if (!existsSync(outputFile)) {
      core.setFailed('AIReady analysis failed - no output file generated');
      return;
    }

    const results: AnalysisResult = JSON.parse(readFileSync(outputFile, 'utf8'));

    // Count issues by severity
    let criticalCount = 0;
    let majorCount = 0;

    results.patterns?.forEach(p => p.issues.forEach(i => {
      if (i.severity === 'critical') criticalCount++;
      else if (i.severity === 'major') majorCount++;
    }));

    results.context?.forEach(c => {
      if (c.severity === 'critical') criticalCount++;
      else if (c.severity === 'major') majorCount++;
    });

    results.consistency?.results?.forEach(r => r.issues?.forEach(i => {
      if (i.severity === 'critical') criticalCount++;
      else if (i.severity === 'major') majorCount++;
    }));

    const score = results.scoring?.overallScore || 0;
    const totalIssues = results.summary.totalIssues;

    core.setOutput('score', score);
    core.setOutput('issues', totalIssues);
    core.setOutput('critical', criticalCount);
    core.setOutput('major', majorCount);

    // Determine if passed
    let passed = true;
    let failReason = '';

    if (score < threshold) {
      passed = false;
      failReason = `AI Readiness Score ${score} is below threshold ${threshold}`;
    }

    if (failOn === 'critical' && criticalCount > 0) {
      passed = false;
      failReason = `Found ${criticalCount} critical issues`;
    } else if (failOn === 'major' && (criticalCount + majorCount) > 0) {
      passed = false;
      failReason = `Found ${criticalCount} critical and ${majorCount} major issues`;
    } else if (failOn === 'any' && totalIssues > 0) {
      passed = false;
      failReason = `Found ${totalIssues} total issues`;
    }

    core.setOutput('passed', passed);

    // Summary
    core.summary
      .addHeading('AI Readiness Check', 2)
      .addRaw(`**Score:** ${score}/100\n`)
      .addRaw(`**Threshold:** ${threshold}\n`)
      .addRaw(`**Issues:** ${totalIssues} (${criticalCount} critical, ${majorCount} major)\n`)
      .addRaw(`**Result:** ${passed ? '✅ PASSED' : '❌ FAILED'}\n`)
      .write();

    if (!passed) {
      core.error(`❌ PR BLOCKED: ${failReason}`);
      core.setFailed(failReason);
    } else {
      core.notice(`✅ AI Readiness Check passed with score ${score}/100`);
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('Unknown error occurred');
    }
  }
}

run();
</task_progress>
</write_to_file>