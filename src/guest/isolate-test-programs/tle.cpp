#include <chrono>
#include <iostream>
#include "common.h"

int main(int argc, char* argv[]) {
  size_t seconds_to_run = parseInput(argc, argv, 5);

  std::cout << "Computing for " << seconds_to_run << " seconds..." << std::endl;

  auto start = std::chrono::high_resolution_clock::now();
  auto duration_limit = std::chrono::seconds(seconds_to_run);

  long long dummy_count = 0;

  // busy loop will keep the cpu usage high and ensure we use compute time
  while (std::chrono::high_resolution_clock::now() - start < duration_limit) {
    dummy_count++;
    if (dummy_count < 0) {
      dummy_count = 0;
    }
  }

  std::cout << "Done. Final dummy value: " << dummy_count << std::endl;

  return 0;
}