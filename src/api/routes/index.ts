import { Router } from "express";
import sessionRoute from "./session.route";
import executionRoute from "./execution.route"
const route = Router();

route.use("/code-sessions", sessionRoute)
route.use("/executions", executionRoute )

export default route;

