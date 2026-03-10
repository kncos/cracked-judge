#pragma once

struct testSuite {
  struct Storage {
    enum class key_t { addOut };
    struct keyref_t { key_t key; };
    int64_t addOut;
  
    template <typename T>
    T resolve(const std::variant<T, keyref_t> arg) {
      if (std::holds_alternative<T>(arg)) return std::get<T>(arg);
      switch (std::get<keyref_t>(arg).key) {
        case key_t::addOut: { return addOut; }
      }
      std::cerr << "[FATAL] Attempting to resolve invalid key." << std::endl;
      std::terminate();
    }
  
    template <typename T>
    void store(key_t key, T val) {
      switch(key) {
        case key_t::addOut: { addOut = val; return; }
      }
      std::cerr << "[FATAL] Attempting to store invalid key." << std::endl;
      std::terminate();
    }
  } storage;
  
  struct addCaller {
    std::variant<int64_t, Storage::keyref_t> a;
    std::variant<int64_t, Storage::keyref_t> b;
    std::optional<std::variant<int64_t, Storage::keyref_t>> _expect;
  
    bool call(Storage& s) {
      int64_t add(int64_t a, int64_t b);
      auto res = add(s.resolve(a), s.resolve(b));
      s.store(Storage::key_t::addOut, res);
      if (_expect) {
        return unwrap_equals(res, s.resolve(*_expect));
      }
      return true;
    }
  };
  using AnyCall = std::variant<addCaller>;
  std::vector<AnyCall> data;
  std::expected<std::string, std::string> call() {
    size_t N = data.size();
    for (size_t i = 0; i < N; i++) {
      auto res = std::visit([&](auto& d) { return d.call(storage); }, data[i]);
      if (!res) {
        return std::unexpected(std::format("[FAIL] Failed on test case {}/{}.\n", i+1, N));
      }
    }
    return std::format("[PASS] {}/{} test cases were successful.\n", N, N);
  }
};

template <>
struct glz::meta<testSuite::AnyCall> {
  static constexpr std::string_view tag = "fn";
  static constexpr auto ids = std::array{"add"};
};

template<>
struct glz::meta<testSuite::Storage::key_t> {
  using enum testSuite::Storage::key_t;
  static constexpr auto value = glz::enumerate(addOut);
};
