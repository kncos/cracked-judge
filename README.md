# Basic Information

This project is an online judge that provides "RCE-as-a-Service". The goal is to enable the secure execution of arbitrary user-generated code in a modern, fast environment, with up to date tools for the user, easy integration of arbitrary third party libraries by the platform, and without relying on client side polling to get execution results.

Currently this is in no way usable or complete and is basically still in the experimentation phase, although in a few weeks I plan to reach a threshold of stability and completeness to actually deploy this for my specific use case.

# Architecture

CrackedJudge uses a dual-layered approach to security, with the battle tested programming competition tool [ioi/isolate](https://github.com/ioi/isolate) being the first layer, and the second layer being Firecracker MicroVMs for the environment that isolate runs in.

The host is a typescript program that uses Bun as its runtime. It manages the server which the MicroVMs connect to (via guest-initiated connections over unix sockets), the VM processes themselves (run under jailer), the socat processes for bridging the unix socket traffic to TCP on localhost, and the filesystem/mountpoints for the whole system to work.

The guest is a typescript client which is the main process that executes _inside of_ the MicroVMs upon startup. It basically just immediately tries to connect to the host via websockets and makes a blocking request where it waits until a job comes in.

The MicroVM guests use a competing consumers pattern to consume jobs from the host. The host uses Redis to manage incoming jobs.

I chose this design because I wanted to create a system of related parts which could all be easily extracted and work in isolation later on:

1. The server which runs on the host is basically just a broker between the user clients and the worker VMs, meaning it could be a standalone product with the worker VMs possibly being a completely different setup in the future.
2. The guest code that runs on the microVMs is also just a typescript client + filesystem setup that requests jobs and then executes on them. It is in no way coupled to firecracker, so a completely different approach could be used, or it could even be used as a complete standalone judge similar to Judge0 with minor tweaks.
3. The VM management code within the host could also be a completely separate library that could be used for basically system using firecracker with minimal tweaks, I plan to move towards generality in the future by re-exposing the firecracker API on the VM object.
4. Redis: because it was easy to get started and is totally sufficient for the level of reliability we would need for an application like this.

# Other Notes

I cannot say whether I will stick with maintaining this project and much less if it will actually be _good_. I can confirm that none of it is vibe-coded or written by AI, so any and all programming errors or poor decisions are entirely on me.

My specific use case involves a niche data structures & algorithms learning tool that I'm creating to address a few pain points that I had and ideally make something that I would personally like to use more than Leetcode. If I deploy and maintain that application long term, this application will also be maintained because it is just a component of that project.
