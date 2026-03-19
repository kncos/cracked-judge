import "ioredis";
import { ReplyError } from "ioredis";

declare module "ioredis" {
  export interface ReplyError extends Error {
    readonly name: "ReplyError";
    readonly command?: {
      name: string;
      args: string[];
    };
  }
}

export const isReplyError = (error: unknown): error is ReplyError => {
  if (error === null || error === undefined || typeof error !== "object")
    return false;

  if ("name" in error && error.name === "ReplyError") return true;
  if (error instanceof ReplyError) return true;

  return false;
};
