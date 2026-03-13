/**
 * CLI Output Utilities
 * Tables, colors, spinners, confirmations
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import ora, { type Ora } from 'ora';
import { confirm as inquirerConfirm } from '@inquirer/prompts';

export interface GlobalOptions {
  json?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  url?: string;
  token?: string;
}

export function printJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

export function printSuccess(message: string, opts?: GlobalOptions): void {
  if (opts?.quiet) return;
  if (opts?.json) return;
  console.log(chalk.green('✓') + ' ' + message);
}

export function printError(message: string, opts?: GlobalOptions): void {
  if (opts?.json) {
    process.stderr.write(JSON.stringify({ error: true, message }) + '\n');
    return;
  }
  console.error(chalk.red('✗') + ' ' + message);
}

export function printWarning(message: string, opts?: GlobalOptions): void {
  if (opts?.quiet) return;
  if (opts?.json) return;
  console.log(chalk.yellow('⚠') + ' ' + message);
}

export function printInfo(message: string, opts?: GlobalOptions): void {
  if (opts?.quiet) return;
  if (opts?.json) return;
  console.log(chalk.cyan('ℹ') + ' ' + message);
}

export function printTable(headers: string[], rows: (string | number)[][], opts?: GlobalOptions): void {
  if (opts?.json) return;
  if (opts?.quiet) return;

  const table = new Table({
    head: headers.map(h => chalk.bold.cyan(h)),
    style: { head: [], border: ['gray'] },
  });

  rows.forEach(row => table.push(row.map(String)));
  console.log(table.toString());
}

export function spinner(message: string): Ora {
  return ora({ text: message, color: 'cyan' }).start();
}

export async function confirm(message: string, defaultValue = false): Promise<boolean> {
  if (!process.stdin.isTTY) return defaultValue;
  return inquirerConfirm({ message, default: defaultValue });
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0 || !isFinite(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatUptime(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return '—';
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (['running', 'active', 'healthy', 'success', 'enabled'].includes(s)) return chalk.green(status);
  if (['stopped', 'inactive', 'failed', 'error', 'disabled'].includes(s)) return chalk.red(status);
  if (['pending', 'building', 'restarting', 'warning'].includes(s)) return chalk.yellow(status);
  return chalk.gray(status);
}

export function handleCliError(error: unknown, opts?: GlobalOptions): void {
  if (opts?.json) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(JSON.stringify({ error: true, message }) + '\n');
    process.exit(1);
  }

  if (error instanceof Error) {
    // Check for EasyPanelError shape
    const epError = error as any;
    if (epError.category === 'AUTHENTICATION') {
      printError(error.message);
      console.error(chalk.yellow('\nRun `ep login` to configure credentials'));
      process.exit(1);
    }
    if (epError.suggestions?.length > 0) {
      printError(error.message);
      console.error(chalk.dim('\nSuggestions:'));
      epError.suggestions.slice(0, 3).forEach((s: string) => console.error(chalk.dim('  -'), s));
      process.exit(1);
    }
    printError(error.message);
  } else {
    printError(String(error));
  }
  process.exit(1);
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function parseProjectService(projectOrSlash: string, service?: string): { project: string; service: string } {
  if (projectOrSlash.includes('/')) {
    const [proj, svc] = projectOrSlash.split('/', 2);
    return { project: proj, service: svc };
  }
  if (!service) {
    throw new Error('Service name required. Use "project/service" or provide both arguments.');
  }
  return { project: projectOrSlash, service };
}

export function requireAuth(opts?: GlobalOptions): void {
  if (!process.env.EASYPANEL_URL || !(process.env.EASYPANEL_TOKEN || process.env.EASYPANEL_PASSWORD)) {
    printError('Not configured. Run `ep login` first or set EASYPANEL_URL and EASYPANEL_TOKEN env vars.', opts);
    process.exit(1);
  }
}
