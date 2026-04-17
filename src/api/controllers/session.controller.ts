import { Request, Response, NextFunction } from "express";
import {
  createSession,
  runCodeSession,
  updateSession,
} from "../../session/session.service";
import { UpdateSession } from "../../session/session.types";
type Params = {
  session_id: string;
};
export const createSessionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const response = await createSession(req.body);
  return res.status(201).json(response);
};

export const updateSessionHandler = async (
  req: Request<Params>,
  res: Response,
) => {
  const sessionId = req.params.session_id;
  const updateData: UpdateSession = req.body;
  console.log(updateData);
  const response = await updateSession(sessionId, updateData);

  res.status(200).json(response);
};

export const runCodeHandler = async (req: Request<Params>, res: Response) => {
  const sessionId = req.params.session_id as string;

  try {
    const response = await runCodeSession(sessionId);

    return res.status(202).json(response); // 👈 chuẩn hơn
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";

    return res.status(400).json({
      message,
    });
  }
};
