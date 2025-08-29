import { NextFunction, Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  playList: string[];
}

interface AuthenticationRequest extends Request {
  user?: IUser | null;
}

export const isAuth = async (
  req: AuthenticationRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.token as string;

    if (!token) {
      res.status(401).json({ message: "No token provided" });
      return;
    }

    const { data } = await axios.get(
      `${process.env.USER_SERVICE_URL}/api/v1/user/me`,
      {
        headers: {
          token,
        },
      }
    );
    req.user = data.user;
    next();
  } catch (error) {
    res.status(403).json({
      message: "please login first",
    });
  }
};

import multer from "multer";

const storage = multer.memoryStorage();

const uploadFile = multer({ storage }).single("file");

export default uploadFile;
