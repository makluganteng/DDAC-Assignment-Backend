import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const tokenSecret = process.env.TOKEN_KEY || "MY_NAME";

export const generateToken = (data: any) => {
  const token = jwt.sign({ data: data }, tokenSecret, {
    expiresIn: "1h",
  });

  return token;
};

export interface CustomRequest extends Request {
  token: string | JwtPayload;
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, tokenSecret);
    (req as CustomRequest).token = decoded;

    next();
  } catch (err) {
    res.status(401).send({ message: "Please Authenticate" });
  }
};
