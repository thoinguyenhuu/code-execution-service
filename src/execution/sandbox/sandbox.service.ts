import fs from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { envConfig } from "../../config/env.config";
import { ExecutionStatus, UpdateExecutionField } from "../execution.types";

function createTempDir() {
  const dir = path.join(os.tmpdir(), `exec-${randomUUID()}`);
  fs.mkdirSync(dir);
  return dir;
}

export async function executeFile(
  command: string,
  args: string[],
  code: string,
  filename: string,
  timeoutMs = envConfig.executionTimeoutMs,
) {
  const dir = createTempDir();
  const filePath = path.join(dir, filename);

  fs.writeFileSync(filePath, code);

  return new Promise<UpdateExecutionField>((resolve) => {
    const proc = spawn(command, [filePath, ...args]);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });

    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    const cleanup = () => {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {}
    };

    const timeout = setTimeout(() => {
      proc.kill("SIGKILL");
      cleanup();

      resolve({
        status: ExecutionStatus.TIMEOUT,
        stdout,
        stderr,
      });
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timeout);
      cleanup();

      resolve({
        status: code === 0 ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
        stdout,
        stderr,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      cleanup();

      resolve({
        status: ExecutionStatus.FAILED,
        stdout,
        stderr: err.message,
      });
    });
  });
}
