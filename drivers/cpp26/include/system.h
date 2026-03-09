#pragma once
#include <bits/stdc++.h>
#include <glaze/glaze.hpp>

/**
 * @brief If `a` & `b` are pointers, dereferences them and compares underlying value. If they're concrete, just compares them directly.
 * 
 * `unwrap_compare` accepts two arguments, `a` and `b`, and handles several cases:
 * - `a` is a pointer and `b` is concrete, or vice-versa: returns `false`.
 * - `a` and `b` are pointers and `*a` and `*b` are not comparable: returns false.
 * - `a` and `b` are concrete types and `a` and `b` are not comparable: returns false.
 * - either `a` or `b` is nullptr: compares pointer values directly, returns `a == b`. (avoids dereferencing nullptr)
 * - `a` and `b` are both non-null ptrs, `*a` and `*b` are comparable: returns `*a == *b`. (dereferences and compares underlying values)
 * - `a` and `b` are both concrete types, `a` and `b` are comparable: returns `a == b`. (direct comparison)
 *
 * Limitations:
 * - Doesn't handle smart pointers
 * - Returns false for mixed pointer vs. non-pointer types (no implicit compare)
 * - If pointee types or concrete types isn't == comparable, returns false.
 * - Can dereference an invalid pointer if neither are nullptr but one is invalid.
 */
#include <concepts>
#include <type_traits>
template <typename A, typename B>
constexpr bool unwrap_equals(const A& a, const B& b) {
  // if A or B is a reference, this strips the references and gets the
  // underlying typedef type that is referred to by A or B
  using TA = std::remove_cvref_t<A>;
  using TB = std::remove_cvref_t<B>;
  
  constexpr bool is_a_ptr = std::is_pointer_v<TA>;
  constexpr bool is_b_ptr = std::is_pointer_v<TB>;

  // if both are references to pointers:
  if constexpr (is_a_ptr && is_b_ptr) {
    // if either are nullptr, we'll compare directly here to
    // ensure that nullptr isn't dereferenced. This allows
    // nullptr == nullptr to work and return true
    if (a == nullptr || b == nullptr) 
      return a == b;
    
    // gets types being pointed to by a/b
    using PA = std::remove_pointer_t<TA>;
    using PB = std::remove_pointer_t<TB>;
    
    // if underlying types are comparable, deref and compare
    static_assert(std::equality_comparable_with<PA, PB>, "unwrap_equals: dereferenced provided types are non-comparable!");
    return *a == *b;
  // if both were comparable concrete types, just compare directly
  } else if constexpr (!is_a_ptr && !is_b_ptr) {
    static_assert(std::equality_comparable_with<TA, TB>, "unwrap_equals: concrete provided types are non-comparable!");
    return a == b;
  }
  static_assert(!is_a_ptr && !is_b_ptr, "unwrap_equals: mixed pointer and concrete types!");
  return false; // unreachable
}
