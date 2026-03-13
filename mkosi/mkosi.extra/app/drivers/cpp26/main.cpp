#include "problem.h"

struct testSuite;

std::expected<std::string, std::string> _executor(std::string_view json) {
    auto glaze_result = glz::read_json<testSuite>(json);
    if (!glaze_result) {
        return std::unexpected(glz::format_error(glaze_result.error(), json));
    }
    return glaze_result.value().call();
}

int main() {
  std::ios_base::sync_with_stdio(false);
  std::cin.tie(nullptr);

  std::string json_line;
  json_line.reserve(1024);
  while (std::getline(std::cin, json_line)) {
    auto res = _executor(json_line);
    if (res.has_value()) {
      std::cout << res.value() << '\n';
    } else {
      std::cout << res.error() << '\n';
    }
  }
}
