import { runPython } from "./python.runner";
import { runNode } from "./node.runner";
import { UpdateExecutionField } from "../execution.types";

export type CodeRunner = (code: string) => Promise<UpdateExecutionField>;

export const runners: Record<string, CodeRunner> = {
  python: runPython,
  javascript: runNode,
};

export const getRunner = (language: string): CodeRunner => {
  const runner = runners[language];

  if (!runner) {
    throw new Error(`Unsupported language: ${language}`);
  }

  return runner;
};
