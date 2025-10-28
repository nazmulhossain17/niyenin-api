import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import config from "../config/config";

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateAccessToken = (payload: {
  userId: string;
  email: string;
  role: string | null;
}): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.expires_in
      ? parseInt(config.jwt.expires_in)
      : undefined, // ✅ use expires_in, not secret
  };
  return jwt.sign(payload, config.jwt.secret as jwt.Secret, options);
};

export const generateRefreshToken = (payload: {
  userId: string;
  email: string;
  role: string;
}): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.refresh_expires_in
      ? parseInt(config.jwt.refresh_expires_in)
      : undefined, // ✅ use refresh_expires_in
  };
  return jwt.sign(payload, config.jwt.refresh_secret as jwt.Secret, options);
};

export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};
