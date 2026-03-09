#!/usr/bin/env bun

import { server } from './src/server';

server.listen(3000, '0.0.0.0', () => console.log('Listening on 0.0.0.0:3000'));

// const planet = await orpc.math.add({ a: 1, b: 2 });
// console.log(planet.sum);
