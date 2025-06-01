# Chapter 14: Collections and Data Structures

## Introduction

While Rust's built-in types like arrays and tuples are powerful, they have limitations when you need to store variable amounts of data or implement more complex data structures. This is where Rust's standard library collections come in. Collections are data structures that can store multiple values, with each having different strengths and costs.

In this chapter, we'll explore:

- Vec<T> and dynamic arrays
- Iterating, growing, and shrinking vectors
- Common vector operations
- HashMaps, BTreeMaps, and key-value stores
- Working with hash maps efficiently
- HashSets and BTreeSets
- Performance characteristics of collections
- Specialized collections
- Choosing the right collection
- Custom data structures
- Common collection algorithms
- Building a data analysis tool

By the end of this chapter, you'll understand how to use Rust's collection types effectively and how to choose the right collection for your specific needs.

## Vec<T> and Dynamic Arrays

The `Vec<T>` (vector) is one of the most versatile and commonly used collections in Rust. It's a dynamic array that can grow or shrink in size and store elements of the same type contiguously in memory.

### Creating Vectors

There are several ways to create a vector in Rust:

```rust
// Creating an empty vector with explicit type annotation
let v1: Vec<i32> = Vec::new();

// Using the vec! macro
let v2 = vec![1, 2, 3, 4, 5];

// Creating with initial capacity for efficiency
let mut v3 = Vec::with_capacity(10);
```

The `with_capacity` method is an optimization that allocates memory for a specific number of elements upfront, reducing the number of allocations when you know approximately how many elements the vector will contain.

### Memory Layout

Understanding how vectors are stored in memory is important for performance considerations:

```rust
struct Vec<T> {
    ptr: *mut T,  // Pointer to the heap allocation
    len: usize,   // Number of elements currently in the vector
    capacity: usize,  // Total space allocated
}
```

A vector consists of three parts:

1. A pointer to a heap allocation where the elements are stored
2. The length (number of elements currently in the vector)
3. The capacity (total space allocated on the heap)

When you add elements to a vector and it exceeds its capacity, it will:

1. Allocate a new, larger chunk of memory (typically 2x the current capacity)
2. Copy all existing elements to the new allocation
3. Update the pointer and capacity
4. Deallocate the old memory

This process is called "reallocation" and can be expensive, which is why using `with_capacity` can improve performance when you know approximately how many elements you'll need.

## Iterating, Growing, and Shrinking Vectors

### Adding Elements to Vectors

There are multiple ways to add elements to a vector:

```rust
let mut v = Vec::new();

// Add a single element to the end
v.push(1);
v.push(2);
v.push(3);

// Add multiple elements using extend
let more_numbers = vec![4, 5, 6];
v.extend(more_numbers);

// Insert an element at a specific position
v.insert(2, 10);  // Inserts 10 at index 2, shifting elements right
```

### Removing Elements from Vectors

Similarly, there are several ways to remove elements:

```rust
let mut v = vec![1, 2, 3, 4, 5];

// Remove and return the last element
let last = v.pop();  // Returns Some(5)

// Remove an element at a specific index
let second = v.remove(1);  // Removes the element at index 1 (value 2)

// Clear all elements but keep the allocated memory
v.clear();
```

### Iterating Over Vectors

Rust provides several ways to iterate over vectors:

```rust
let v = vec![1, 2, 3, 4, 5];

// Immutable iteration
for element in &v {
    println!("{}", element);
}

// Mutable iteration
let mut v = vec![1, 2, 3, 4, 5];
for element in &mut v {
    *element *= 2;  // Double each element
}

// Consuming iteration (takes ownership)
for element in v {
    println!("{}", element);
}
// v is no longer usable here

// Using iterators directly
let v = vec![1, 2, 3, 4, 5];
let doubled: Vec<i32> = v.iter().map(|x| x * 2).collect();
```

### Slicing Vectors

You can create a slice of a vector to work with a portion of it:

```rust
let v = vec![1, 2, 3, 4, 5];

// Create a slice of the vector
let slice = &v[1..4];  // [2, 3, 4]

// Iterate over a slice
for element in slice {
    println!("{}", element);
}
```

## Common Vector Operations

### Accessing Elements

There are two primary ways to access vector elements:

```rust
let v = vec![1, 2, 3, 4, 5];

// Using indexing syntax (panics if out of bounds)
let third = v[2];

// Using the get method (returns Option<&T>)
match v.get(2) {
    Some(element) => println!("The third element is {}", element),
    None => println!("There is no third element"),
}

// For mutable access
let mut v = vec![1, 2, 3, 4, 5];
if let Some(element) = v.get_mut(2) {
    *element = 10;
}
```

The `get` method is safer because it returns an `Option` instead of panicking when accessing an out-of-bounds index.

### Searching and Sorting

Vectors provide methods for searching and sorting elements:

```rust
let mut v = vec![3, 1, 4, 1, 5, 9, 2, 6];

// Sort the vector
v.sort();
assert_eq!(v, vec![1, 1, 2, 3, 4, 5, 6, 9]);

// Sort with a custom comparator
v.sort_by(|a, b| b.cmp(a));  // Sort in descending order
assert_eq!(v, vec![9, 6, 5, 4, 3, 2, 1, 1]);

// Find the position of an element
let pos = v.iter().position(|&x| x == 4);
assert_eq!(pos, Some(3));

// Check if the vector contains an element
let contains = v.contains(&5);
assert_eq!(contains, true);
```

### Filtering and Transforming

Using iterator methods, you can filter and transform vectors:

```rust
let v = vec![1, 2, 3, 4, 5, 6];

// Filter elements
let evens: Vec<_> = v.iter().filter(|&&x| x % 2 == 0).collect();
assert_eq!(evens, vec![&2, &4, &6]);

// Transform elements
let squared: Vec<_> = v.iter().map(|&x| x * x).collect();
assert_eq!(squared, vec![1, 4, 9, 16, 25, 36]);

// Both filter and transform
let even_squared: Vec<_> = v.iter()
    .filter(|&&x| x % 2 == 0)
    .map(|&x| x * x)
    .collect();
assert_eq!(even_squared, vec![4, 16, 36]);
```

### Joining and Splitting

You can join vectors together or split them:

```rust
let v1 = vec![1, 2, 3];
let v2 = vec![4, 5, 6];

// Combining vectors
let v3 = [v1.clone(), v2.clone()].concat();
assert_eq!(v3, vec![1, 2, 3, 4, 5, 6]);

// Another way to combine
let mut v4 = v1.clone();
v4.extend(v2.clone());
assert_eq!(v4, vec![1, 2, 3, 4, 5, 6]);

// Splitting a vector
let v = vec![1, 2, 3, 4, 5, 6];
let (left, right) = v.split_at(3);
assert_eq!(left, &[1, 2, 3]);
assert_eq!(right, &[4, 5, 6]);
```

### Capacity Management

You can manage a vector's capacity for better performance:

```rust
let mut v = Vec::new();

// Reserve space for elements
v.reserve(10);  // Ensures capacity for at least 10 elements

// Add elements
for i in 0..5 {
    v.push(i);
}

// Check capacity and length
println!("Length: {}, Capacity: {}", v.len(), v.capacity());

// Shrink capacity to fit the current elements
v.shrink_to_fit();
println!("After shrink_to_fit - Length: {}, Capacity: {}", v.len(), v.capacity());
```

### Performance Considerations

When working with vectors, keep these performance considerations in mind:

1. **Preallocate capacity** when you know the approximate size to avoid reallocations
2. **Prefer `push` over `insert`** when possible, as inserting in the middle requires shifting elements
3. **Use `with_capacity` and `reserve`** to minimize allocations
4. **Consider using specialized methods** like `extend` instead of multiple individual `push` calls
5. **Be mindful of the cost of clone operations** when working with vectors of complex types

## HashMaps, BTreeMaps, and Key-Value Stores

Key-value stores are collections that allow you to store and retrieve values based on keys. Rust provides several implementations with different performance characteristics.

### HashMap<K, V>

`HashMap<K, V>` provides average-case O(1) lookups, insertions, and removals. It's the go-to choice for most key-value storage needs.

#### Creating a HashMap

```rust
use std::collections::HashMap;

// Create an empty HashMap
let mut scores = HashMap::new();

// Insert key-value pairs
scores.insert("Blue", 10);
scores.insert("Yellow", 50);

// Create from iterators of keys and values
let teams = vec!["Blue", "Yellow"];
let initial_scores = vec![10, 50];
let scores: HashMap<_, _> = teams.into_iter().zip(initial_scores.into_iter()).collect();

// Create with initial capacity
let mut map = HashMap::with_capacity(10);
```

#### Accessing Values

There are several ways to access values in a `HashMap`:

```rust
let mut scores = HashMap::new();
scores.insert("Blue", 10);
scores.insert("Yellow", 50);

// Using indexing (panics if key doesn't exist)
let blue_score = scores["Blue"];

// Using get (returns Option<&V>)
match scores.get("Blue") {
    Some(score) => println!("Blue team's score: {}", score),
    None => println!("Blue team not found"),
}

// Using get_mut for mutable access
if let Some(score) = scores.get_mut("Blue") {
    *score += 5;  // Increment Blue's score
}

// Check if a key exists
if scores.contains_key("Red") {
    println!("Red team exists");
} else {
    println!("Red team doesn't exist");
}

// Get or insert a default value
let red_score = scores.entry("Red").or_insert(0);
*red_score += 5;  // Red now has a score of 5
```

#### Updating HashMap Values

Here are common patterns for updating values in a `HashMap`:

```rust
let mut scores = HashMap::new();

// Insert or overwrite
scores.insert("Blue", 10);
scores.insert("Blue", 25);  // Blue's score is now 25

// Insert only if key doesn't exist
scores.entry("Yellow").or_insert(50);
scores.entry("Yellow").or_insert(100);  // Yellow's score is still 50

// Update a value based on the old value
let text = "hello world wonderful world";
let mut word_count = HashMap::new();

for word in text.split_whitespace() {
    let count = word_count.entry(word).or_insert(0);
    *count += 1;
}
// word_count contains {"hello": 1, "world": 2, "wonderful": 1}
```

#### Iterating Over HashMaps

You can iterate over all key-value pairs in a `HashMap`:

```rust
let mut scores = HashMap::new();
scores.insert("Blue", 10);
scores.insert("Yellow", 50);
scores.insert("Red", 30);

// Iterate over key-value pairs (in arbitrary order)
for (key, value) in &scores {
    println!("{}: {}", key, value);
}

// Iterate over just keys
for key in scores.keys() {
    println!("{}", key);
}

// Iterate over just values
for value in scores.values() {
    println!("{}", value);
}

// Iterate over key-value pairs and modify values
for (_, value) in scores.iter_mut() {
    *value += 5;  // Increment all scores by 5
}
```

#### Removing Entries

You can remove entries from a `HashMap` in several ways:

```rust
let mut scores = HashMap::new();
scores.insert("Blue", 10);
scores.insert("Yellow", 50);
scores.insert("Red", 30);

// Remove a specific key and return its value
let red_score = scores.remove("Red");  // Returns Some(30)

// Remove a key only if it has a specific value
let removed = scores.remove_entry("Blue");  // Returns Some(("Blue", 10))

// Clear all entries
scores.clear();
```

### BTreeMap<K, V>

`BTreeMap<K, V>` is a map based on a B-Tree, which keeps its keys sorted and provides O(log n) operations.

```rust
use std::collections::BTreeMap;

let mut map = BTreeMap::new();
map.insert(3, "three");
map.insert(1, "one");
map.insert(4, "four");
map.insert(2, "two");

// Keys are iterated in sorted order
for (key, value) in &map {
    println!("{}: {}", key, value);  // Prints in order: 1, 2, 3, 4
}

// Range operations
for (key, value) in map.range(2..4) {
    println!("{}: {}", key, value);  // Prints: 2: two, 3: three
}

// Find the first key-value pair greater than or equal to a key
if let Some((key, value)) = map.range(2..).next() {
    println!("First entry >= 2: {}: {}", key, value);  // Prints: 2: two
}
```

### HashMap vs. BTreeMap: When to Use Each

Choose between `HashMap` and `BTreeMap` based on your requirements:

| Feature               | HashMap                      | BTreeMap             |
| --------------------- | ---------------------------- | -------------------- |
| Key order             | Unordered                    | Ordered              |
| Lookup time           | O(1) average                 | O(log n)             |
| Memory usage          | More                         | Less                 |
| Key requirements      | Must implement `Hash` + `Eq` | Must implement `Ord` |
| Range queries         | Not supported                | Supported            |
| Predictable iteration | No                           | Yes                  |

Use `HashMap` when:

- You need the fastest possible lookups and don't care about key order
- Your keys implement `Hash` and `Eq`
- You don't need range operations

Use `BTreeMap` when:

- You need keys to be sorted
- You need range operations
- Memory usage is a concern
- You need predictable iteration order
- Your keys implement `Ord`

## Working with Hash Maps Efficiently

### Choosing Good Hash Keys

For efficient `HashMap` usage, keys should:

1. **Implement `Hash` efficiently**: A good hash function distributes keys evenly
2. **Have cheap equality checks**: Since lookups require equality comparisons
3. **Be small or implement Copy**: To avoid expensive cloning operations

Common types that make good hash keys:

- Integers (`i32`, `u64`, etc.)
- Characters (`char`)
- Booleans (`bool`)
- Strings (`String`, `&str`)
- Small fixed-size arrays of hashable types
- Tuples of hashable types

### Avoiding Common HashMap Pitfalls

#### 1. Hashing Security Considerations

Rust's default hasher (`SipHash`) is designed to be resistant to HashDoS attacks but is slower than non-cryptographic hashers.

If you need better performance and control over the hashing algorithm, you can use a custom hasher:

```rust
use std::collections::HashMap;
use std::hash::{BuildHasher, Hasher};
use std::collections::hash_map::RandomState;

let hash_builder = RandomState::new();
let mut map: HashMap<String, i32, _> = HashMap::with_hasher(hash_builder);
map.insert("hello".to_string(), 42);
```

For performance-critical code, consider using the `ahash` or `fnv` crates for faster hashing.

#### 2. Managing Memory with Capacity

Like vectors, `HashMap`s can be pre-allocated to avoid rehashing:

```rust
// Create with capacity for at least 100 entries
let mut map = HashMap::with_capacity(100);

// Reserve space for more entries
map.reserve(50);  // Ensure capacity for at least 50 more entries
```

#### 3. Handling Entry API Patterns

The Entry API is a powerful way to manipulate maps without redundant lookups:

```rust
use std::collections::HashMap;

let mut player_stats = HashMap::new();

// Update or insert based on existing value
match player_stats.entry("Alice") {
    std::collections::hash_map::Entry::Occupied(mut entry) => {
        *entry.get_mut() += 1;  // Increment existing value
    },
    std::collections::hash_map::Entry::Vacant(entry) => {
        entry.insert(1);  // Insert new value
    },
}

// Or more concisely:
*player_stats.entry("Bob").or_insert(0) += 1;

// Insert with a calculated value that might be expensive
let value = player_stats.entry("Charlie").or_insert_with(|| {
    // This closure is only called if "Charlie" isn't in the map
    expensive_computation()
});
```

#### 4. Using References as Keys

When using references as keys, be mindful of lifetimes:

```rust
let mut map = HashMap::new();

// Using string literals (which have 'static lifetime)
map.insert("key1", 42);

// Using string references with explicit lifetimes
let owned_str = String::from("key2");
map.insert(owned_str.as_str(), 24);

// The HashMap now contains references to strings,
// so it can't outlive the strings it references
```

#### 5. Customizing HashMap Behavior

You can customize the initial capacity and load factor (the point at which rehashing occurs):

```rust
use std::collections::HashMap;

// Default load factor is 0.75
// This means rehashing occurs when the map is 75% full
let mut map = HashMap::with_capacity_and_hasher(
    100,  // Initial capacity
    std::collections::hash_map::RandomState::new(),  // Hasher
);
```

## HashSets and BTreeSets

Sets are collections that store unique values without any associated values. Rust provides two main set implementations: `HashSet` and `BTreeSet`.

### HashSet<T>

`HashSet<T>` is based on `HashMap<T, ()>` and provides O(1) average-case operations for adding, removing, and checking if an element exists.

#### Creating a HashSet

```rust
use std::collections::HashSet;

// Create an empty HashSet
let mut set = HashSet::new();

// Insert elements
set.insert(1);
set.insert(2);
set.insert(3);

// Create from an iterator
let set: HashSet<_> = [1, 2, 3, 4].iter().cloned().collect();

// Create with initial capacity
let mut set = HashSet::with_capacity(10);
```

#### Basic Operations

```rust
let mut set = HashSet::new();
set.insert("apple");
set.insert("banana");
set.insert("cherry");

// Check if an element exists
if set.contains("banana") {
    println!("Set contains banana");
}

// Remove an element
set.remove("apple");

// Get the number of elements
println!("Set size: {}", set.len());

// Check if the set is empty
if set.is_empty() {
    println!("Set is empty");
}

// Iterate over the set (in arbitrary order)
for item in &set {
    println!("{}", item);
}

// Clear the set
set.clear();
```

#### Set Operations

`HashSet` provides methods for common set operations:

```rust
let mut a = HashSet::new();
a.insert(1);
a.insert(2);
a.insert(3);

let mut b = HashSet::new();
b.insert(3);
b.insert(4);
b.insert(5);

// Union: elements in either set
let union: HashSet<_> = a.union(&b).cloned().collect();
// {1, 2, 3, 4, 5}

// Intersection: elements in both sets
let intersection: HashSet<_> = a.intersection(&b).cloned().collect();
// {3}

// Difference: elements in a but not in b
let difference: HashSet<_> = a.difference(&b).cloned().collect();
// {1, 2}

// Symmetric difference: elements in either set but not both
let sym_difference: HashSet<_> = a.symmetric_difference(&b).cloned().collect();
// {1, 2, 4, 5}

// Check if a is a subset of b
let is_subset = a.is_subset(&b);  // false

// Check if a is a superset of b
let is_superset = a.is_superset(&b);  // false

// Check if sets are disjoint (have no elements in common)
let is_disjoint = a.is_disjoint(&b);  // false
```

### BTreeSet<T>

`BTreeSet<T>` is based on `BTreeMap<T, ()>` and keeps elements sorted. It provides O(log n) operations and supports range queries.

```rust
use std::collections::BTreeSet;

let mut set = BTreeSet::new();
set.insert(3);
set.insert(1);
set.insert(4);
set.insert(2);

// Elements are iterated in sorted order
for item in &set {
    println!("{}", item);  // Prints: 1, 2, 3, 4
}

// Range operations
for item in set.range(2..4) {
    println!("{}", item);  // Prints: 2, 3
}

// Find the first element greater than or equal to a value
if let Some(item) = set.range(2..).next() {
    println!("First item >= 2: {}", item);  // Prints: 2
}
```

### HashSet vs. BTreeSet: When to Use Each

The choice between `HashSet` and `BTreeSet` is similar to the choice between `HashMap` and `BTreeMap`:

| Feature               | HashSet                      | BTreeSet             |
| --------------------- | ---------------------------- | -------------------- |
| Element order         | Unordered                    | Ordered              |
| Operation time        | O(1) average                 | O(log n)             |
| Memory usage          | More                         | Less                 |
| Element requirements  | Must implement `Hash` + `Eq` | Must implement `Ord` |
| Range queries         | Not supported                | Supported            |
| Predictable iteration | No                           | Yes                  |

Use `HashSet` when:

- You need the fastest possible operations and don't care about element order
- Your elements implement `Hash` and `Eq`
- You don't need range operations

Use `BTreeSet` when:

- You need elements to be sorted
- You need range operations
- Memory usage is a concern
- You need predictable iteration order
- Your elements implement `Ord`

## Performance Characteristics of Collections

Understanding the performance characteristics of different collections is crucial for choosing the right one for your needs.

### Time Complexity

Here's a comparison of the time complexity for common operations across different collections:

| Operation            | Vec            | HashMap  | BTreeMap | HashSet  | BTreeSet |
| -------------------- | -------------- | -------- | -------- | -------- | -------- |
| Access by index      | O(1)           | -        | -        | -        | -        |
| Access by key        | -              | O(1) avg | O(log n) | -        | -        |
| Insert at end        | O(1) amortized | -        | -        | -        | -        |
| Insert at position   | O(n)           | -        | -        | -        | -        |
| Insert key-value     | -              | O(1) avg | O(log n) | -        | -        |
| Insert element       | -              | -        | -        | O(1) avg | O(log n) |
| Remove from end      | O(1)           | -        | -        | -        | -        |
| Remove from position | O(n)           | -        | -        | -        | -        |
| Remove by key        | -              | O(1) avg | O(log n) | -        | -        |
| Remove element       | -              | -        | -        | O(1) avg | O(log n) |
| Iterate              | O(n)           | O(n)     | O(n)     | O(n)     | O(n)     |
| Sort                 | O(n log n)     | -        | -        | -        | -        |
| Search (unsorted)    | O(n)           | -        | -        | -        | -        |
| Search (sorted)      | O(log n)       | -        | -        | -        | -        |
| Contains             | O(n)           | O(1) avg | O(log n) | O(1) avg | O(log n) |

### Memory Overhead

Collections also differ in their memory overhead:

- **Vec<T>**: Low overhead, just a pointer, length, and capacity
- **HashMap<K, V>**: Higher overhead due to hash buckets and load factor
- **BTreeMap<K, V>**: Moderate overhead due to tree structure
- **HashSet<T>**: Similar to HashMap
- **BTreeSet<T>**: Similar to BTreeMap

### Allocation Patterns

Collections have different allocation patterns:

- **Vec<T>**: Single contiguous allocation, grows exponentially
- **HashMap<K, V>**: Hash buckets with separate allocations for entries
- **BTreeMap<K, V>**: Multiple node allocations forming a tree structure
- **HashSet<T>**: Similar to HashMap
- **BTreeSet<T>**: Similar to BTreeMap

### Cache Efficiency

The memory layout affects cache efficiency:

- **Vec<T>**: Excellent cache locality for iteration
- **HashMap<K, V>**: Poor cache locality due to scattered entries
- **BTreeMap<K, V>**: Moderate cache locality, better than HashMap
- **HashSet<T>**: Similar to HashMap
- **BTreeSet<T>**: Similar to BTreeMap

## Specialized Collections

Beyond the standard collections, Rust provides several specialized collections for specific use cases.

### VecDeque<T>

`VecDeque<T>` is a double-ended queue implemented as a ring buffer, allowing efficient insertion and removal at both ends:

```rust
use std::collections::VecDeque;

let mut queue = VecDeque::new();

// Add elements at both ends
queue.push_back(1);
queue.push_back(2);
queue.push_front(0);  // Now [0, 1, 2]

// Remove elements from both ends
let first = queue.pop_front();  // Some(0)
let last = queue.pop_back();    // Some(2)

// Other operations similar to Vec
queue.insert(1, 5);  // Insert at index 1
let element = queue.remove(0);  // Remove at index 0
```

Use `VecDeque` when you need a queue (FIFO) or deque (double-ended queue) data structure.

### BinaryHeap<T>

`BinaryHeap<T>` is a priority queue implemented as a max-heap, where the largest element is always at the front:

```rust
use std::collections::BinaryHeap;

let mut heap = BinaryHeap::new();

// Add elements
heap.push(1);
heap.push(5);
heap.push(2);

// Get the largest element (without removing)
if let Some(largest) = heap.peek() {
    println!("Largest element: {}", largest);  // 5
}

// Remove and return the largest element
let largest = heap.pop();  // Some(5)

// Convert to a sorted vector (in ascending order)
let sorted: Vec<_> = heap.into_sorted_vec();  // [1, 2]
```

Use `BinaryHeap` when you need to efficiently find and remove the largest element, such as in priority queues and certain graph algorithms.

### LinkedList<T>

`LinkedList<T>` is a doubly-linked list that allows O(1) insertion and removal at any position (given an iterator to that position):

```rust
use std::collections::LinkedList;

let mut list = LinkedList::new();

// Add elements
list.push_back(1);
list.push_back(2);
list.push_front(0);  // Now [0, 1, 2]

// Get an iterator to the second element
let mut cursor = list.cursor_front_mut();
cursor.move_next();  // Move to the first element
cursor.move_next();  // Move to the second element

// Insert an element after the cursor
cursor.insert_after(1.5);  // Now [0, 1, 1.5, 2]

// Remove the element at the cursor
cursor.remove_current();  // Now [0, 1, 2]
```

Use `LinkedList` sparingly, as it has poor cache locality and is rarely the best choice in practice. Vector or VecDeque are often better alternatives.

### IndexMap<K, V> and IndexSet<T>

The `indexmap` crate provides `IndexMap<K, V>` and `IndexSet<T>`, which maintain insertion order while offering near-HashMap performance:

```rust
use indexmap::IndexMap;

let mut map = IndexMap::new();
map.insert("a", 1);
map.insert("b", 2);
map.insert("c", 3);

// Elements are iterated in insertion order
for (key, value) in &map {
    println!("{}: {}", key, value);  // Prints: a: 1, b: 2, c: 3
}

// Access by index
if let Some((key, value)) = map.get_index(1) {
    println!("Second element: {}: {}", key, value);  // b: 2
}
```

Use `IndexMap` when you need a hash map that maintains insertion order.

## Choosing the Right Collection

Selecting the appropriate collection for your specific use case is critical for both correctness and performance.

### Decision Factors

Consider these factors when choosing a collection:

1. **Access Pattern**: How will you access the data? By index, key, or iteration?
2. **Insertion/Removal Pattern**: Where and how often will you add or remove elements?
3. **Ordering Requirements**: Do you need elements to be sorted or maintain insertion order?
4. **Memory Constraints**: Is memory usage a concern?
5. **Performance Requirements**: Which operations need to be fast?
6. **Element Uniqueness**: Do you need to ensure elements are unique?
7. **Special Operations**: Do you need range queries, priority access, or other specialized operations?

### Common Use Cases

Here are some common use cases and recommended collections:

| Use Case               | Recommended Collections                  |
| ---------------------- | ---------------------------------------- |
| Simple list of items   | `Vec<T>`                                 |
| Queue (FIFO)           | `VecDeque<T>`                            |
| Stack (LIFO)           | `Vec<T>`                                 |
| Priority queue         | `BinaryHeap<T>`                          |
| Lookup by key          | `HashMap<K, V>`                          |
| Sorted key-value store | `BTreeMap<K, V>`                         |
| Unique elements        | `HashSet<T>`                             |
| Sorted unique elements | `BTreeSet<T>`                            |
| Insertion-order map    | `IndexMap<K, V>` (from `indexmap` crate) |
| Graph structure        | Custom or use a graph library            |
| Sparse data            | Custom or specialized collections        |

### Collection Selection Flowchart

Here's a simplified decision flowchart:

1. Do you need to associate values with keys?

   - Yes: Go to 2
   - No: Go to 5

2. Do you need sorted keys or range operations?

   - Yes: Use `BTreeMap<K, V>`
   - No: Go to 3

3. Do you need to maintain insertion order?

   - Yes: Use `IndexMap<K, V>` (from `indexmap` crate)
   - No: Go to 4

4. Do you need fast lookups?

   - Yes: Use `HashMap<K, V>`
   - No: Consider if a map is actually needed

5. Do you need unique elements?

   - Yes: Go to 6
   - No: Go to 8

6. Do you need sorted elements or range operations?

   - Yes: Use `BTreeSet<T>`
   - No: Go to 7

7. Do you need fast lookups?

   - Yes: Use `HashSet<T>`
   - No: Consider if a set is actually needed

8. Do you need fast insertions/removals at both ends?

   - Yes: Use `VecDeque<T>`
   - No: Go to 9

9. Do you need to frequently find the largest element?

   - Yes: Use `BinaryHeap<T>`
   - No: Go to 10

10. Default choice: Use `Vec<T>` unless you have a specific reason not to

## Custom Data Structures

While Rust's standard library provides many useful collections, sometimes you need to create your own data structures to meet specific requirements.

### Implementing a Custom Collection

Let's implement a simple fixed-size ring buffer as an example:

```rust
pub struct RingBuffer<T> {
    buffer: Vec<Option<T>>,
    capacity: usize,
    start: usize,
    size: usize,
}

impl<T> RingBuffer<T> {
    pub fn new(capacity: usize) -> Self {
        let mut buffer = Vec::with_capacity(capacity);
        for _ in 0..capacity {
            buffer.push(None);
        }
        RingBuffer {
            buffer,
            capacity,
            start: 0,
            size: 0,
        }
    }

    pub fn push(&mut self, item: T) {
        let index = (self.start + self.size) % self.capacity;
        self.buffer[index] = Some(item);

        if self.size < self.capacity {
            self.size += 1;
        } else {
            // Buffer is full, overwrite oldest item
            self.start = (self.start + 1) % self.capacity;
        }
    }

    pub fn pop(&mut self) -> Option<T> {
        if self.size == 0 {
            return None;
        }

        let item = self.buffer[self.start].take();
        self.start = (self.start + 1) % self.capacity;
        self.size -= 1;
        item
    }

    pub fn is_empty(&self) -> bool {
        self.size == 0
    }

    pub fn is_full(&self) -> bool {
        self.size == self.capacity
    }

    pub fn len(&self) -> usize {
        self.size
    }

    pub fn capacity(&self) -> usize {
        self.capacity
    }
}

// Optionally implement common traits
impl<T: std::fmt::Debug> std::fmt::Debug for RingBuffer<T> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "RingBuffer {{ ")?;
        for i in 0..self.size {
            let index = (self.start + i) % self.capacity;
            write!(f, "{:?}, ", self.buffer[index])?;
        }
        write!(f, "}}")
    }
}
```

### Using Type-Based Design

When designing custom data structures, consider Rust's type system:

```rust
// Using newtypes for type safety
struct UserId(u64);
struct UserName(String);

// Using enums for state machines
enum ConnectionState {
    Disconnected,
    Connecting { attempt: u32 },
    Connected { since: std::time::Instant },
    Failed { error: String },
}

// Using generics for flexibility
struct Cache<K, V, S = std::collections::hash_map::RandomState> {
    map: HashMap<K, (V, std::time::Instant), S>,
    ttl: std::time::Duration,
}
```

### Implementing Iterator Traits

Make your custom collections iterable by implementing the `Iterator` trait:

```rust
impl<T> RingBuffer<T> {
    pub fn iter(&self) -> RingBufferIter<'_, T> {
        RingBufferIter {
            buffer: &self.buffer,
            start: self.start,
            size: self.size,
            capacity: self.capacity,
            position: 0,
        }
    }
}

pub struct RingBufferIter<'a, T> {
    buffer: &'a Vec<Option<T>>,
    start: usize,
    size: usize,
    capacity: usize,
    position: usize,
}

impl<'a, T> Iterator for RingBufferIter<'a, T> {
    type Item = &'a T;

    fn next(&mut self) -> Option<Self::Item> {
        if self.position >= self.size {
            return None;
        }

        let index = (self.start + self.position) % self.capacity;
        self.position += 1;

        // We know the element exists because we're iterating within size
        if let Some(item) = &self.buffer[index] {
            Some(item)
        } else {
            unreachable!("Element should exist")
        }
    }
}
```

## Common Collection Algorithms

Rust's standard library provides many algorithms for working with collections. Let's explore some common patterns:

### Transforming Collections

Transforming one collection type into another:

```rust
// Vec to HashSet (removing duplicates)
let vec = vec![1, 2, 2, 3, 4, 4, 5];
let set: HashSet<_> = vec.into_iter().collect();
assert_eq!(set.len(), 5);

// HashSet to Vec
let set: HashSet<_> = [1, 2, 3, 4, 5].iter().cloned().collect();
let vec: Vec<_> = set.into_iter().collect();
assert_eq!(vec.len(), 5);

// HashMap to Vec of tuples
let mut map = HashMap::new();
map.insert("a", 1);
map.insert("b", 2);
let vec: Vec<_> = map.into_iter().collect();
assert_eq!(vec.len(), 2);

// Vec of tuples to HashMap
let vec = vec![("a", 1), ("b", 2)];
let map: HashMap<_, _> = vec.into_iter().collect();
assert_eq!(map.len(), 2);
```

### Filtering and Mapping

Combining iterator operations for powerful transformations:

```rust
let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Filter and map in one pass
let even_squares: Vec<_> = numbers.iter()
    .filter(|&n| n % 2 == 0)
    .map(|&n| n * n)
    .collect();
assert_eq!(even_squares, vec![4, 16, 36, 64, 100]);

// Using flat_map to combine results
let nested = vec![vec![1, 2, 3], vec![4, 5], vec![6, 7, 8, 9]];
let flattened: Vec<_> = nested.iter()
    .flat_map(|v| v.iter())
    .collect();
assert_eq!(flattened.len(), 9);

// Using partition to split a collection
let (even, odd): (Vec<_>, Vec<_>) = numbers.iter()
    .partition(|&&n| n % 2 == 0);
assert_eq!(even, vec![&2, &4, &6, &8, &10]);
assert_eq!(odd, vec![&1, &3, &5, &7, &9]);
```

### Aggregating and Folding

Using reduction operations to compute aggregates:

```rust
let numbers = vec![1, 2, 3, 4, 5];

// Sum
let sum: i32 = numbers.iter().sum();
assert_eq!(sum, 15);

// Product
let product: i32 = numbers.iter().product();
assert_eq!(product, 120);

// Custom aggregation with fold
let sum_of_squares = numbers.iter()
    .fold(0, |acc, &x| acc + x * x);
assert_eq!(sum_of_squares, 55);

// Running total with scan
let running_total: Vec<_> = numbers.iter()
    .scan(0, |state, &x| {
        *state += x;
        Some(*state)
    })
    .collect();
assert_eq!(running_total, vec![1, 3, 6, 10, 15]);
```

### Sorting and Searching

Advanced sorting and searching techniques:

```rust
let mut numbers = vec![3, 1, 4, 1, 5, 9, 2, 6];

// Sorting with custom comparator
numbers.sort_by(|a, b| b.cmp(a));  // Descending order
assert_eq!(numbers, vec![9, 6, 5, 4, 3, 2, 1, 1]);

// Partial sorting (k smallest elements)
let mut numbers = vec![3, 1, 4, 1, 5, 9, 2, 6];
numbers.sort_unstable();
let k_smallest = &numbers[0..3];
assert_eq!(k_smallest, [1, 1, 2]);

// Binary search on sorted data
let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9];
match numbers.binary_search(&5) {
    Ok(index) => println!("Found at index {}", index),
    Err(index) => println!("Not found, would be inserted at index {}", index),
}

// Finding min/max elements
let min = numbers.iter().min();
let max = numbers.iter().max();
assert_eq!(min, Some(&1));
assert_eq!(max, Some(&9));
```

## Project: Data Analysis Tool

Let's build a simple data analysis tool that demonstrates how to use collections effectively. This tool will process and analyze a dataset of sales records.

### Step 1: Define Data Structures

```rust
use std::collections::{HashMap, HashSet, BTreeMap};
use std::error::Error;
use std::fs::File;
use std::io::{self, BufRead, BufReader};
use std::path::Path;

// Represent a sales record
#[derive(Debug, Clone)]
struct SalesRecord {
    id: u32,
    product: String,
    category: String,
    price: f64,
    quantity: u32,
    date: String,
    region: String,
}

// Represent aggregated sales statistics
struct SalesSummary {
    total_revenue: f64,
    total_units: u32,
    avg_price: f64,
    top_products: Vec<(String, f64)>,
    revenue_by_category: HashMap<String, f64>,
    revenue_by_region: HashMap<String, f64>,
    revenue_by_month: BTreeMap<String, f64>,
}
```

### Step 2: Implement Data Loading

```rust
impl SalesRecord {
    // Parse a CSV line into a SalesRecord
    fn from_csv(line: &str) -> Result<Self, Box<dyn Error>> {
        let fields: Vec<&str> = line.split(',').collect();

        if fields.len() != 7 {
            return Err("Invalid number of fields".into());
        }

        Ok(SalesRecord {
            id: fields[0].parse()?,
            product: fields[1].to_string(),
            category: fields[2].to_string(),
            price: fields[3].parse()?,
            quantity: fields[4].parse()?,
            date: fields[5].to_string(),
            region: fields[6].to_string(),
        })
    }
}

// Load sales data from a CSV file
fn load_sales_data<P: AsRef<Path>>(path: P) -> Result<Vec<SalesRecord>, Box<dyn Error>> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);
    let mut records = Vec::new();

    // Skip header line
    for line in reader.lines().skip(1) {
        let line = line?;
        match SalesRecord::from_csv(&line) {
            Ok(record) => records.push(record),
            Err(e) => eprintln!("Error parsing record: {}", e),
        }
    }

    Ok(records)
}
```

### Step 3: Analyze Data

```rust
// Analyze sales data and generate summary
fn analyze_sales(records: &[SalesRecord]) -> SalesSummary {
    // Calculate total revenue and units
    let total_revenue: f64 = records.iter()
        .map(|r| r.price * r.quantity as f64)
        .sum();

    let total_units: u32 = records.iter()
        .map(|r| r.quantity)
        .sum();

    // Calculate average price
    let avg_price = if !records.is_empty() {
        total_revenue / total_units as f64
    } else {
        0.0
    };

    // Group revenue by product
    let mut product_revenue: HashMap<String, f64> = HashMap::new();
    for record in records {
        let revenue = record.price * record.quantity as f64;
        *product_revenue.entry(record.product.clone()).or_insert(0.0) += revenue;
    }

    // Find top 5 products by revenue
    let mut products: Vec<(String, f64)> = product_revenue.into_iter().collect();
    products.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let top_products = products.into_iter().take(5).collect();

    // Group revenue by category
    let mut revenue_by_category: HashMap<String, f64> = HashMap::new();
    for record in records {
        let revenue = record.price * record.quantity as f64;
        *revenue_by_category.entry(record.category.clone()).or_insert(0.0) += revenue;
    }

    // Group revenue by region
    let mut revenue_by_region: HashMap<String, f64> = HashMap::new();
    for record in records {
        let revenue = record.price * record.quantity as f64;
        *revenue_by_region.entry(record.region.clone()).or_insert(0.0) += revenue;
    }

    // Extract month from date and group revenue by month
    let mut revenue_by_month: BTreeMap<String, f64> = BTreeMap::new();
    for record in records {
        // Assuming date format is YYYY-MM-DD
        if record.date.len() >= 7 {
            let month = record.date[0..7].to_string(); // YYYY-MM
            let revenue = record.price * record.quantity as f64;
            *revenue_by_month.entry(month).or_insert(0.0) += revenue;
        }
    }

    SalesSummary {
        total_revenue,
        total_units,
        avg_price,
        top_products,
        revenue_by_category,
        revenue_by_region,
        revenue_by_month,
    }
}
```

### Step 4: Implement Analysis Features

```rust
impl SalesSummary {
    // Print summary statistics
    fn print_summary(&self) {
        println!("=== Sales Summary ===");
        println!("Total Revenue: ${:.2}", self.total_revenue);
        println!("Total Units Sold: {}", self.total_units);
        println!("Average Price: ${:.2}", self.avg_price);

        println!("\n=== Top 5 Products by Revenue ===");
        for (i, (product, revenue)) in self.top_products.iter().enumerate() {
            println!("{}. {} - ${:.2}", i + 1, product, revenue);
        }

        println!("\n=== Revenue by Category ===");
        let mut categories: Vec<(&String, &f64)> = self.revenue_by_category.iter().collect();
        categories.sort_by(|a, b| b.1.partial_cmp(a.1).unwrap_or(std::cmp::Ordering::Equal));
        for (category, revenue) in categories {
            println!("{}: ${:.2}", category, revenue);
        }

        println!("\n=== Revenue by Region ===");
        let mut regions: Vec<(&String, &f64)> = self.revenue_by_region.iter().collect();
        regions.sort_by(|a, b| b.1.partial_cmp(a.1).unwrap_or(std::cmp::Ordering::Equal));
        for (region, revenue) in regions {
            println!("{}: ${:.2}", region, revenue);
        }

        println!("\n=== Monthly Revenue Trend ===");
        for (month, revenue) in &self.revenue_by_month {
            println!("{}: ${:.2}", month, revenue);
        }
    }

    // Find products that appear in multiple categories
    fn find_cross_category_products(&self, records: &[SalesRecord]) -> HashSet<String> {
        let mut product_categories: HashMap<String, HashSet<String>> = HashMap::new();

        for record in records {
            product_categories
                .entry(record.product.clone())
                .or_insert_with(HashSet::new)
                .insert(record.category.clone());
        }

        product_categories.into_iter()
            .filter(|(_, categories)| categories.len() > 1)
            .map(|(product, _)| product)
            .collect()
    }

    // Calculate month-over-month growth
    fn calculate_monthly_growth(&self) -> BTreeMap<String, f64> {
        let mut growth: BTreeMap<String, f64> = BTreeMap::new();
        let mut prev_revenue = 0.0;
        let mut prev_month = String::new();

        for (month, &revenue) in &self.revenue_by_month {
            if !prev_month.is_empty() {
                let growth_rate = if prev_revenue > 0.0 {
                    (revenue - prev_revenue) / prev_revenue * 100.0
                } else {
                    0.0
                };
                growth.insert(month.clone(), growth_rate);
            }
            prev_month = month.clone();
            prev_revenue = revenue;
        }

        growth
    }
}
```

### Step 5: Main Function

```rust
fn main() -> Result<(), Box<dyn Error>> {
    // In a real application, you would read this path from arguments
    let path = "sales_data.csv";

    println!("Loading sales data from {}...", path);
    let records = match load_sales_data(path) {
        Ok(data) => data,
        Err(e) => {
            eprintln!("Error loading data: {}", e);
            return Err(e);
        }
    };

    println!("Loaded {} sales records", records.len());

    // Analyze the data
    let summary = analyze_sales(&records);

    // Print the summary
    summary.print_summary();

    // Find cross-category products
    let cross_category = summary.find_cross_category_products(&records);
    println!("\n=== Products in Multiple Categories ===");
    for product in cross_category {
        println!("{}", product);
    }

    // Calculate and print monthly growth
    let monthly_growth = summary.calculate_monthly_growth();
    println!("\n=== Monthly Growth Rates ===");
    for (month, growth) in monthly_growth {
        println!("{}: {:.2}%", month, growth);
    }

    Ok(())
}
```

This project demonstrates:

1. Using multiple collection types (`Vec`, `HashMap`, `HashSet`, `BTreeMap`) for different purposes
2. Transforming and aggregating data using iterators
3. Sorting and filtering collections
4. Using collections to build relationships between data
5. Implementing efficient data analysis algorithms

In a real-world scenario, you might extend this to include more advanced features like:

- Reading and writing data in different formats
- Interactive queries and filtering
- Visualization of results
- Performance optimizations for large datasets
- Concurrent processing of data

## Summary

In this chapter, we've explored Rust's powerful collection types and how to use them effectively:

- We learned about `Vec<T>` and how to work with dynamic arrays
- We explored the various ways to iterate over, grow, and shrink vectors
- We covered common vector operations for manipulating data
- We studied `HashMap` and `BTreeMap` for key-value storage
- We learned how to work with hash maps efficiently
- We examined `HashSet` and `BTreeSet` for storing unique elements
- We compared the performance characteristics of different collections
- We investigated specialized collections for specific use cases
- We discussed how to choose the right collection for different scenarios
- We implemented custom data structures in Rust
- We applied common collection algorithms for data manipulation
- We built a data analysis tool that demonstrates these concepts in practice

Understanding collections is essential for writing efficient Rust programs. The right collection can make your code cleaner, faster, and more maintainable. As you continue your Rust journey, you'll discover that mastering collections and their algorithms is one of the most valuable skills you can develop.

## Exercises

1. Implement a `Stack<T>` data structure using `Vec<T>` as the underlying storage.

2. Create a function that finds the frequency of each word in a text file and returns the top N most common words.

3. Implement a simple cache with a least-recently-used (LRU) eviction policy using `HashMap` and `VecDeque`.

4. Write a function that merges two sorted vectors into a single sorted vector in O(n) time.

5. Implement a graph data structure using adjacency lists with `HashMap` and `Vec`.

6. Create a function that groups a collection of items by a key function and returns a `HashMap` of the groups.

7. Implement a simple in-memory database that supports indexing by multiple fields.

8. Extend the data analysis project to include more advanced analytics like correlation between price and quantity.

## Further Reading

- [Rust Standard Library Documentation: Collections](https://doc.rust-lang.org/std/collections/index.html)
- [The Rust Performance Book](https://nnethercote.github.io/perf-book/)
- [Programming Rust: Fast, Safe Systems Development](https://www.oreilly.com/library/view/programming-rust-2nd/9781492052586/)
- [Rust By Example: Collections](https://doc.rust-lang.org/rust-by-example/std/vec.html)
- [The `indexmap` crate](https://crates.io/crates/indexmap)
- [Data Structures and Algorithms in Rust](https://github.com/PacktPublishing/Hands-On-Data-Structures-and-Algorithms-with-Rust)
- [The `itertools` crate](https://crates.io/crates/itertools) for advanced iterator operations
 