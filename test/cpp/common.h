#include <cmath>
#include <cstdlib>
#include <string>

inline size_t parseInput(int argc, char** argv, size_t defval) {
  size_t value = defval;
  if (argc > 1) {
    try {
      value = static_cast<size_t>(abs(std::stoi(argv[1])));
    } catch (...) {
      value = defval;
    }
  }
  return value;
}