#include <chrono>
#include <iostream>
#include <thread> // Required for sleep
#include "common.h"

int main(int argc, char* argv[]) {
  size_t seconds_to_run = parseInput(argc, argv, 5);

  std::cout << "Sleeping for " << seconds_to_run << " seconds..." << std::endl;

  // This puts the process into a wait state (non-blocking for the CPU)
  std::this_thread::sleep_for(std::chrono::seconds(seconds_to_run));

  std::cout << "Done." << std::endl;

  return 0;
}