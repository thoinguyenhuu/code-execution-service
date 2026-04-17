import { executeFile } from "../sandbox/sandbox.service";
import { UpdateExecutionField } from "../execution.types";

export const runNode = async (code: string): Promise<UpdateExecutionField> => {
  return executeFile("node", [], code, "main.js");
};
