import { spawn } from 'child_process';

const CLAUDE_PATH = '/Users/labo/.local/bin/claude';

interface CLIOptions {
  systemPrompt: string;
  message: string;
  timeout?: number;
}

interface CLIResult {
  response: string;
  durationMs: number;
}

export async function callClaude(opts: CLIOptions): Promise<CLIResult> {
  const { systemPrompt, message, timeout = 120000 } = opts;
  const start = Date.now();

  const args = [
    '-p',
    '--output-format', 'stream-json',
    '--verbose',
    '--permission-mode', 'bypassPermissions',
    '--disable-slash-commands',
    '--bare',
    '--system-prompt', systemPrompt,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(CLAUDE_PATH, args, {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.stdin.write(message);
    proc.stdin.end();

    let finalResult = '';
    let stderrBuf = '';
    let lineBuf = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      lineBuf += chunk.toString();
      const lines = lineBuf.split('\n');
      lineBuf = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const evt = JSON.parse(line);
          if (evt.type === 'result' && evt.result) {
            finalResult = evt.result;
          }
        } catch {}
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString();
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Claude CLI 타임아웃: ${timeout / 1000}초 초과`));
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;

      if (code !== 0 && !finalResult) {
        reject(new Error(`Claude CLI 에러 (code ${code}): ${stderrBuf.slice(0, 300)}`));
        return;
      }

      resolve({ response: (finalResult || '').trim(), durationMs });
    });
  });
}

export async function callClaudeWithRetry(opts: CLIOptions, retries = 1): Promise<CLIResult> {
  try {
    return await callClaude(opts);
  } catch (err) {
    if (retries > 0) {
      console.log('[claude-cli] 재시도 중...');
      return callClaudeWithRetry(opts, retries - 1);
    }
    throw err;
  }
}
