import express, { Request, Response } from "express";
import route from "./api/routes";
import { envConfig } from "./config/env.config";
import { errorHanler } from "./api/middleware/error-handle";
const app = express();

// ===== Middleware =====
app.use(express.json());

// ===== Health check =====
// app.get("/", (req: Request, res: Response) => {
//   res.json({
//     message: "Code Execution Service is running",
//   });
// });

// ===== Routes =====
app.use("/", route);

// ===== Global Error Handler (optional nhưng nên có) =====
app.use(errorHanler);

// ===== Start server luôn tại đây =====
const PORT = envConfig.port;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
