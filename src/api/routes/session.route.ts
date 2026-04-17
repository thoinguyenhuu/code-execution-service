import { Router } from "express";
import {
  createSessionHandler,
  runCodeHandler,
  updateSessionHandler,
} from "../controllers/session.controller";
const route = Router();

route.post("/", createSessionHandler);
route.patch("/:session_id", updateSessionHandler);
route.post("/:session_id/run", runCodeHandler);
export default route;
