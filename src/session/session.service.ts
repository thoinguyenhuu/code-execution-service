import { CreateSession, UpdateSession } from "./session.types";
import { prisma } from "../config/prisma.config";
import { CODE_TEMPLATES } from "./template_code";
import { SessionStatus } from "./session.types";
import { Session } from "@prisma/client";
import { queue } from "../worker/queue";
import { envConfig } from "../config/env.config";
import { createExecution, updateStatusExecution } from "../execution/execution.service";
import { AppError, ErrorType } from "../api/middleware/AppError";
import { ExecutionStatus } from "../execution/execution.types";

export const createSession = async (data: CreateSession): Promise<Session> => {
  const codeTemplate = CODE_TEMPLATES[data.language]
  if (!codeTemplate) {
    throw new AppError(ErrorType.BAD_REQUEST, "Programming Language is not supported")
  }
  const result = await prisma.session.create({
    data: {
      language: data.language,
      source_code: CODE_TEMPLATES[data.language],
      status: SessionStatus.ACTIVE.toString(),
    },
  });
  return result;
};

export const updateSession = async (sessionId: string, data: UpdateSession) => {
  try{
    return await prisma.session.update({
      where: {
        session_id: sessionId,
      },
      data: {
        source_code: data.source_code,
      },
    });
  }
  catch(e){
    throw new AppError(ErrorType.NOT_FOUND, `Sesion not existed ; ID : ${sessionId}`)
  }
};

export const getSession = async (sessionId: string) => {
  const session = await prisma.session.findUnique({
    where: {
      session_id: sessionId,
    },
  });
  if (!session){
    throw new AppError(ErrorType.NOT_FOUND, `Sesion not existed ; ID : ${sessionId}`)
  }
};
export const runCodeSession = async (sessionId: string) => {
  const session = await prisma.session.findUnique({
    where: {
      session_id: sessionId,
    },
  });

  if (!session) {
    throw new AppError(ErrorType.NOT_FOUND, `Session with ID : ${sessionId} , is not exist, please create a session to run the code`)
  }

  const waiting = await queue.getWaitingCount();

  if (waiting > envConfig.queueMaxWaiting) {
    throw new AppError(ErrorType.TOO_MANY_REQUESTS, "System overloaded, try again later");
  }
  const exec = await createExecution(session);
  try {
    await queue.add(
      "run-code",
      { executionId: exec.execution_id },
      {
        attempts: 3, // retry tối đa 3 lần
        backoff: {
          type: "exponential",
          delay: 1000, // 1s → 2s → 4s
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
  } catch (e) {
    await updateStatusExecution(exec.execution_id, {
      status : ExecutionStatus.FAILED
    });

    throw new AppError(
      ErrorType.INTERNAL_SERVER_ERROR,
      "Failed to enqueue execution"
    );
  }

  
  return exec;
};
