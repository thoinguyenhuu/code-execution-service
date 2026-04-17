import { NextFunction, Request, Response } from "express";
import { getExecution } from "../../execution/execution.service";

type Param = {
  execution_id: string;
};
export const getExecutionHandler = async (
  req: Request<Param>,
  res: Response,
  next: NextFunction
) => {
  try{
    const execution_id = req.params.execution_id;
    const response = await getExecution(execution_id);
    return res.status(200).json(response);
  }
  catch(e){
    next(e)
  }
};
