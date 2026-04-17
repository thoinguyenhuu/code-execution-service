import { Queue } from "bullmq";
import { ExecutionJob } from "./job";
import { connection } from "../config/ioredis.config";

export const queue = new Queue<ExecutionJob>("execution", {
  connection,
});
