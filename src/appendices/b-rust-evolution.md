# Appendices (Continued)

## Appendix E: Rust's Memory Model In-Depth

Understanding Rust's memory model is essential for writing efficient and correct code. This appendix provides a deeper exploration of how Rust manages memory.

### Memory Layout in Rust

#### Types and Memory Representation

Every type in Rust has a specific memory layout:

- **Primitive types**: Fixed size (e.g., `i32` is 4 bytes, `bool` is 1 byte)
- **Structs**: Fields laid out sequentially, with potential padding for alignment
- **Enums**: Size depends on the largest variant plus a discriminant
- **Trait objects**: Fat pointers (data pointer + vtable pointer)
- **References**: Single pointers (or fat pointers for slices/trait objects)
- **Raw pointers**: Same as references but without borrow checking

```rust
// Simple struct with predictable layout
struct Point {
    x: i32,  // 4 bytes
    y: i32,  // 4 bytes
}  // Total: 8 bytes

// Enum with variable size variants
enum Message {
    Quit,                       // 1 byte (discriminant)
    Move { x: i32, y: i32 },    // 9 bytes (discriminant + 8 bytes data)
    Write(String),              // 25 bytes (discriminant + 24 bytes for String)
}  // Total size: 25 bytes (largest variant)
```

### Memory Alignment

Rust ensures that types are properly aligned in memory:

- Types must be stored at memory addresses that are multiples of their alignment requirements
- Alignment ensures efficient memory access on hardware
- Padding may be inserted between struct fields to maintain alignment

```rust
struct Aligned {
    a: u8,    // 1 byte
    // 3 bytes padding
    b: u32,   // 4 bytes
    c: u8,    // 1 byte
    // 3 bytes padding
}  // Total: 12 bytes (not 6 bytes!)
```

### The Stack and the Heap

Rust, like many languages, uses both stack and heap memory:

- **Stack**: Fast, fixed-size memory that follows function call hierarchy

  - Stores function parameters, local variables, return addresses
  - Allocation and deallocation are automatic and extremely fast
  - Size must be known at compile time
  - Limited by stack size (often a few MB)

- **Heap**: Flexible memory pool for dynamic allocation
  - Allocated via `Box`, `Vec`, `String`, etc.
  - Size can be determined at runtime
  - Manual allocation and deallocation (handled by ownership in Rust)
  - Slower than stack, but much larger capacity

```rust
fn stack_and_heap() {
    let x = 42;                  // Stack allocated
    let y = Box::new(84);        // Heap allocated, box pointer on stack
    let z = vec![1, 2, 3, 4];    // Heap allocated, vector metadata on stack
}  // x, y, and z all cleaned up here
```

### Memory Allocation Details

#### Box<T>

`Box<T>` is Rust's simplest heap allocation type:

- Stores a single value of type T on the heap
- The box itself is a pointer-sized value on the stack
- Useful for recursive data structures, trait objects, or large values

```rust
// A recursive data structure needs Box
enum List<T> {
    Cons(T, Box<List<T>>),
    Nil,
}
```

#### Vec<T>

`Vec<T>` is a dynamic array:

- Contains three words on the stack: pointer to heap data, length, and capacity
- Contiguous memory on the heap for elements
- Grows by reallocating and copying when capacity is reached

```rust
let mut v = Vec::with_capacity(10);  // Allocates space for 10 elements
v.push(1);  // No reallocation needed until capacity exceeded
```

#### String

`String` is similar to `Vec<u8>` but guarantees UTF-8 encoding:

- Contains pointer, length, and capacity (like Vec)
- Heap-allocated bytes must be valid UTF-8

### Custom Allocators

Rust allows for custom memory allocators through the `alloc` trait:

```rust
use std::alloc::{GlobalAlloc, Layout, System};

struct MyAllocator;

unsafe impl GlobalAlloc for MyAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        // Custom allocation logic
        System.alloc(layout)
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        // Custom deallocation logic
        System.dealloc(ptr, layout)
    }
}

#[global_allocator]
static ALLOCATOR: MyAllocator = MyAllocator;
```

### Zero-Cost Abstractions in Memory Management

Rust's compiler optimizes memory operations:

- References have zero runtime cost compared to raw pointers
- Smart pointers compile to efficient machine code
- Ownership checking happens at compile time
- Move semantics avoid unnecessary copying

### Memory Ordering and Atomics

For concurrent code, Rust provides atomic types with specific memory ordering guarantees:

```rust
use std::sync::atomic::{AtomicUsize, Ordering};

let counter = AtomicUsize::new(0);

// Relaxed ordering - no synchronization
counter.fetch_add(1, Ordering::Relaxed);

// Acquire-Release ordering - synchronizes with other threads
counter.fetch_add(1, Ordering::AcqRel);

// Sequential consistency - strongest ordering guarantee
counter.fetch_add(1, Ordering::SeqCst);
```

### Memory Leaks

While Rust prevents memory safety issues, it doesn't guarantee prevention of memory leaks:

- Reference cycles with `Rc` or `Arc` can cause leaks
- `std::mem::forget` intentionally leaks memory
- Infinite loops prevent resource cleanup

```rust
use std::rc::Rc;
use std::cell::RefCell;

// Create a reference cycle
fn create_cycle() {
    type Link = Rc<RefCell<Option<Link>>>;

    let a: Link = Rc::new(RefCell::new(None));
    let b: Link = Rc::new(RefCell::new(None));

    // Create a cycle
    *a.borrow_mut() = Some(b.clone());
    *b.borrow_mut() = Some(a.clone());

    // Both a and b will never be freed
}
```

### Visualizing Memory

Understanding memory layout can be aided by tools:

- `std::mem::size_of` shows type sizes
- `std::mem::align_of` shows alignment requirements
- `#[repr(C)]` makes struct layout match C conventions
- Tools like `memmap` can help visualize actual memory

## Appendix F: Community Resources and Contribution Guide

The Rust community is known for being welcoming and helpful. This appendix highlights key resources and ways to contribute to the Rust ecosystem.

### Official Resources

- **[rust-lang.org](https://www.rust-lang.org/)**: The official Rust website
- **[doc.rust-lang.org](https://doc.rust-lang.org/)**: Official documentation
- **[The Rust Book](https://doc.rust-lang.org/book/)**: Comprehensive language introduction
- **[Rust Reference](https://doc.rust-lang.org/reference/)**: Detailed language reference
- **[Rust by Example](https://doc.rust-lang.org/rust-by-example/)**: Learning through examples
- **[Rustonomicon](https://doc.rust-lang.org/nomicon/)**: Advanced unsafe Rust
- **[Rust Standard Library Docs](https://doc.rust-lang.org/std/)**: API documentation
- **[The Cargo Book](https://doc.rust-lang.org/cargo/)**: Cargo reference

### Community Forums and Chat

- **[Users Forum](https://users.rust-lang.org/)**: Community Q&A
- **[Internals Forum](https://internals.rust-lang.org/)**: Language development discussions
- **[Discord](https://discord.gg/rust-lang)**: Real-time chat
- **[Reddit r/rust](https://www.reddit.com/r/rust/)**: News and discussions
- **[Stack Overflow](https://stackoverflow.com/questions/tagged/rust)**: Technical Q&A

### Learning Resources

- **[Rust Learning](https://github.com/ctjhoa/rust-learning)**: Curated learning resources
- **[Exercism Rust Track](https://exercism.io/tracks/rust)**: Programming exercises
- **[Rust Cookbook](https://rust-lang-nursery.github.io/rust-cookbook/)**: Practical examples
- **[Rust in Motion](https://www.manning.com/livevideo/rust-in-motion)**: Video course
- **[Rustlings](https://github.com/rust-lang/rustlings)**: Small exercises
- **[Rust for Rustaceans](https://nostarch.com/rust-rustaceans)**: Advanced Rust book

### Newsletters and Blogs

- **[This Week in Rust](https://this-week-in-rust.org/)**: Weekly newsletter
- **[Inside Rust Blog](https://blog.rust-lang.org/inside-rust/)**: Development insights
- **[Read Rust](https://readrust.net/)**: Curated blog posts

### Contributing to Rust

#### Getting Started

1. Familiarize yourself with Rust's [governance structure](https://www.rust-lang.org/governance)
2. Read the [contribution guidelines](https://github.com/rust-lang/rust/blob/master/CONTRIBUTING.md)
3. Find issues labeled ["E-easy" or "E-mentor"](https://github.com/rust-lang/rust/issues?q=is%3Aopen+is%3Aissue+label%3AE-easy)
4. Join a [working group](https://www.rust-lang.org/governance/wgs) that interests you

#### Types of Contributions

- **Code**: Implementing features, fixing bugs
- **Documentation**: Improving explanations, adding examples
- **Tests**: Adding test cases, improving test coverage
- **Translations**: Translating documentation to other languages
- **Issue triage**: Helping organize and validate bug reports
- **Community**: Helping new users, organizing events

#### The RFC Process

Major changes to Rust follow the Request for Comments (RFC) process:

1. Draft an RFC following the [template](https://github.com/rust-lang/rfcs/blob/master/0000-template.md)
2. Submit a pull request to the [RFC repository](https://github.com/rust-lang/rfcs)
3. Engage in discussion and address feedback
4. If approved, the RFC will be merged and implemented

#### Code of Conduct

The Rust community follows a [Code of Conduct](https://www.rust-lang.org/policies/code-of-conduct) that ensures a respectful and inclusive environment. Familiarize yourself with it before participating.

### Community Projects

- **Rustup**: Rust toolchain installer
- **Cargo**: Package manager
- **Clippy**: Linting tool
- **Rustfmt**: Code formatter
- **rust-analyzer**: IDE support

### Local Communities

- **Rust User Groups**: Local meetups worldwide
- **Rust Conferences**: RustConf, RustFest, etc.
- **Rust Workshops**: Hands-on learning events

## Appendix G: Debugging and Troubleshooting Guide

This appendix provides techniques and tools for debugging Rust programs, understanding common errors, and solving problems efficiently.

### Compilation Errors

Rust's compiler provides detailed error messages to help fix issues:

#### Understanding Error Messages

```
error[E0308]: mismatched types
  --> src/main.rs:4:8
   |
 4 |     let x: i32 = "hello";
   |            ^^^   ^^^^^^^ expected `i32`, found `&str`
   |            |
   |            expected due to this
```

The key parts are:

- Error code (`E0308`)
- Location (file and line/column)
- Expected vs. found types
- Additional context

#### Common Compilation Errors

| Error Code | Description                              | Common Causes                             |
| ---------- | ---------------------------------------- | ----------------------------------------- |
| E0308      | Type mismatch                            | Assigning incompatible types              |
| E0382      | Use of moved value                       | Using a value after it's been moved       |
| E0106      | Missing lifetime specifier               | Returning references without lifetimes    |
| E0507      | Cannot move out of borrowed content      | Trying to take ownership from a reference |
| E0597      | Borrowed value does not live long enough | Reference outlives the referenced value   |

#### The `rustc --explain` Command

For detailed explanations of error codes:

```
rustc --explain E0308
```

### Runtime Debugging

#### Println Debugging

The simplest debugging technique:

```rust
fn process_data(data: &[i32]) -> i32 {
    println!("Processing data: {:?}", data);
    let result = data.iter().sum();
    println!("Result: {}", result);
    result
}
```

#### Using `dbg!` Macro

The `dbg!` macro is more powerful than `println!`:

- Prints file and line number
- Shows expression and its value
- Returns the value (unlike println!)

```rust
fn calculate(a: i32, b: i32) -> i32 {
    let intermediate = dbg!(a * 2);
    dbg!(intermediate + b)
}
```

#### Debug and Display Traits

Implement these traits for better debug output:

```rust
#[derive(Debug)]
struct Person {
    name: String,
    age: u32,
}

impl std::fmt::Display for Person {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{} ({})", self.name, self.age)
    }
}
```

#### Using a Debugger

GDB and LLDB can be used with Rust:

1. Compile with debug symbols: `cargo build`
2. Run the debugger: `gdb target/debug/my_program`
3. Common commands:
   - `break src/main.rs:10` - Set breakpoint at line 10
   - `run` - Start execution
   - `print variable` - Show variable value
   - `next` - Execute next line
   - `step` - Step into function
   - `continue` - Continue execution

#### Rust-Specific Debugger Extensions

- GDB with [rust-gdb](https://github.com/rust-lang/rust/blob/master/src/etc/rust-gdb)
- LLDB with [rust-lldb](https://github.com/rust-lang/rust/blob/master/src/etc/rust-lldb)

### Common Runtime Issues

#### Panics

When your program panics, you'll see a message and backtrace:

```
thread 'main' panicked at 'index out of bounds: the len is 3 but the index is 5', src/main.rs:4:5
stack backtrace:
   0: std::panicking::begin_panic
   ...
```

Common causes:

- Index out of bounds
- Division by zero
- Unwrapping `None` or `Err`
- Explicit `panic!()` calls

#### Stack Overflow

Typically caused by infinite recursion:

```rust
fn recursive_function() {
    recursive_function();  // Will cause stack overflow
}
```

#### Memory Leaks

Find memory leaks with tools like `valgrind` or memory profilers.

#### Deadlocks

When threads wait for each other indefinitely:

```rust
let mutex1 = Arc::new(Mutex::new(()));
let mutex2 = Arc::new(Mutex::new(()));

// Thread 1
let _lock1 = mutex1.lock().unwrap();
let _lock2 = mutex2.lock().unwrap();

// Thread 2
let _lock2 = mutex2.lock().unwrap();
let _lock1 = mutex1.lock().unwrap();
```

### Advanced Debugging Techniques

#### Tracing

Use the `tracing` crate for structured logging:

```rust
use tracing::{info, span, Level};

fn process_request(user_id: u64) {
    let span = span!(Level::INFO, "process_request", user_id = user_id);
    let _enter = span.enter();

    info!("Starting request processing");
    // Process request
    info!("Request processing completed");
}
```

#### Assertions

Use assertions to catch logical errors:

```rust
fn divide(a: i32, b: i32) -> i32 {
    assert!(b != 0, "Division by zero");
    a / b
}
```

#### Feature Flags for Debugging

Use Cargo features to enable debug code only when needed:

```toml
# Cargo.toml
[features]
debug_assertions = []
```

```rust
fn complex_calculation() -> f64 {
    let result = /* calculation */;

    #[cfg(feature = "debug_assertions")]
    {
        println!("Calculation result: {}", result);
        assert!(result >= 0.0, "Expected non-negative result");
    }

    result
}
```

#### Logging

Use the `log` crate for flexible logging:

```rust
use log::{info, warn, error};

fn process_data(data: &[u8]) -> Result<(), Error> {
    info!("Processing {} bytes of data", data.len());

    if data.is_empty() {
        warn!("Empty data provided");
        return Ok(());
    }

    match process_chunk(data) {
        Ok(result) => {
            info!("Processing successful: {:?}", result);
            Ok(())
        }
        Err(e) => {
            error!("Processing failed: {}", e);
            Err(e)
        }
    }
}
```

### Troubleshooting Tools

- **Clippy**: Catches common mistakes with `cargo clippy`
- **MIRI**: Interprets Rust MIR to find undefined behavior
- **Valgrind**: Detects memory management issues
- **Flamegraph**: Visualizes performance hotspots
- **Sanitizers**: Address Sanitizer (ASan), Thread Sanitizer (TSan)

## Appendix H: Performance Optimization Cookbook

This appendix provides practical techniques for optimizing Rust code performance, from simple adjustments to advanced strategies.

### Measuring Performance

Always measure before and after optimization to confirm improvements:

#### Benchmarking with Criterion

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n-1) + fibonacci(n-2),
    }
}

fn criterion_benchmark(c: &mut Criterion) {
    c.bench_function("fib 20", |b| b.iter(|| fibonacci(black_box(20))));
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
```

#### Profiling

Use profilers to identify hotspots:

- Linux: `perf`, `valgrind --callgrind`
- macOS: Instruments
- Windows: Visual Studio Profiler

### Common Optimization Techniques

#### 1. Efficient Data Structures

Choose the right collection for the job:

| Collection      | Strengths                             | Use Cases                          |
| --------------- | ------------------------------------- | ---------------------------------- |
| `Vec<T>`        | Fast random access, contiguous memory | When you need indexing, appending  |
| `HashMap<K,V>`  | Fast lookups by key                   | When you need key-based access     |
| `BTreeMap<K,V>` | Ordered keys, better for small sizes  | When you need ordered iteration    |
| `HashSet<T>`    | Fast membership testing               | When you need unique items         |
| `VecDeque<T>`   | Efficient at both ends                | When you need a double-ended queue |

```rust
// Inefficient: O(n) lookups
let items = vec![Item { id: 1, name: "first" }, Item { id: 2, name: "second" }];
let item = items.iter().find(|i| i.id == search_id);

// Efficient: O(1) lookups
let mut item_map = HashMap::new();
for item in items {
    item_map.insert(item.id, item);
}
let item = item_map.get(&search_id);
```

#### 2. Avoiding Allocations

Minimize heap allocations:

```rust
// Inefficient: Allocates a new String for each call
fn append_world(s: &str) -> String {
    let mut result = s.to_string();
    result.push_str(" world");
    result
}

// Efficient: Reuses existing allocation
fn append_world(s: &mut String) {
    s.push_str(" world");
}
```

Use stack allocation where possible:

```rust
// Heap allocation
let data = vec![0; 128];

// Stack allocation (fixed size, no heap)
let data = [0; 128];
```

#### 3. Inlining and Code Generation

Control inlining with attributes:

```rust
#[inline]
fn frequently_called_small_function() {
    // This will likely be inlined
}

#[inline(never)]
fn large_function_called_rarely() {
    // This won't be inlined
}
```

#### 4. SIMD Vectorization

Use SIMD (Single Instruction, Multiple Data) for data-parallel operations:

```rust
use std::arch::x86_64::{__m256, _mm256_add_ps, _mm256_loadu_ps, _mm256_storeu_ps};

// Process 8 f32 values in parallel
unsafe fn add_f32_avx(a: &[f32], b: &[f32], c: &mut [f32]) {
    for i in (0..a.len()).step_by(8) {
        let a_chunk = _mm256_loadu_ps(a[i..].as_ptr());
        let b_chunk = _mm256_loadu_ps(b[i..].as_ptr());
        let sum = _mm256_add_ps(a_chunk, b_chunk);
        _mm256_storeu_ps(c[i..].as_mut_ptr(), sum);
    }
}
```

#### 5. Lazy Computation

Compute values only when needed:

```rust
use std::cell::OnceCell;

struct ExpensiveData {
    cached_value: OnceCell<String>,
}

impl ExpensiveData {
    fn new() -> Self {
        Self {
            cached_value: OnceCell::new(),
        }
    }

    fn get_value(&self) -> &str {
        self.cached_value.get_or_init(|| {
            // Expensive computation performed only once
            "expensive computation result".to_string()
        })
    }
}
```

#### 6. Parallel Processing

Use Rayon for parallel iterations:

```rust
use rayon::prelude::*;

fn sum_of_squares(v: &[i32]) -> i32 {
    v.par_iter()
     .map(|&x| x * x)
     .sum()
}
```

#### 7. Custom Allocators

Implement domain-specific allocators:

```rust
use std::alloc::{GlobalAlloc, Layout, System};

struct PoolAllocator;

unsafe impl GlobalAlloc for PoolAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        // Fast allocation for specific sizes
        if layout.size() == 32 && layout.align() <= 8 {
            // Use a pool for 32-byte allocations
            // ...
        } else {
            // Fall back to system allocator
            System.alloc(layout)
        }
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        // Corresponding deallocation logic
        // ...
    }
}
```

### Domain-Specific Optimizations

#### String Processing

```rust
// Inefficient: Multiple allocations
let combined = format!("{}{}{}", str1, str2, str3);

// More efficient: Pre-allocate capacity
let mut combined = String::with_capacity(
    str1.len() + str2.len() + str3.len()
);
combined.push_str(str1);
combined.push_str(str2);
combined.push_str(str3);
```

#### File I/O

```rust
// Inefficient: Reading line by line
let file = File::open("data.txt")?;
let reader = BufReader::new(file);
for line in reader.lines() {
    let line = line?;
    // Process line
}

// More efficient: Reading in larger chunks
let file = File::open("data.txt")?;
let mut reader = BufReader::with_capacity(128 * 1024, file);
let mut buffer = String::with_capacity(256 * 1024);
reader.read_to_string(&mut buffer)?;
for line in buffer.lines() {
    // Process line
}
```

#### JSON Processing

```rust
// Inefficient: Parsing to intermediate representation
let data: Value = serde_json::from_str(&json_string)?;
let name = data["name"].as_str().unwrap_or_default();

// More efficient: Direct deserialization
#[derive(Deserialize)]
struct Person {
    name: String,
    #[serde(skip_deserializing)]
    ignored_field: Option<String>,
}

let person: Person = serde_json::from_str(&json_string)?;
let name = &person.name;
```

### Compiler Optimizations

#### Release Mode

Always build with `--release` for production:

```
cargo build --release
```

#### Optimization Levels

Fine-tune optimization level in `Cargo.toml`:

```toml
[profile.release]
opt-level = 3  # Maximum optimization
```

#### Link-Time Optimization (LTO)

Enable whole-program optimization:

```toml
[profile.release]
lto = true
```

#### Profile-Guided Optimization (PGO)

Use runtime behavior to guide optimization:

```bash
# Step 1: Instrument the binary
RUSTFLAGS="-Cprofile-generate=/tmp/pgo-data" cargo build --release

# Step 2: Run the instrumented binary with typical workload
./target/release/my_program typical_input.txt

# Step 3: Use the profile data for optimization
RUSTFLAGS="-Cprofile-use=/tmp/pgo-data" cargo build --release
```

### Memory and Cache Optimization

#### Data Alignment

Align data for efficient access:

```rust
#[repr(align(64))]  // Align to cache line
struct AlignedData {
    values: [u8; 1024],
}
```

#### Cache-Friendly Iteration

Iterate in a way that respects CPU cache:

```rust
// Poor cache behavior: Strided access
for i in 0..width {
    for j in 0..height {
        process_pixel(data[j * width + i]);
    }
}

// Better cache behavior: Sequential access
for j in 0..height {
    for i in 0..width {
        process_pixel(data[j * width + i]);
    }
}
```

#### Structure of Arrays vs. Array of Structures

Choose the right data layout:

```rust
// Array of Structures (AoS) - poor for SIMD
struct Particle {
    x: f32,
    y: f32,
    z: f32,
    velocity_x: f32,
    velocity_y: f32,
    velocity_z: f32,
}
let particles = vec![Particle { /* ... */ }; 1000];

// Structure of Arrays (SoA) - better for SIMD
struct Particles {
    x: Vec<f32>,
    y: Vec<f32>,
    z: Vec<f32>,
    velocity_x: Vec<f32>,
    velocity_y: Vec<f32>,
    velocity_z: Vec<f32>,
}

let mut particles = Particles {
    x: vec![0.0; 1000],
    y: vec![0.0; 1000],
    // ...
};
```

### Case Studies: Before and After Optimization

#### Case Study 1: String Processing

Before:

```rust
fn process_text(text: &str) -> String {
    let words: Vec<_> = text.split_whitespace().collect();
    let mut result = String::new();

    for word in words {
        if word.len() > 3 {
            result.push_str(word);
            result.push(' ');
        }
    }

    result.trim().to_string()
}
```

After:

```rust
fn process_text(text: &str) -> String {
    // Estimate final size to avoid reallocations
    let approx_result_len = text.len() / 2;
    let mut result = String::with_capacity(approx_result_len);

    for word in text.split_whitespace() {
        if word.len() > 3 {
            if !result.is_empty() {
                result.push(' ');
            }
            result.push_str(word);
        }
    }

    // No need for trim and extra allocation
    result
}
```

#### Case Study 2: Database Query

Before:

```rust
fn find_records(db: &Database, criteria: &SearchCriteria) -> Vec<Record> {
    let mut results = Vec::new();

    for record in db.all_records() {
        if record.matches(criteria) {
            results.push(record.clone());
        }
    }

    results
}
```

After:

```rust
fn find_records<'a>(db: &'a Database, criteria: &SearchCriteria) -> impl Iterator<Item = &'a Record> + 'a {
    db.all_records()
        .filter(move |record| record.matches(criteria))
}
```
