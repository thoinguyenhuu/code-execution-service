import { int, number } from "zod";

export enum ExecutionStatus {
  QUEUED = "QUEUED",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  TIMEOUT = "TIMEOUT",
}


export type UpdateExecutionField = {
  status? : ExecutionStatus, 
  started_at? : Date,
  finished_at? : Date,
  excution_time_ms? : number
  stdout?: string;
  stderr?: string;
}