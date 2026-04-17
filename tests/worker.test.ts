import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  workerCtorMock,
  getExecutionMock,
  updateStatusExecutionMock,
  getRunnerMock,
  runnerMock,
} = vi.hoisted(() => ({
  workerCtorMock: vi.fn(function MockWorker(this: any) {
    this.on = vi.fn();
  }),
  getExecutionMock: vi.fn(),
  updateStatusExecutionMock: vi.fn(),
  getRunnerMock: vi.fn(),
  runnerMock: vi.fn(),
}));

vi.mock("bullmq", () => ({
  Worker: workerCtorMock,
}));

vi.mock("../src/execution/execution.service", () => ({
  getExecution: getExecutionMock,
  updateStatusExecution: updateStatusExecutionMock,
}));

vi.mock("../src/execution/runners", () => ({
  getRunner: getRunnerMock,
}));

import { ExecutionStatus } from "../src/execution/execution.types";
import { processExecutionJob } from "../src/worker/worker";

describe("worker processExecutionJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates status to RUNNING and then COMPLETED when execution succeeds", async () => {
    getExecutionMock.mockResolvedValueOnce({
      execution_id: "e1",
      language_snapshot: "python",
      source_code_snapshot: "print('Hello')",
    });
    getRunnerMock.mockReturnValueOnce(runnerMock);
    runnerMock.mockResolvedValueOnce({
      status: ExecutionStatus.COMPLETED,
      stdout: "Hello\n",
      stderr: "",
    });

    const result = await processExecutionJob({
      data: { executionId: "e1" },
    } as any);

    expect(updateStatusExecutionMock).toHaveBeenNthCalledWith(1, "e1", {
      status: ExecutionStatus.RUNNING,
      started_at: expect.any(Date),
    });
    expect(getRunnerMock).toHaveBeenCalledWith("python");
    expect(runnerMock).toHaveBeenCalledWith("print('Hello')");
    expect(updateStatusExecutionMock).toHaveBeenNthCalledWith(2, "e1", {
      finished_at: expect.any(Date),
      excution_time_ms: expect.any(Number),
      stderr: "",
      status: ExecutionStatus.COMPLETED,
      stdout: "Hello\n",
    });
    expect(result).toEqual({
      status: ExecutionStatus.COMPLETED,
      stdout: "Hello\n",
      stderr: "",
    });
  });

  it("marks execution as FAILED when the execution record is missing", async () => {
    getExecutionMock.mockResolvedValueOnce(null);

    await expect(
      processExecutionJob({
        data: { executionId: "missing" },
      } as any),
    ).rejects.toThrow("Execution not found");

    expect(updateStatusExecutionMock).toHaveBeenNthCalledWith(1, "missing", {
      status: ExecutionStatus.RUNNING,
      started_at: expect.any(Date),
    });
    expect(updateStatusExecutionMock).toHaveBeenNthCalledWith(2, "missing", {
      status: ExecutionStatus.FAILED,
      finished_at: expect.any(Date),
    });
  });

  it("marks execution as FAILED when the runner throws", async () => {
    getExecutionMock.mockResolvedValueOnce({
      execution_id: "e1",
      language_snapshot: "python",
      source_code_snapshot: "print('Hello')",
    });
    getRunnerMock.mockReturnValueOnce(runnerMock);
    runnerMock.mockRejectedValueOnce(new Error("runner crashed"));

    await expect(
      processExecutionJob({
        data: { executionId: "e1" },
      } as any),
    ).rejects.toThrow("runner crashed");

    expect(updateStatusExecutionMock).toHaveBeenLastCalledWith("e1", {
      status: ExecutionStatus.FAILED,
      finished_at: expect.any(Date),
    });
  });
});
