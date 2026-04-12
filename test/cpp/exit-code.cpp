#include "common.h"

int main(int argc, char** argv) {
  size_t exit_code = parseInput(argc, argv, 0) % 256;
  return exit_code;
}