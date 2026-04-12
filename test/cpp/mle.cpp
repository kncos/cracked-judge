#include <vector>
#include <cstdint>
#include "common.h"

// optional mem parameter -- amount of mem to use in MiB
int main(int argc, char** argv) {
  size_t value = parseInput(argc, argv, 512);

  const size_t mem = value * 1024ULL * 1024ULL;
  // should reserve mem bytes
  std::vector<uint8_t> vec(mem, 69);
  // do not optimize this out
  asm volatile ("" : : "g"(vec.data()) : "memory");

  return 0;
};