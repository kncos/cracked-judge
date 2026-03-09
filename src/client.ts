import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';
import type { router } from './router';

const link = new RPCLink({
  url: 'http://0.0.0.0:3000',
  headers: { Authorization: 'Bearer token' },
});

export const orpc: RouterClient<typeof router> = createORPCClient(link);
