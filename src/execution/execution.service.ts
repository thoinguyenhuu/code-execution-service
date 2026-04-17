import { da } from "zod/locales";
import { prisma } from "../config/prisma.config";
import { ExecutionStatus, UpdateExecutionField } from "./execution.types";
import { Session } from "@prisma/client";

export const createExecution = async (session: Session) => {
  return await prisma.execution.create({
    data: {
      session_id: session.session_id,
      source_code_snapshot: session.source_code,
      language_snapshot: session.language,
      status: ExecutionStatus.QUEUED,
      excution_time: new Date(),
    },
  });
};

export const getExecution = async (execution_id: string) => {
  return await prisma.execution.findUnique({
    where: {
      execution_id: execution_id,
    },
  });
};

export const updateStatusExecution = async (
  executionId: string,
  data: UpdateExecutionField,
) => {
  return await prisma.execution.update({
    where: {
      execution_id: executionId,
    },
    data: data,
  });
};

// export const updateExecution = async (executionId: string, data : ExecutionResult) => {
//   return await prisma.execution.update({
//     where: {
//       id: executionId,
//     },
//     data: data
//   });
// }
