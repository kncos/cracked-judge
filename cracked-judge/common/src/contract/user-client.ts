import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import type { apiRouterContract } from "./api";

export const createUserClient = (url: string) => {
  const link = new RPCLink({ url });
  const client = createORPCClient(link);
  return client as ContractRouterClient<
    Omit<typeof apiRouterContract, "worker">
  >;
};
