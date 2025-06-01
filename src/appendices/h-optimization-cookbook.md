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
# Appendices (Final Part)

## Appendix I: Comprehensive Glossary
