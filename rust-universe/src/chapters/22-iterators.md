# Chapter 22: Iterators and Functional Programming

## Introduction

Rust's iterators are one of the language's most powerful features, enabling expressive, efficient, and composable data processing. Combined with Rust's functional programming capabilities, iterators allow you to write code that is both concise and performant.

In previous chapters, we've used iterators for tasks like processing collections and transforming data. In this chapter, we'll take a comprehensive look at Rust's iterator system, exploring how it enables functional programming patterns while maintaining Rust's zero-cost abstraction philosophy.

By the end of this chapter, you'll understand how to use and create iterators, how to compose functional pipelines, and how to leverage these abstractions for both clarity and performance. You'll learn why iterator-based code in Rust often outperforms traditional imperative loops and how to harness this power in your own applications.

## The Iterator Trait

At the heart of Rust's iterator system is the `Iterator` trait, defined in the standard library. This trait represents a sequence of values that can be processed one at a time.

### Understanding the Iterator Trait

The core of the `Iterator` trait is remarkably simple:

```rust
pub trait Iterator {
    type Item;

    fn next(&mut self) -> Option<Self::Item>;

    // Many default methods provided...
}
```

Let's break this down:

1. `type Item` is an associated type that specifies what kind of values the iterator produces.
2. `next()` is the only method you must implement, which returns `Some(item)` for the next value or `None` when there are no more values.

The beauty of this design is that once you implement `next()`, you get access to a wealth of default methods that build on this core functionality.

### Basic Iterator Usage

Let's start with a simple example: iterating over a vector.

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // Create an iterator from the vector
    let mut iter = numbers.iter();

    // Manually call next() to get each value
    assert_eq!(iter.next(), Some(&1));
    assert_eq!(iter.next(), Some(&2));
    assert_eq!(iter.next(), Some(&3));
    assert_eq!(iter.next(), Some(&4));
    assert_eq!(iter.next(), Some(&5));
    assert_eq!(iter.next(), None); // No more values
}
```

Notice that `iter()` produces an iterator over references (`&T`) to the values in the vector. This is non-destructive, allowing you to continue using the original collection.

If you want to take ownership of the values, you can use `into_iter()`:

```rust
let numbers = vec![1, 2, 3, 4, 5];
let mut iter = numbers.into_iter(); // Takes ownership of numbers

assert_eq!(iter.next(), Some(1)); // Note: not &1 but 1
// numbers is no longer accessible here
```

And if you want mutable references, you can use `iter_mut()`:

```rust
let mut numbers = vec![1, 2, 3, 4, 5];
let mut iter = numbers.iter_mut();

if let Some(first) = iter.next() {
    *first += 10; // Modify the value through the mutable reference
}

assert_eq!(numbers[0], 11); // The vector was modified
```

### For Loops and Iterators

The most common way to use iterators is with a `for` loop, which automatically calls `into_iter()` on the collection and iterates until `None` is returned:

```rust
let numbers = vec![1, 2, 3, 4, 5];

for number in numbers {
    println!("{}", number);
}
// numbers is consumed here

// Alternatively, to keep the original collection:
let numbers = vec![1, 2, 3, 4, 5];
for number in &numbers {
    println!("{}", number);
}
// numbers is still usable here
```

Behind the scenes, a `for` loop is syntactic sugar for roughly the following:

```rust
let numbers = vec![1, 2, 3, 4, 5];
let mut iter = numbers.into_iter();

while let Some(number) = iter.next() {
    println!("{}", number);
}
```

This relationship between `for` loops and iterators is why Rust can provide a unified interface for iterating over many different types of collections and sequences.

## Common Iterator Methods

The `Iterator` trait comes with a rich set of default methods that build on `next()`. Let's explore some of the most useful ones.

### Map, Filter, and Fold

These three methods form the foundation of functional programming with iterators:

#### Map: Transforming Values

The `map` method transforms each element in an iterator:

```rust
let numbers = vec![1, 2, 3, 4, 5];
let squares: Vec<_> = numbers.iter()
    .map(|n| n * n)
    .collect();

assert_eq!(squares, vec![1, 4, 9, 16, 25]);
```

Here, `map` takes a closure that squares each number, creating an iterator that yields the squared values. The `collect()` method then gathers these values into a new vector.

#### Filter: Selecting Values

The `filter` method selects elements based on a predicate:

```rust
let numbers = vec![1, 2, 3, 4, 5, 6];
let even_numbers: Vec<_> = numbers.iter()
    .filter(|n| *n % 2 == 0)
    .copied() // Convert &i32 to i32
    .collect();

assert_eq!(even_numbers, vec![2, 4, 6]);
```

The `filter` method takes a closure that returns a boolean. Only elements for which the closure returns `true` are included in the resulting iterator.

#### Fold: Accumulating Values

The `fold` method reduces an iterator to a single value by accumulating:

```rust
let numbers = vec![1, 2, 3, 4, 5];
let sum = numbers.iter().fold(0, |acc, &n| acc + n);

assert_eq!(sum, 15);
```

The `fold` method takes an initial value and a closure. The closure receives the accumulator and the current element, and returns the new accumulator value. This pattern is also known as "reduce" in other languages.

### Chaining Operations

One of the most powerful aspects of iterators is the ability to chain operations, creating a pipeline of transformations:

```rust
let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

let sum_of_even_squares: i32 = numbers.iter()
    .filter(|&&n| n % 2 == 0)     // Keep only even numbers
    .map(|&n| n * n)              // Square each number
    .sum();                       // Sum the results

assert_eq!(sum_of_even_squares, 220); // 2² + 4² + 6² + 8² + 10² = 4 + 16 + 36 + 64 + 100 = 220
```

This code is both concise and expressive. It clearly communicates the intent: filter for even numbers, square them, and sum the results.

### Other Useful Iterator Methods

The `Iterator` trait provides many more useful methods. Here are some you'll use frequently:

#### Collecting Results

The `collect` method gathers the results of an iterator into a collection:

```rust
let numbers = vec![1, 2, 3, 4, 5];
let doubled: Vec<_> = numbers.iter()
    .map(|&n| n * 2)
    .collect();

assert_eq!(doubled, vec![2, 4, 6, 8, 10]);
```

The `collect` method can convert an iterator into any collection that implements `FromIterator`, including `Vec`, `HashSet`, `HashMap`, and others.

#### Finding Elements

The `find` method returns the first element that matches a predicate:

```rust
let numbers = vec![1, 2, 3, 4, 5];
let first_even = numbers.iter().find(|&&n| n % 2 == 0);

assert_eq!(first_even, Some(&2));
```

#### Taking and Skipping

The `take` and `skip` methods allow you to work with portions of an iterator:

```rust
let numbers = vec![1, 2, 3, 4, 5];
let first_three: Vec<_> = numbers.iter().take(3).copied().collect();
let last_two: Vec<_> = numbers.iter().skip(3).copied().collect();

assert_eq!(first_three, vec![1, 2, 3]);
assert_eq!(last_two, vec![4, 5]);
```

#### All and Any

The `all` and `any` methods check conditions across an iterator:

```rust
let numbers = vec![2, 4, 6, 8, 10];
let all_even = numbers.iter().all(|&n| n % 2 == 0);
let any_greater_than_5 = numbers.iter().any(|&n| n > 5);

assert!(all_even);
assert!(any_greater_than_5);
```

#### Count and Sum

The `count` and `sum` methods compute the length and sum of an iterator:

```rust
let numbers = vec![1, 2, 3, 4, 5];
let count = numbers.iter().count();
let sum: i32 = numbers.iter().sum();

assert_eq!(count, 5);
assert_eq!(sum, 15);
```

#### Min and Max

The `min` and `max` methods find the minimum and maximum values:

```rust
let numbers = vec![5, 2, 8, 1, 9];
let min = numbers.iter().min();
let max = numbers.iter().max();

assert_eq!(min, Some(&1));
assert_eq!(max, Some(&9));
```

#### Enumerate

The `enumerate` method pairs each element with its index:

```rust
let letters = vec!['a', 'b', 'c'];
let with_indices: Vec<_> = letters.iter()
    .enumerate()
    .map(|(i, &c)| format!("{}: {}", i, c))
    .collect();

assert_eq!(with_indices, vec!["0: a", "1: b", "2: c"]);
```

#### Zip

The `zip` method combines two iterators into one iterator of pairs:

```rust
let names = vec!["Alice", "Bob", "Charlie"];
let ages = vec![30, 25, 35];

let people: Vec<_> = names.iter()
    .zip(ages.iter())
    .map(|(&name, &age)| format!("{} is {} years old", name, age))
    .collect();

assert_eq!(people, vec![
    "Alice is 30 years old",
    "Bob is 25 years old",
    "Charlie is 35 years old"
]);
```

## Consuming vs. Non-Consuming Adapters

Iterator methods can be categorized as either consuming or non-consuming adapters, based on how they interact with the iterator.

### Consuming Adapters

Consuming adapters are methods that use up the iterator. Once called, you can no longer use the iterator. Examples include:

- `count`: Returns the number of elements
- `sum`: Calculates the sum of elements
- `collect`: Gathers elements into a collection
- `fold`: Reduces the iterator to a single value
- `for_each`: Applies a function to each element

```rust
let numbers = vec![1, 2, 3, 4, 5];
let sum: i32 = numbers.iter().sum();
// The iterator is consumed after sum()
```

### Non-Consuming Adapters

Non-consuming adapters transform an iterator into another iterator, allowing further chaining. Examples include:

- `map`: Transforms each element
- `filter`: Selects elements based on a predicate
- `take`: Limits the number of elements
- `skip`: Skips a number of elements
- `chain`: Combines two iterators

```rust
let numbers = vec![1, 2, 3, 4, 5];
let iter = numbers.iter()
    .map(|&n| n * 2)
    .filter(|&n| n > 5);
// The iterator isn't consumed yet; we can still use it
```

### Lazy Evaluation

An important characteristic of non-consuming adapters is that they're lazy—they don't do any work until a consuming adapter is called. This allows for efficient processing of potentially large sequences:

```rust
let numbers = vec![1, 2, 3, 4, 5];

// These transformations don't actually do anything yet
let iter = numbers.iter()
    .map(|&n| {
        println!("Mapping {}", n);
        n * 2
    })
    .filter(|&n| {
        println!("Filtering {}", n);
        n > 5
    });

// Only when we call a consuming adapter like collect()
// do the map and filter operations actually run
let result: Vec<_> = iter.collect();

// Output:
// Mapping 1
// Filtering 2
// Mapping 2
// Filtering 4
// Mapping 3
// Filtering 6
// Mapping 4
// Filtering 8
// Mapping 5
// Filtering 10
```

Notice that the `map` and `filter` operations are interleaved, not run as separate passes over the data. This is more efficient because it avoids creating intermediate collections.

## Building Custom Iterators

So far, we've used iterators provided by standard library collections. Now, let's explore how to create our own iterators.

### Implementing the Iterator Trait

To create a custom iterator, you need to implement the `Iterator` trait. Let's create a simple iterator that yields the Fibonacci sequence:

```rust
struct Fibonacci {
    current: u64,
    next: u64,
}

impl Fibonacci {
    fn new() -> Self {
        Fibonacci { current: 0, next: 1 }
    }
}

impl Iterator for Fibonacci {
    type Item = u64;

    fn next(&mut self) -> Option<Self::Item> {
        let current = self.current;

        self.current = self.next;
        self.next = current + self.next;

        Some(current)
    }
}

// Usage
fn main() {
    let fib = Fibonacci::new();

    // Take the first 10 Fibonacci numbers
    let first_10: Vec<u64> = fib.take(10).collect();

    assert_eq!(first_10, vec![0, 1, 1, 2, 3, 5, 8, 13, 21, 34]);
}
```

This iterator generates an infinite sequence (it always returns `Some`), but we can limit it using `take()`.

### Creating Iterators from Existing Data

Often, you'll want to create an iterator that processes an existing data structure. Let's implement an iterator for a simple binary tree:

```rust
#[derive(Debug)]
enum BinaryTree<T> {
    Empty,
    NonEmpty(Box<TreeNode<T>>),
}

#[derive(Debug)]
struct TreeNode<T> {
    value: T,
    left: BinaryTree<T>,
    right: BinaryTree<T>,
}

// An in-order iterator for the binary tree
struct InOrderIterator<'a, T> {
    stack: Vec<&'a TreeNode<T>>,
    current: Option<&'a TreeNode<T>>,
}

impl<T> BinaryTree<T> {
    // Create a new in-order iterator
    fn in_order_iter(&self) -> InOrderIterator<'_, T> {
        let mut iter = InOrderIterator {
            stack: Vec::new(),
            current: match self {
                BinaryTree::Empty => None,
                BinaryTree::NonEmpty(node) => Some(node),
            },
        };

        iter
    }
}

impl<'a, T> Iterator for InOrderIterator<'a, T> {
    type Item = &'a T;

    fn next(&mut self) -> Option<Self::Item> {
        // First, traverse as far left as possible
        while let Some(node) = self.current {
            self.stack.push(node);

            match &node.left {
                BinaryTree::Empty => {
                    self.current = None;
                }
                BinaryTree::NonEmpty(left_node) => {
                    self.current = Some(left_node);
                }
            }
        }

        // Then pop a node and process it
        if let Some(node) = self.stack.pop() {
            // Set current to the right child for the next iteration
            self.current = match &node.right {
                BinaryTree::Empty => None,
                BinaryTree::NonEmpty(right_node) => Some(right_node),
            };

            // Return the value of the popped node
            return Some(&node.value);
        }

        None
    }
}

// Usage
fn main() {
    // Create a sample tree
    //      2
    //     / \
    //    1   3
    let tree = BinaryTree::NonEmpty(Box::new(TreeNode {
        value: 2,
        left: BinaryTree::NonEmpty(Box::new(TreeNode {
            value: 1,
            left: BinaryTree::Empty,
            right: BinaryTree::Empty,
        })),
        right: BinaryTree::NonEmpty(Box::new(TreeNode {
            value: 3,
            left: BinaryTree::Empty,
            right: BinaryTree::Empty,
        })),
    }));

    // Collect values using in-order traversal
    let values: Vec<&i32> = tree.in_order_iter().collect();

    assert_eq!(values, vec![&1, &2, &3]);
}
```

This example implements an in-order traversal iterator for a binary tree, which visits the left subtree, then the current node, then the right subtree.

### Iterator Adaptors

You can also create new iterators by adapting existing ones. Let's implement a `Chunks` iterator that groups elements:

```rust
struct Chunks<I: Iterator> {
    iterator: I,
    chunk_size: usize,
}

impl<I: Iterator> Chunks<I> {
    fn new(iterator: I, chunk_size: usize) -> Self {
        assert!(chunk_size > 0, "Chunk size must be positive");
        Chunks { iterator, chunk_size }
    }
}

impl<I: Iterator> Iterator for Chunks<I> {
    type Item = Vec<I::Item>;

    fn next(&mut self) -> Option<Self::Item> {
        let mut chunk = Vec::with_capacity(self.chunk_size);

        for _ in 0..self.chunk_size {
            match self.iterator.next() {
                Some(item) => chunk.push(item),
                None => break,
            }
        }

        if chunk.is_empty() {
            None
        } else {
            Some(chunk)
        }
    }
}

// Usage
fn main() {
    let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    let chunks: Vec<Vec<i32>> = Chunks::new(numbers.into_iter(), 3).collect();

    assert_eq!(chunks, vec![
        vec![1, 2, 3],
        vec![4, 5, 6],
        vec![7, 8, 9],
        vec![10],
    ]);
}
```

This `Chunks` iterator takes another iterator and groups its elements into chunks of a specified size.

## The IntoIterator Trait

Now that we've explored the `Iterator` trait, let's look at how Rust's `for` loops work with the `IntoIterator` trait.

### Understanding IntoIterator

The `IntoIterator` trait defines how a type can be converted into an iterator:

```rust
pub trait IntoIterator {
    type Item;
    type IntoIter: Iterator<Item = Self::Item>;

    fn into_iter(self) -> Self::IntoIter;
}
```

When you use a `for` loop, Rust calls `into_iter()` on the collection, which is why you can iterate over any type that implements `IntoIterator`.

### Implementing IntoIterator

Let's implement `IntoIterator` for our Fibonacci sequence:

```rust
struct FibonacciSequence {
    max: u64,
}

impl IntoIterator for FibonacciSequence {
    type Item = u64;
    type IntoIter = FibonacciIterator;

    fn into_iter(self) -> Self::IntoIter {
        FibonacciIterator {
            current: 0,
            next: 1,
            max: self.max,
        }
    }
}

struct FibonacciIterator {
    current: u64,
    next: u64,
    max: u64,
}

impl Iterator for FibonacciIterator {
    type Item = u64;

    fn next(&mut self) -> Option<Self::Item> {
        if self.current > self.max {
            return None;
        }

        let current = self.current;

        self.current = self.next;
        self.next = current + self.next;

        Some(current)
    }
}

// Usage
fn main() {
    let fib_seq = FibonacciSequence { max: 100 };

    for num in fib_seq {
        println!("{}", num);
    }
}
```

Now we can use our `FibonacciSequence` directly in a `for` loop.

### Multiple IntoIterator Implementations

Types can implement `IntoIterator` multiple times with different self types:

```rust
// For Vec<T>:
impl<T> IntoIterator for Vec<T> { /* ... */ }             // Takes ownership
impl<'a, T> IntoIterator for &'a Vec<T> { /* ... */ }     // Borrows immutably
impl<'a, T> IntoIterator for &'a mut Vec<T> { /* ... */ } // Borrows mutably
```

This is why you can iterate over a vector using any of these patterns:

```rust
let v = vec![1, 2, 3];

// Ownership: consumes v
for x in v { /* ... */ }

// Shared reference: keeps v
for x in &v { /* ... */ }

// Mutable reference: keeps v, allows modification
for x in &mut v { /* ... */ }
```

## The FromIterator Trait

The counterpart to `IntoIterator` is `FromIterator`, which defines how to build a collection from an iterator:

```rust
pub trait FromIterator<A>: Sized {
    fn from_iter<T: IntoIterator<Item = A>>(iter: T) -> Self;
}
```

This trait is what powers the `collect` method, allowing you to gather iterator elements into a collection.

### Using FromIterator with collect

The `collect` method is flexible and can create different collection types:

```rust
let numbers = vec![1, 2, 3, 4, 5];

// Collect into a vector
let doubled: Vec<_> = numbers.iter()
    .map(|&n| n * 2)
    .collect();

// Collect into a HashSet
use std::collections::HashSet;
let unique: HashSet<_> = numbers.iter().collect();

// Collect into a String
let chars = vec!['h', 'e', 'l', 'l', 'o'];
let string: String = chars.into_iter().collect();

// Collect into a Result
let results = vec![Ok(1), Err("error"), Ok(2)];
let combined_result: Result<Vec<_>, _> = results.into_iter().collect();
assert!(combined_result.is_err());
```

The target type for `collect` is often inferred from the context, but you can also specify it explicitly using the turbofish syntax:

```rust
let numbers = vec![1, 2, 3, 4, 5];
let even_numbers = numbers.iter()
    .filter(|&&n| n % 2 == 0)
    .copied()
    .collect::<Vec<i32>>();
```

### Implementing FromIterator

Let's implement `FromIterator` for a custom collection type:

```rust
#[derive(Debug, PartialEq)]
struct SortedVec<T: Ord> {
    data: Vec<T>,
}

impl<T: Ord> SortedVec<T> {
    fn new() -> Self {
        SortedVec { data: Vec::new() }
    }

    fn add(&mut self, value: T) {
        // Find the position to insert while maintaining sort order
        let pos = self.data.binary_search(&value).unwrap_or_else(|p| p);
        self.data.insert(pos, value);
    }
}

impl<T: Ord> FromIterator<T> for SortedVec<T> {
    fn from_iter<I: IntoIterator<Item = T>>(iter: I) -> Self {
        let mut sorted_vec = SortedVec::new();

        for value in iter {
            sorted_vec.add(value);
        }

        sorted_vec
    }
}

// Usage
fn main() {
    let numbers = vec![5, 2, 8, 1, 9];

    // Collect into our SortedVec
    let sorted: SortedVec<_> = numbers.into_iter().collect();

    assert_eq!(sorted.data, vec![1, 2, 5, 8, 9]);
}
```

With this implementation, we can use `collect()` to create a `SortedVec` from any iterator.

## Iterator Fusion and Laziness

One of the key performance advantages of Rust's iterators is their laziness and ability to fuse operations.

### Understanding Iterator Fusion

Iterator fusion is the process of combining multiple iterator operations into a single pass over the data. This optimization is possible because Rust's iterators are lazy—they don't process elements until they're needed.

Let's look at an example:

```rust
let numbers = vec![1, 2, 3, 4, 5];

let result: Vec<_> = numbers.iter()
    .map(|&n| {
        println!("Mapping: {}", n);
        n * 2
    })
    .filter(|&n| {
        println!("Filtering: {}", n);
        n > 5
    })
    .collect();

println!("Result: {:?}", result);
```

Output:

```
Mapping: 1
Filtering: 2
Mapping: 2
Filtering: 4
Mapping: 3
Filtering: 6
Mapping: 4
Filtering: 8
Mapping: 5
Filtering: 10
Result: [6, 8, 10]
```

Notice how each element passes through the entire chain of operations before the next element is processed. This is iterator fusion in action—instead of creating intermediate collections for each step, Rust processes each element through all steps before moving to the next element.

### Zero-Cost Abstractions

Rust's iterators are a prime example of the language's zero-cost abstraction philosophy. Despite their high-level interface, they compile down to efficient machine code, often matching or outperforming hand-written loops.

For example, consider these two approaches:

```rust
// Using a for loop
fn sum_evens_loop(numbers: &[i32]) -> i32 {
    let mut sum = 0;
    for &n in numbers {
        if n % 2 == 0 {
            sum += n;
        }
    }
    sum
}

// Using iterators
fn sum_evens_iter(numbers: &[i32]) -> i32 {
    numbers.iter()
        .filter(|&&n| n % 2 == 0)
        .sum()
}
```

After compilation with optimizations, these two functions will likely produce very similar or identical machine code. The iterator version is more concise and expressive, yet it doesn't come with a performance penalty.

### Iterators and Performance

In many cases, iterators can actually outperform manual loops due to optimizations like:

1. **Eliminating bounds checks**: The compiler can often eliminate bounds checks within iterator methods.
2. **Loop unrolling**: The compiler can unroll iterator loops for better instruction-level parallelism.
3. **Auto-vectorization**: Some iterator operations can be automatically vectorized, using SIMD instructions.

Let's look at a performance comparison:

```rust
use std::time::Instant;

fn main() {
    // Generate a large vector
    let numbers: Vec<i32> = (0..10_000_000).collect();

    // Measure time for loop approach
    let start = Instant::now();
    let sum_loop = sum_evens_loop(&numbers);
    let loop_time = start.elapsed();

    // Measure time for iterator approach
    let start = Instant::now();
    let sum_iter = sum_evens_iter(&numbers);
    let iter_time = start.elapsed();

    println!("Loop result: {} in {:?}", sum_loop, loop_time);
    println!("Iterator result: {} in {:?}", sum_iter, iter_time);
}
```

In many cases, the iterator version will be just as fast or faster, while being more concise and expressive.

## Composing Iterators

One of the most powerful aspects of iterators is their composability. Let's explore how to build complex data processing pipelines using iterators.

### Chaining Iterators

The `chain` method combines two iterators into a single sequence:

```rust
let first = vec![1, 2, 3];
let second = vec![4, 5, 6];

let combined: Vec<_> = first.iter()
    .chain(second.iter())
    .copied()
    .collect();

assert_eq!(combined, vec![1, 2, 3, 4, 5, 6]);
```

### Flattening Nested Iterators

The `flatten` method takes an iterator of iterators and flattens it into a single iterator:

```rust
let nested = vec![vec![1, 2], vec![3, 4], vec![5, 6]];

let flattened: Vec<_> = nested.iter()
    .flatten()
    .copied()
    .collect();

assert_eq!(flattened, vec![1, 2, 3, 4, 5, 6]);
```

### Flat Map: Map and Flatten Combined

The `flat_map` method maps each element to an iterator and then flattens the results:

```rust
let words = vec!["hello", "world"];

let chars: Vec<_> = words.iter()
    .flat_map(|word| word.chars())
    .collect();

assert_eq!(chars, vec!['h', 'e', 'l', 'l', 'o', 'w', 'o', 'r', 'l', 'd']);
```

### Advanced Composition with Custom Adaptors

You can create your own iterator adaptors for more complex compositions:

```rust
trait IteratorExt: Iterator + Sized {
    fn every_nth(self, n: usize) -> EveryNth<Self> {
        assert!(n > 0, "n must be positive");
        EveryNth { iter: self, n, index: 0 }
    }
}

// Implement our extension trait for all iterators
impl<I: Iterator> IteratorExt for I {}

struct EveryNth<I: Iterator> {
    iter: I,
    n: usize,
    index: usize,
}

impl<I: Iterator> Iterator for EveryNth<I> {
    type Item = I::Item;

    fn next(&mut self) -> Option<Self::Item> {
        while let Some(item) = self.iter.next() {
            self.index += 1;
            if self.index % self.n == 0 {
                return Some(item);
            }
        }
        None
    }
}

// Usage
fn main() {
    let numbers = 1..=20;

    let every_third: Vec<_> = numbers.every_nth(3).collect();

    assert_eq!(every_third, vec![3, 6, 9, 12, 15, 18]);
}
```

This example creates a custom iterator adaptor that selects every nth element from an iterator.

### Building Data Processing Pipelines

Let's put it all together with a more complex example—processing a collection of log entries:

```rust
struct LogEntry {
    timestamp: u64,
    level: LogLevel,
    message: String,
}

enum LogLevel {
    Debug,
    Info,
    Warning,
    Error,
}

fn process_logs(logs: Vec<LogEntry>) -> Vec<String> {
    logs.into_iter()
        // Filter to only warnings and errors
        .filter(|entry| matches!(entry.level, LogLevel::Warning | LogLevel::Error))
        // Sort by timestamp (newest first)
        .sorted_by_key(|entry| std::cmp::Reverse(entry.timestamp))
        // Take only the 10 most recent
        .take(10)
        // Format for display
        .map(|entry| {
            let level = match entry.level {
                LogLevel::Warning => "WARNING",
                LogLevel::Error => "ERROR",
                _ => unreachable!(),
            };
            format!("[{}] {}: {}", entry.timestamp, level, entry.message)
        })
        .collect()
}
```

This pipeline filters, sorts, limits, and transforms log entries in a concise and expressive way.

Note: The `sorted_by_key` method isn't a standard iterator method but is available in the `itertools` crate, which we'll explore next.

## Parallel Iterators with Rayon

So far, we've explored sequential iterators, which process elements one at a time. For CPU-intensive operations on large datasets, parallel processing can significantly improve performance.

The `rayon` crate provides parallel implementations of many iterator methods, allowing you to easily parallelize your data processing pipelines.

### Basic Parallel Iterators

Let's start with a simple example comparing sequential and parallel sum operations:

```rust
use rayon::prelude::*;

fn main() {
    let numbers: Vec<i32> = (1..=1_000_000).collect();

    // Sequential sum
    let seq_sum: i32 = numbers.iter().sum();

    // Parallel sum
    let par_sum: i32 = numbers.par_iter().sum();

    assert_eq!(seq_sum, par_sum);
}
```

Converting from sequential to parallel processing is often as simple as changing `iter()` to `par_iter()`. The `rayon` crate automatically handles:

1. Breaking the data into chunks
2. Distributing work across available CPU cores
3. Combining results from different threads

### Parallel Map and Filter

Parallel versions of common iterator adaptors work the same way as their sequential counterparts:

```rust
use rayon::prelude::*;

fn main() {
    let numbers: Vec<i32> = (1..=1_000_000).collect();

    // Parallel map and filter
    let result: Vec<i32> = numbers.par_iter()
        .filter(|&&n| n % 2 == 0)  // Keep even numbers
        .map(|&n| n * n)           // Square them
        .collect();

    // Verify first few results
    assert_eq!(&result[0..5], &[4, 16, 36, 64, 100]);
}
```

### Custom Parallel Operations

Rayon also provides more powerful parallel operations like `reduce` for flexible parallel reductions:

```rust
use rayon::prelude::*;
use std::cmp::max;

fn main() {
    let numbers: Vec<i32> = (1..=1_000_000).collect();

    // Find maximum value in parallel
    let maximum = numbers.par_iter()
        .reduce(|| &i32::MIN, |a, b| max(a, b));

    assert_eq!(maximum, &1_000_000);
}
```

The `reduce` method takes two closures:

1. The first closure creates the initial value for each thread
2. The second closure combines two values, both within threads and between threads

### When to Use Parallel Iterators

Parallel iterators are most beneficial when:

1. The dataset is large (small datasets may have more overhead than benefit)
2. Operations are CPU-intensive (I/O-bound operations won't benefit as much)
3. Operations are independent (no shared mutable state between iterations)

```rust
use rayon::prelude::*;
use std::time::Instant;

// Compute-intensive function (simulated)
fn expensive_computation(n: u64) -> u64 {
    // Simulate work with a naive Fibonacci calculation
    if n <= 1 {
        return n;
    }
    expensive_computation(n - 1) + expensive_computation(n - 2)
}

fn main() {
    let inputs: Vec<u64> = (30..35).collect();

    // Sequential processing
    let start = Instant::now();
    let seq_results: Vec<u64> = inputs.iter()
        .map(|&n| expensive_computation(n))
        .collect();
    let seq_time = start.elapsed();

    // Parallel processing
    let start = Instant::now();
    let par_results: Vec<u64> = inputs.par_iter()
        .map(|&n| expensive_computation(n))
        .collect();
    let par_time = start.elapsed();

    assert_eq!(seq_results, par_results);
    println!("Sequential time: {:?}", seq_time);
    println!("Parallel time: {:?}", par_time);
}
```

On a multi-core system, the parallel version can be significantly faster for this compute-intensive task.

### Parallel Iterator Methods

Rayon provides parallel versions of many standard iterator methods:

```rust
use rayon::prelude::*;

fn main() {
    let numbers: Vec<i32> = (1..=100).collect();

    // Check if all numbers are positive
    let all_positive = numbers.par_iter().all(|&n| n > 0);
    assert!(all_positive);

    // Check if any number is greater than 50
    let any_large = numbers.par_iter().any(|&n| n > 50);
    assert!(any_large);

    // Find the first even number
    let first_even = numbers.par_iter().find_first(|&&n| n % 2 == 0);
    assert_eq!(first_even, Some(&2));

    // Find any even number (may not be the first due to parallelism)
    let any_even = numbers.par_iter().find_any(|&&n| n % 2 == 0);
    assert!(any_even.is_some());

    // Count even numbers
    let even_count = numbers.par_iter().filter(|&&n| n % 2 == 0).count();
    assert_eq!(even_count, 50);
}
```

### Maintaining Order

By default, parallel iterators don't guarantee processing order. When order matters, Rayon provides methods like `enumerate` that maintain element indices:

```rust
use rayon::prelude::*;

fn main() {
    let words = vec!["apple", "banana", "cherry", "date"];

    // Process in parallel but maintain original order
    let results: Vec<(usize, String)> = words.par_iter()
        .enumerate()  // Add indices
        .map(|(idx, &word)| {
            (idx, word.to_uppercase())
        })
        .collect();

    // Sort by index to ensure original order
    let mut ordered_results = results;
    ordered_results.sort_by_key(|(idx, _)| *idx);

    let uppercase: Vec<String> = ordered_results.into_iter()
        .map(|(_, word)| word)
        .collect();

    assert_eq!(uppercase, vec!["APPLE", "BANANA", "CHERRY", "DATE"]);
}
```

## Functional Programming Patterns in Rust

Functional programming emphasizes expressions over statements, immutability over mutable state, and function composition over imperative sequences. Rust supports many functional programming patterns, especially through its iterator system.

### Immutability and Pure Functions

In functional programming, data is immutable, and functions are "pure"—they don't modify state and always return the same output for the same input.

Rust encourages this approach through:

- Default immutability (`let` bindings are immutable)
- Explicit mutability (`mut` keyword required for mutation)
- Move semantics that prevent aliasing of mutable data

Let's look at a simple example of a pure function:

```rust
// Pure function: no side effects, same output for same input
fn square(x: i32) -> i32 {
    x * x
}

// Impure function: modifies external state
fn add_to_sum(x: i32, sum: &mut i32) {
    *sum += x;
}

fn main() {
    // Using the pure function
    let result = square(5);
    assert_eq!(result, 25);

    // Using the impure function
    let mut sum = 0;
    add_to_sum(5, &mut sum);
    assert_eq!(sum, 5);
}
```

When possible, prefer pure functions as they're easier to reason about, test, and parallelize.

### Higher-Order Functions

A higher-order function either takes a function as an argument or returns a function. We've already seen many examples with iterator methods:

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // map, filter, and fold are higher-order functions
    let squares: Vec<_> = numbers.iter()
        .map(|&n| n * n)      // Takes a function
        .collect();

    assert_eq!(squares, vec![1, 4, 9, 16, 25]);
}
```

You can also create your own higher-order functions:

```rust
// Higher-order function that applies a function twice
fn apply_twice<F, T>(f: F, x: T) -> T
where
    F: Fn(T) -> T,
    T: Copy,
{
    f(f(x))
}

fn main() {
    let add_one = |x| x + 1;
    let result = apply_twice(add_one, 5);

    assert_eq!(result, 7); // 5 + 1 + 1 = 7
}
```

### Function Composition

Function composition involves chaining functions together to create a new function:

```rust
// Compose two functions into a new function
fn compose<F, G, T, U, V>(f: F, g: G) -> impl Fn(T) -> V
where
    F: Fn(U) -> V,
    G: Fn(T) -> U,
{
    move |x| f(g(x))
}

fn main() {
    let add_one = |x| x + 1;
    let square = |x| x * x;

    // First square, then add one
    let square_then_add = compose(add_one, square);
    assert_eq!(square_then_add(5), 26); // (5² = 25) + 1 = 26

    // First add one, then square
    let add_then_square = compose(square, add_one);
    assert_eq!(add_then_square(5), 36); // (5 + 1 = 6)² = 36
}
```

### Partial Application and Currying

Partial application involves fixing some arguments of a function to create a new function:

```rust
// Return a function with the first argument fixed
fn partial<T, U, V, F>(f: F, x: T) -> impl Fn(U) -> V
where
    F: Fn(T, U) -> V,
    T: Copy,
{
    move |y| f(x, y)
}

fn main() {
    // A function that takes two arguments
    let multiply = |x, y| x * y;

    // Create a new function with x=5
    let multiply_by_5 = partial(multiply, 5);

    assert_eq!(multiply_by_5(3), 15); // 5 * 3 = 15
    assert_eq!(multiply_by_5(7), 35); // 5 * 7 = 35
}
```

Currying is a related technique that transforms a function that takes multiple arguments into a sequence of functions, each taking a single argument:

```rust
// Curry a function that takes two arguments
fn curry<T, U, V, F>(f: F) -> impl Fn(T) -> impl Fn(U) -> V
where
    F: Fn(T, U) -> V,
    T: Copy,
    U: Copy,
{
    move |x| move |y| f(x, y)
}

fn main() {
    // A function that takes two arguments
    let multiply = |x, y| x * y;

    // Curry the function
    let curried_multiply = curry(multiply);

    // Create a function that multiplies by 5
    let multiply_by_5 = curried_multiply(5);

    assert_eq!(multiply_by_5(3), 15); // 5 * 3 = 15
}
```

### Lazy Evaluation with Iterators

As we've seen, Rust's iterators support lazy evaluation—computations are only performed when needed:

```rust
fn main() {
    let numbers = 1..=1_000_000;

    // This iterator pipeline is created but not executed yet
    let even_squares = numbers
        .filter(|&n| n % 2 == 0)
        .map(|n| {
            println!("Computing square of {}", n);
            n * n
        });

    // Only when we consume it does computation happen
    // And even then, only for the first 5 elements
    let first_five: Vec<_> = even_squares.take(5).collect();

    assert_eq!(first_five, vec![4, 16, 36, 64, 100]);
}
```

This lazy approach can be more efficient, especially when dealing with large datasets or infinite sequences.

### Monadic Operations

While Rust doesn't have explicit monads like some functional languages, it has similar patterns through types like `Option` and `Result`:

```rust
fn main() {
    let numbers = vec![Some(1), None, Some(3), None, Some(5)];

    // Filter out None values and transform the Some values
    let squared: Vec<_> = numbers.iter()
        .filter_map(|opt| opt.map(|n| n * n))
        .collect();

    assert_eq!(squared, vec![1, 9, 25]);

    // Using and_then (flatMap in other languages)
    let divided: Option<i32> = Some(10)
        .and_then(|n| {
            if n == 0 {
                None  // Can't divide by zero
            } else {
                Some(100 / n)
            }
        });

    assert_eq!(divided, Some(10)); // 100 / 10 = 10
}
```

### Railway-Oriented Programming with Result

The `Result` type enables a style of error handling known as railway-oriented programming, where success and error paths are handled separately:

```rust
use std::fs::File;
use std::io::{self, Read};
use std::path::Path;

// Process a file, handling errors through the Result type
fn process_file(path: &Path) -> Result<String, io::Error> {
    File::open(path)
        .and_then(|mut file| {
            let mut content = String::new();
            file.read_to_string(&mut content)
                .map(|_| content)
        })
}

fn main() {
    match process_file(Path::new("data.txt")) {
        Ok(content) => println!("File content: {}", content),
        Err(error) => println!("Error: {}", error),
    }
}
```

With the `?` operator, this becomes even more concise:

```rust
use std::fs::File;
use std::io::{self, Read};
use std::path::Path;

fn process_file(path: &Path) -> Result<String, io::Error> {
    let mut file = File::open(path)?;
    let mut content = String::new();
    file.read_to_string(&mut content)?;
    Ok(content)
}
```

### Closures as Function Objects

Closures in Rust are function objects that can capture their environment:

```rust
fn main() {
    let factor = 2;

    // This closure captures 'factor' from its environment
    let multiplier = |x| x * factor;

    let result = multiplier(5);
    assert_eq!(result, 10); // 5 * 2 = 10
}
```

This enables powerful patterns like creating specialized functions based on runtime parameters.

### Functional Error Handling

Functional programming often handles errors through return values rather than exceptions. Rust's `Result` and `Option` types, combined with iterator methods, provide elegant error handling:

```rust
fn main() {
    let numbers = vec!["1", "2", "three", "4", "5"];

    // Parse strings to numbers, collecting successes and handling errors
    let parsed: Vec<i32> = numbers.iter()
        .filter_map(|&s| s.parse::<i32>().ok())
        .collect();

    assert_eq!(parsed, vec![1, 2, 4, 5]); // "three" is filtered out

    // Alternatively, fail on first error
    let all_parsed: Result<Vec<i32>, _> = numbers.iter()
        .map(|&s| s.parse::<i32>())
        .collect();

    assert!(all_parsed.is_err()); // Fails due to "three"
}
```

These patterns allow for concise error handling without sacrificing clarity or type safety.

## Performance Considerations

While functional programming patterns and iterators are powerful and expressive, it's important to consider their performance implications, especially in performance-critical applications.

### Iterator Overhead

In most cases, Rust's zero-cost abstraction philosophy ensures that iterators compile to efficient machine code. However, there are situations where iterators might introduce overhead:

1. **Debug builds**: Without optimizations, iterator abstractions might not be fully optimized away.
2. **Complex iterator chains**: Very long chains of iterator adapters might be harder for the compiler to optimize.
3. **Dynamic dispatch**: Using trait objects for iterators can prevent certain optimizations.

Let's look at some benchmarks comparing different approaches:

```rust
use std::time::{Duration, Instant};

// Simple benchmark function
fn benchmark<F>(name: &str, iterations: u32, f: F)
where
    F: Fn(),
{
    let start = Instant::now();

    for _ in 0..iterations {
        f();
    }

    let elapsed = start.elapsed();
    println!("{}: {:?} per iteration", name, elapsed / iterations);
}

fn main() {
    const N: usize = 10_000_000;
    let numbers: Vec<i32> = (1..=N as i32).collect();

    // Benchmark 1: For loop
    benchmark("For loop", 10, || {
        let mut sum = 0;
        for &n in &numbers {
            if n % 2 == 0 {
                sum += n;
            }
        }
        assert!(sum > 0);
    });

    // Benchmark 2: Iterator
    benchmark("Iterator", 10, || {
        let sum: i32 = numbers.iter()
            .filter(|&&n| n % 2 == 0)
            .sum();
        assert!(sum > 0);
    });

    // Benchmark 3: Iterator with fold
    benchmark("Iterator with fold", 10, || {
        let sum = numbers.iter()
            .filter(|&&n| n % 2 == 0)
            .fold(0, |acc, &n| acc + n);
        assert!(sum > 0);
    });

    // Benchmark 4: Parallel iterator
    benchmark("Parallel iterator", 10, || {
        use rayon::prelude::*;
        let sum: i32 = numbers.par_iter()
            .filter(|&&n| n % 2 == 0)
            .sum();
        assert!(sum > 0);
    });
}
```

When running these benchmarks with optimizations enabled (`--release`), you'll often find that the iterator version is comparable to or even faster than the manual loop, while the parallel iterator can be significantly faster on multi-core systems.

### Memory Usage

Iterators can be more memory-efficient than intermediate collections, but there are trade-offs:

```rust
fn process_data_with_collection(data: &[i32]) -> Vec<i32> {
    // Create intermediate collections at each step
    let filtered: Vec<_> = data.iter().filter(|&&x| x > 0).copied().collect();
    let mapped: Vec<_> = filtered.iter().map(|&x| x * 2).collect();
    mapped
}

fn process_data_with_iterators(data: &[i32]) -> Vec<i32> {
    // Single pass with no intermediate collections
    data.iter()
        .filter(|&&x| x > 0)
        .map(|&x| x * 2)
        .copied()
        .collect()
}
```

The second approach avoids allocating memory for intermediate results, which can be significant for large datasets.

### When to Use Traditional Loops

Despite the advantages of iterators, there are cases where traditional loops might be more appropriate:

1. **Complex mutable state**: When you need to update multiple variables based on complex conditions.
2. **Early termination with side effects**: When you need to break a loop early and perform side effects.
3. **Non-linear traversal**: When you need to jump around in a collection rather than process it sequentially.

Here's an example where a traditional loop might be clearer:

```rust
fn find_pair_with_sum(numbers: &[i32], target: i32) -> Option<(i32, i32)> {
    let mut seen = std::collections::HashSet::new();

    for &n in numbers {
        let complement = target - n;

        if seen.contains(&complement) {
            return Some((complement, n));
        }

        seen.insert(n);
    }

    None
}
```

While this could be implemented with iterators, the traditional loop makes the stateful nature of the algorithm more explicit.

### Compiler Optimizations

The Rust compiler applies several optimizations to iterator code:

1. **Loop unrolling**: Processing multiple elements per iteration.
2. **Auto-vectorization**: Using SIMD instructions for parallel processing.
3. **Bounds check elimination**: Removing redundant bounds checks.
4. **Inlining**: Replacing function calls with their bodies to reduce overhead.

These optimizations often make iterator code as fast as or faster than equivalent manual loops.

### Profiling and Benchmarking

When performance is critical, always measure and profile your code:

1. Use the `criterion` crate for rigorous benchmarking.
2. Use profiling tools like `perf` on Linux or `Instruments` on macOS.
3. Compare different implementations and let the data guide your decisions.

```rust
// Example using criterion for benchmarking
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn sum_evens_loop(numbers: &[i32]) -> i32 {
    let mut sum = 0;
    for &n in numbers {
        if n % 2 == 0 {
            sum += n;
        }
    }
    sum
}

fn sum_evens_iter(numbers: &[i32]) -> i32 {
    numbers.iter()
        .filter(|&&n| n % 2 == 0)
        .sum()
}

fn criterion_benchmark(c: &mut Criterion) {
    let numbers: Vec<i32> = (1..1000).collect();

    c.bench_function("sum_evens_loop", |b| b.iter(|| sum_evens_loop(black_box(&numbers))));
    c.bench_function("sum_evens_iter", |b| b.iter(|| sum_evens_iter(black_box(&numbers))));
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
```

## Project: Data Pipeline

Now let's apply what we've learned to build a data processing pipeline for analyzing a dataset. We'll create a system that reads a CSV file containing product sales data, processes it using iterators and functional patterns, and generates summary reports.

### Project Structure

Our project will have the following components:

1. Data parsing from CSV
2. Filtering and transformation
3. Aggregation and analysis
4. Report generation
5. Parallel processing for performance

### Step 1: Define the Data Model

First, let's define our data structures:

```rust
use chrono::NaiveDate;
use serde::Deserialize;
use std::error::Error;
use std::fs::File;
use std::path::Path;

#[derive(Debug, Deserialize, Clone)]
struct SalesRecord {
    date: NaiveDate,
    product_id: String,
    product_name: String,
    category: String,
    quantity: i32,
    unit_price: f64,
    country: String,
}

impl SalesRecord {
    fn total_price(&self) -> f64 {
        self.quantity as f64 * self.unit_price
    }
}
```

### Step 2: Read and Parse the CSV Data

Next, let's implement the function to read the CSV file:

```rust
fn read_sales_data(path: &Path) -> Result<Vec<SalesRecord>, Box<dyn Error>> {
    let file = File::open(path)?;
    let mut rdr = csv::Reader::from_reader(file);

    let records: Result<Vec<SalesRecord>, _> = rdr.deserialize().collect();
    Ok(records?)
}
```

### Step 3: Implement Data Processing Functions

Now let's create functions to analyze the data using iterators:

```rust
// Filter records by date range
fn filter_by_date_range(
    records: &[SalesRecord],
    start_date: NaiveDate,
    end_date: NaiveDate,
) -> Vec<SalesRecord> {
    records.iter()
        .filter(|record| record.date >= start_date && record.date <= end_date)
        .cloned()
        .collect()
}

// Calculate total sales by category
fn sales_by_category(records: &[SalesRecord]) -> Vec<(String, f64)> {
    let mut category_sales = std::collections::HashMap::new();

    records.iter()
        .for_each(|record| {
            let entry = category_sales.entry(record.category.clone())
                .or_insert(0.0);
            *entry += record.total_price();
        });

    category_sales.into_iter()
        .collect()
}

// Find top-selling products
fn top_products(records: &[SalesRecord], limit: usize) -> Vec<(String, i32)> {
    let mut product_sales = std::collections::HashMap::new();

    records.iter()
        .for_each(|record| {
            let entry = product_sales.entry(record.product_name.clone())
                .or_insert(0);
            *entry += record.quantity;
        });

    let mut products: Vec<(String, i32)> = product_sales.into_iter()
        .collect();

    products.sort_by(|a, b| b.1.cmp(&a.1)); // Sort by quantity in descending order
    products.truncate(limit);

    products
}

// Calculate monthly sales trends
fn monthly_sales(records: &[SalesRecord]) -> Vec<(String, f64)> {
    let mut monthly_data = std::collections::HashMap::new();

    records.iter()
        .for_each(|record| {
            let month = format!("{}-{:02}",
                               record.date.year(),
                               record.date.month());
            let entry = monthly_data.entry(month)
                .or_insert(0.0);
            *entry += record.total_price();
        });

    let mut result: Vec<(String, f64)> = monthly_data.into_iter()
        .collect();

    result.sort_by(|a, b| a.0.cmp(&b.0)); // Sort by month

    result
}
```

### Step 4: Implement Parallel Processing

Let's optimize our analysis with parallel processing:

```rust
use rayon::prelude::*;

// Parallel version of sales_by_category
fn parallel_sales_by_category(records: &[SalesRecord]) -> Vec<(String, f64)> {
    let category_sales = records.par_iter()
        .fold(
            || std::collections::HashMap::new(),
            |mut acc, record| {
                let entry = acc.entry(record.category.clone())
                    .or_insert(0.0);
                *entry += record.total_price();
                acc
            }
        )
        .reduce(
            || std::collections::HashMap::new(),
            |mut a, b| {
                for (k, v) in b {
                    let entry = a.entry(k).or_insert(0.0);
                    *entry += v;
                }
                a
            }
        );

    category_sales.into_iter()
        .collect()
}
```

### Step 5: Generate Reports

Finally, let's create a function to generate a report:

```rust
fn generate_sales_report(records: &[SalesRecord]) -> Result<(), Box<dyn Error>> {
    // Filter to last year's data
    let today = chrono::Local::now().date_naive();
    let one_year_ago = today - chrono::Duration::days(365);

    let recent_sales = filter_by_date_range(records, one_year_ago, today);

    println!("=== Sales Report ===");
    println!("Period: {} to {}", one_year_ago, today);
    println!("Total Records: {}", records.len());
    println!("Recent Records: {}", recent_sales.len());

    // Calculate total sales
    let total_sales: f64 = records.iter()
        .map(|r| r.total_price())
        .sum();

    println!("\nTotal Sales: ${:.2}", total_sales);

    // Sales by category
    let category_sales = parallel_sales_by_category(records);

    println!("\nSales by Category:");
    for (category, sales) in category_sales {
        println!("  {}: ${:.2}", category, sales);
    }

    // Top products
    let top = top_products(records, 5);

    println!("\nTop 5 Products by Quantity:");
    for (i, (product, quantity)) in top.iter().enumerate() {
        println!("  {}. {} - {} units", i + 1, product, quantity);
    }

    // Monthly trend
    let monthly = monthly_sales(&recent_sales);

    println!("\nMonthly Sales Trend:");
    for (month, sales) in monthly {
        println!("  {}: ${:.2}", month, sales);
    }

    Ok(())
}
```

### Step 6: Putting It All Together

Now let's create the main function to run our data pipeline:

```rust
fn main() -> Result<(), Box<dyn Error>> {
    let start = std::time::Instant::now();

    // Read sales data
    let sales_data = read_sales_data(Path::new("sales_data.csv"))?;
    println!("Loaded {} sales records in {:?}",
             sales_data.len(),
             start.elapsed());

    // Generate report
    generate_sales_report(&sales_data)?;

    println!("\nTotal execution time: {:?}", start.elapsed());

    Ok(())
}
```

### Performance Improvements

Our data pipeline already uses iterators and parallel processing for efficiency. Here are some additional improvements we could make:

1. **Lazy loading**: Read the CSV file in chunks rather than loading it all into memory.
2. **Custom memory management**: Pre-allocate collections to avoid reallocations.
3. **Further parallelization**: Process different reports in parallel.

This project demonstrates how iterators and functional programming patterns can create concise, expressive, and efficient data processing pipelines in Rust.

## Summary

In this chapter, we've explored Rust's iterator system and functional programming patterns in depth. We've learned:

1. **The Iterator Trait**: How Rust's iterators work and how to use them effectively.
2. **Common Iterator Methods**: Tools like `map`, `filter`, and `fold` for data transformation.
3. **Building Custom Iterators**: How to implement your own iterators for specialized data structures.
4. **IntoIterator and FromIterator**: The traits that connect iterators with collections.
5. **Iterator Fusion and Laziness**: How Rust's iterators optimize operations through lazy evaluation.
6. **Composing Iterators**: Techniques for building complex data processing pipelines.
7. **Parallel Iterators**: Using Rayon for parallel data processing.
8. **Functional Programming Patterns**: Higher-order functions, function composition, and other functional techniques.
9. **Performance Considerations**: When and how to optimize iterator-based code.

Iterators and functional programming patterns are powerful tools in Rust, allowing you to write code that is both concise and efficient. By leveraging these abstractions, you can create more maintainable, testable, and parallelizable code without sacrificing performance.

## Exercises

1. **Basic Iterator Operations**: Write a function that takes a vector of integers and returns a new vector containing only the even numbers, doubled.

2. **Custom Iterator**: Implement an iterator that generates the Collatz sequence for a given starting number. The Collatz sequence follows this rule: if n is even, the next number is n/2; if n is odd, the next number is 3n+1. The sequence stops at 1.

3. **Iterator Chain**: Create a function that takes a string of text and returns the frequency of each word, ignoring case and punctuation. Use iterator methods to tokenize, normalize, and count the words.

4. **Parallel Processing**: Modify Exercise 3 to use parallel iterators for processing a large text file.

5. **Functional Composition**: Implement a function composition utility that takes multiple functions and returns a new function that applies them in sequence.

6. **Custom Iterator Adaptor**: Create a new iterator adaptor `chunk_by` that groups elements by a predicate, similar to `group_by` in other languages.

7. **Performance Comparison**: Benchmark different approaches (loops, iterators, parallel iterators) for computing the sum of squares of even numbers in a large vector.

8. **Data Pipeline**: Build a mini data pipeline that reads a log file, parses timestamps, filters by time range, groups by event type, and generates a summary report.

9. **State Machine with Iterators**: Implement a simple state machine using iterators to process a sequence of commands.

10. **Iterator Fusion**: Experiment with iterator fusion by creating a chain of iterators with print statements in each stage. Observe the execution order with and without a consuming adaptor.

## Further Reading

- [The Rust Standard Library Documentation on Iterators](https://doc.rust-lang.org/std/iter/trait.Iterator.html)
- [The Rayon Crate for Parallel Iterators](https://docs.rs/rayon)
- [The Itertools Crate for Additional Iterator Adaptors](https://docs.rs/itertools)
- [Effective Rust by Aaron Turon](https://www.effectiverust.com/)
- [Rust for Functional Programmers](https://www.fpcomplete.com/blog/2018/10/rust-for-functional-programmers/)
- [Zero-Cost Abstractions in Rust](https://boats.gitlab.io/blog/post/zero-cost-abstractions/)
- [Crust of Rust: Iterators](https://www.youtube.com/watch?v=yozQ9C69pNs) by Jon Gjengset
