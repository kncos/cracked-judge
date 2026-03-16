current state:

- VMs up and running, orchestrator basic implementation done, make scripts seem to be working reasonably well
- VM orchestrator has poor handling of the jailer process it spawns -- if that exits, we have 0 insight into it

todo:

- [ ] need a better logging solution for VMs
- [ ] need to implement cgroups/process limits for microVMs
- [ ] implement websockets communication between guest VMs and host
- [ ] add redis queue for jobs
- [ ] add dispatcher in guests that runs code
