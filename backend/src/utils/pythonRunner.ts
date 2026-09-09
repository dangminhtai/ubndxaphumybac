import { spawn } from 'child_process';

export interface PythonRunOptions {
  scriptPath: string;
  args?: string[];
  stdinPayload?: any;
  cwd?: string;
}

/**
 * Execute a Python script with automatic binary discovery:
 * - On Linux/Render: tries 'python3', then 'python'
 * - On Windows: tries 'python', 'py', then 'python3'
 * Supports stdin JSON streaming, stdout/stderr capture, and clean error handling.
 */
export async function runPythonScript(options: PythonRunOptions): Promise<{ stdout: string; stderr: string }> {
  const { scriptPath, args = [], stdinPayload, cwd } = options;

  const candidates = process.platform === 'win32'
    ? ['python', 'py', 'python3']
    : ['python3', 'python'];

  if (process.env.PYTHON_BIN) {
    candidates.unshift(process.env.PYTHON_BIN);
  }

  let lastError: any = null;

  for (const bin of candidates) {
    try {
      return await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        const child = spawn(bin, [scriptPath, ...args], {
          cwd: cwd || process.cwd(),
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (chunk: Buffer) => {
          stdout += chunk.toString('utf8');
        });

        child.stderr.on('data', (chunk: Buffer) => {
          stderr += chunk.toString('utf8');
        });

        child.on('error', (err: any) => {
          reject(err);
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve({ stdout, stderr });
          } else {
            reject(new Error(stderr.trim() || `Script Python thoát với mã lỗi ${code}`));
          }
        });

        if (stdinPayload !== undefined) {
          const payloadStr = typeof stdinPayload === 'string' ? stdinPayload : JSON.stringify(stdinPayload);
          child.stdin.write(payloadStr);
          child.stdin.end();
        }
      });
    } catch (err: any) {
      lastError = err;
      if (err.code === 'ENOENT') {
        // Binary does not exist on this system, try next candidate
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('Không tìm thấy trình thông dịch Python trên hệ thống (python hoặc python3)');
}
