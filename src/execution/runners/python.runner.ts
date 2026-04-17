import { executeFile } from "../sandbox/sandbox.service";
import { UpdateExecutionField } from "../execution.types";

export const runPython = async (code: string): Promise<UpdateExecutionField> => {
  return executeFile("python", [], code, "main.py");
};
