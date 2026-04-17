import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUniqueMock,
  createMock,
  updateMock,
  getWaitingCountMock,
  queueAddMock,
  createExecutionMock,
  updateStatusExecutionMock,
} = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  getWaitingCountMock: vi.fn(),
  queueAddMock: vi.fn(),
  createExecutionMock: vi.fn(),
  updateStatusExecutionMock: vi.fn(),
}));

vi.mock("../src/config/prisma.config", () => ({
  prisma: {
    session: {
      findUnique: findUniqueMock,
      create: createMock,
      update: updateMock,
    },
  },
}));

vi.mock("../src/worker/queue", () => ({
  queue: {
    getWaitingCount: getWaitingCountMock,
    add: queueAddMock,
  },
}));

vi.mock("../src/execution/execution.service", () => ({
  createExecution: createExecutionMock,
  updateStatusExecution: updateStatusExecutionMock,
}));

import { ErrorType } from "../src/api/middleware/AppError";
import { ExecutionStatus } from "../src/execution/execution.types";
import { createSession, runCodeSession } from "../src/session/session.service";
import { SessionStatus } from "../src/session/session.types";

describe("session.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createSession rejects unsupported languages", async () => {
    await expect(createSession({ language: "java" })).rejects.toMatchObject({
      statusCode: ErrorType.BAD_REQUEST,
      message: "Programming Language is not supported",
    });

    expect(createMock).not.toHaveBeenCalled();
  });

  it("createSession persists supported languages with the correct template", async () => {
    createMock.mockResolvedValueOnce({ session_id: "s1", status: "ACTIVE" });

    await createSession({ language: "python" });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        language: "python",
        source_code: expect.stringContaining("def solve()"),
        status: SessionStatus.ACTIVE,
      },
    });
  });

  it("runCodeSession rejects missing sessions", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    await expect(runCodeSession("missing-session")).rejects.toMatchObject({
      statusCode: ErrorType.NOT_FOUND,
    });

    expect(getWaitingCountMock).not.toHaveBeenCalled();
    expect(queueAddMock).not.toHaveBeenCalled();
  });

  it("runCodeSession rejects when the queue is overloaded", async () => {
    findUniqueMock.mockResolvedValueOnce({
      session_id: "s1",
      language: "python",
      source_code: "print('hello')",
    });
    getWaitingCountMock.mockResolvedValueOnce(1001);

    await expect(runCodeSession("s1")).rejects.toMatchObject({
      statusCode: ErrorType.TOO_MANY_REQUESTS,
      message: "System overloaded, try again later",
    });

    expect(createExecutionMock).not.toHaveBeenCalled();
    expect(queueAddMock).not.toHaveBeenCalled();
  });

  it("runCodeSession enqueues a job with retry and exponential backoff", async () => {
    const session = {
      session_id: "s1",
      language: "python",
      source_code: "print('hello')",
    };
    const execution = {
      execution_id: "e1",
      session_id: "s1",
      status: ExecutionStatus.QUEUED,
    };

    findUniqueMock.mockResolvedValueOnce(session);
    getWaitingCountMock.mockResolvedValueOnce(0);
    createExecutionMock.mockResolvedValueOnce(execution);
    queueAddMock.mockResolvedValueOnce(undefined);

    await expect(runCodeSession("s1")).resolves.toEqual(execution);

    expect(createExecutionMock).toHaveBeenCalledWith(session);
    expect(queueAddMock).toHaveBeenCalledWith(
      "run-code",
      { executionId: "e1" },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  });

  it("runCodeSession marks execution as failed when enqueueing fails", async () => {
    const session = {
      session_id: "s1",
      language: "python",
      source_code: "print('hello')",
    };
    const execution = {
      execution_id: "e1",
      session_id: "s1",
      status: ExecutionStatus.QUEUED,
    };

    findUniqueMock.mockResolvedValueOnce(session);
    getWaitingCountMock.mockResolvedValueOnce(0);
    createExecutionMock.mockResolvedValueOnce(execution);
    queueAddMock.mockRejectedValueOnce(new Error("redis down"));

    await expect(runCodeSession("s1")).rejects.toMatchObject({
      statusCode: ErrorType.INTERNAL_SERVER_ERROR,
      message: "Failed to enqueue execution",
    });

    expect(updateStatusExecutionMock).toHaveBeenCalledWith("e1", {
      status: ExecutionStatus.FAILED,
    });
  });
});
