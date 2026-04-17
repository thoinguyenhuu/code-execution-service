import { Worker, Job } from "bullmq";
import { ExecutionJob } from "./job";
import { connection } from "../config/ioredis.config";
import { envConfig } from "../config/env.config";
import {
  getExecution,
  updateStatusExecution,
} from "../execution/execution.service";
import { ExecutionStatus } from "../execution/execution.types";
import { getRunner } from "../execution/runners";

export const processExecutionJob = async (job: Job<ExecutionJob>) => {
  const { executionId } = job.data;

  try {
    const started_at = new Date();
    await updateStatusExecution(executionId, {
      status: ExecutionStatus.RUNNING,
      started_at,
    });

    const execution = await getExecution(executionId);

    if (!execution) {
      throw new Error("Execution not found");
    }

    if (!execution.language_snapshot) {
      throw new Error("Session not found");
    }

    const runner = getRunner(execution.language_snapshot);
    const result = await runner(execution.source_code_snapshot);

    const finished_at = new Date();
    await updateStatusExecution(executionId, {
      finished_at,
      excution_time_ms: finished_at.getTime() - started_at.getTime(),
      stderr: result.stderr,
      status: result.status,
      stdout: result.stdout,
    });

    return result;
  } catch (e) {
    await updateStatusExecution(executionId, {
      status: ExecutionStatus.FAILED,
      finished_at: new Date(),
    });
    throw e;
  }
};

const worker = new Worker<ExecutionJob>("execution", processExecutionJob, {
  connection,
  concurrency: envConfig.workerConcurrency,
});

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
