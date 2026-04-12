#include <iostream>
#include <vector>
#include <algorithm>
#include "common.h"

const char* base64_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

int main(int argc, char** argv) {
    size_t mib_to_write = parseInput(argc, argv, 512);

    // speed improvement
    std::ios_base::sync_with_stdio(false);

    // 1 MiB buffer
    const size_t MIB_SIZE = 1024 * 1024;
    std::vector<char> buffer(MIB_SIZE);

    for (size_t offset = 0; offset < MIB_SIZE; offset += 64) {
        std::copy(base64_chars, base64_chars + 64, buffer.begin() + offset);
    }

    for (size_t i = 0; i < mib_to_write; ++i) {
        std::cout.write(buffer.data(), MIB_SIZE);
    }

    std::cout.flush();

    return 0;
}