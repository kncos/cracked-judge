#include <iostream>
#include <fstream>
#include <vector>
#include <cstdint>
#include "common.h"

int main(int argc, char** argv) {
  size_t mib_to_write = parseInput(argc, argv, 512);
  const size_t bytes_per_mib = 1024ULL * 1024ULL;
  const size_t total_bytes = mib_to_write * bytes_per_mib;
  
  // Use a 64KB buffer for writing to avoid MLE
  const size_t buffer_size = 64 * 1024;
  std::vector<uint8_t> buffer(buffer_size, 69);

  std::ofstream outfile("out.bin", std::ios::binary | std::ios::out);

  if (!outfile) {
    std::cerr << "Error: Could not open out.bin for writing." << std::endl;
    return 1;
  }

  std::cout << "Writing " << mib_to_write << " MiB to out.bin..." << std::endl;

  size_t bytes_written = 0;
  while (bytes_written < total_bytes) {
    size_t to_write = std::min(buffer_size, total_bytes - bytes_written);
    
    outfile.write(reinterpret_cast<const char*>(buffer.data()), to_write);
    
    if (!outfile) {
      std::cerr << "\nError during write (Disk full?)" << std::endl;
      return 1;
    }
    
    bytes_written += to_write;
  }

  outfile.close();
  std::cout << "Successfully wrote " << bytes_written << " bytes." << std::endl;

  return 0;
}