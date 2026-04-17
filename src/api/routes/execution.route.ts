import { Router } from "express";
import { de } from "zod/locales";
import { getExecutionHandler } from "../controllers/execution.controller";
const route = Router();

route.get("/:execution_id", getExecutionHandler);

export default route;
