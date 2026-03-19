import { judge } from "./judge";
import { vm } from "./vm";

export const appRouter = {
  judge: judge,
  vm: vm,
};

export type AppRouter = typeof appRouter;
