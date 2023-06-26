import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

const app: Express = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 8000;
app.use(express.json()).use(cors());

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server is running test test test");
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
