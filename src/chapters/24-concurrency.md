# Chapter 24: Concurrency Fundamentals

## Introduction

Concurrency is a foundational concept in modern programming, enabling software to effectively utilize multi-core processors and handle multiple tasks simultaneously. Rust's approach to concurrency is one of its most distinctive features—it provides powerful concurrency primitives while enforcing safety at compile time through its ownership system.

Unlike many other languages where concurrency bugs can lurk until runtime, Rust's compiler prevents data races and many other concurrency hazards before your program even runs. The mantra "fearless concurrency" aptly describes how Rust empowers developers to write concurrent code with confidence.

In this chapter, we'll explore Rust's concurrency model from the ground up. We'll start with the fundamental building blocks of threads, move through various synchronization mechanisms, and build toward more sophisticated concurrency patterns. By the end, you'll understand not only how to write concurrent Rust code, but also why Rust's approach to concurrency is revolutionizing how we think about parallel programming.

Whether you're building high-performance servers, data processing pipelines, or responsive user interfaces, the skills you learn in this chapter will help you write code that effectively harnesses the full power of modern hardware while maintaining Rust's guarantees of safety and reliability.

## Understanding Concurrency vs Parallelism

Before diving into Rust's concurrency features, it's essential to understand the distinction between concurrency and parallelism—related concepts that are often confused.

### Concurrency: Dealing with Multiple Tasks

Concurrency refers to the ability to handle multiple tasks in overlapping time periods. It's about the structure of a program—how it's composed of independently executing processes. A concurrent program has multiple logical threads of control, but those threads might not be executing simultaneously.

Think of concurrency as juggling multiple balls. You're not literally handling all the balls at the same time; you're quickly switching between them, ensuring that each ball gets enough attention to stay in the air.

### Parallelism: Doing Multiple Tasks Simultaneously

Parallelism, on the other hand, is about execution. A parallel program actively executes multiple tasks at the exact same time, typically on different processor cores. Parallelism requires hardware with multiple processing units.

To extend our analogy, parallelism is like having multiple jugglers, each handling their own balls independently.

### The Relationship Between Concurrency and Parallelism

Concurrency is about structure; parallelism is about execution. A program can be concurrent without being parallel (executing on a single core by interleaving tasks), but parallelism requires some form of concurrency in the program's design.

Here's a simple example to illustrate the difference:

```rust
use std::thread;
use std::time::Duration;

fn main() {
    // This is concurrent but may not be parallel
    // (depending on your system and the OS scheduler)
    let handle1 = thread::spawn(|| {
        for i in 1..=5 {
            println!("Thread 1: {}", i);
            thread::sleep(Duration::from_millis(500));
        }
    });

    let handle2 = thread::spawn(|| {
        for i in 1..=5 {
            println!("Thread 2: {}", i);
            thread::sleep(Duration::from_millis(500));
        }
    });

    // Wait for both threads to complete
    handle1.join().unwrap();
    handle2.join().unwrap();
}
```

Running this program on a multi-core system will likely result in parallel execution, with both threads running simultaneously on different cores. On a single-core system, the threads would still be concurrent, but the CPU would rapidly switch between them to create the illusion of parallelism.

### Why This Distinction Matters in Rust

Rust's concurrency model is designed to address both concurrency and parallelism effectively:

1. **Concurrency Safety**: Rust's ownership system prevents data races at compile time, making concurrent programming safer.

2. **Parallelism Efficiency**: Rust's zero-cost abstractions ensure that concurrent code can be efficiently parallelized without runtime overhead.

3. **Scalability**: Rust programs can seamlessly scale from single-core to multi-core execution without changing the underlying safety guarantees.

In the following sections, we'll explore how Rust implements these concepts through threads, synchronization primitives, and message passing.

## Threads and thread::spawn

At the foundation of Rust's concurrency model are threads—independent sequences of execution that can run concurrently within a program. Rust provides a native threading API through the `std::thread` module.

### Creating Threads with spawn

The most basic way to create a thread in Rust is with `thread::spawn`, which takes a closure containing the code to be executed in the new thread:

```rust
use std::thread;

fn main() {
    // Spawn a new thread
    let handle = thread::spawn(|| {
        // This code runs in a new thread
        println!("Hello from a thread!");
    });

    // This code runs in the main thread
    println!("Hello from the main thread!");

    // Wait for the spawned thread to finish
    handle.join().unwrap();
}
```

The `spawn` function returns a `JoinHandle`, which we can use to wait for the thread to finish or perform other operations on the thread.

### Joining Threads

The `join` method on a `JoinHandle` blocks the current thread until the thread associated with the handle terminates. This is important for ensuring that a spawned thread completes its work before the program exits:

```rust
use std::thread;
use std::time::Duration;

fn main() {
    let handle = thread::spawn(|| {
        // Simulate a long-running operation
        thread::sleep(Duration::from_secs(2));
        println!("Thread finished!");
    });

    println!("Waiting for thread to finish...");

    // Block until the thread completes
    handle.join().unwrap();

    println!("Main thread continuing after join");
}
```

If you don't call `join()`, the main thread might finish and exit the program before the spawned thread has a chance to complete its work.

### Thread Return Values

Threads can return values, which become available when `join()` is called:

```rust
use std::thread;

fn main() {
    let handle = thread::spawn(|| {
        // Perform some calculation
        let result = 42;

        // Return the result from the thread
        result
    });

    // Retrieve the thread's return value
    let result = handle.join().unwrap();
    println!("Thread returned: {}", result);
}
```

The `join` method returns a `Result<T>` where `T` is the return type of the thread's closure. If the thread panicked, `join` will return an `Err` containing the panic payload.

### Capturing Environment with move

Closures passed to `thread::spawn` often need to access variables from their enclosing scope. However, due to Rust's ownership rules, the closure must take ownership of any values it references from the surrounding environment. This is where the `move` keyword comes in:

```rust
use std::thread;

fn main() {
    let message = String::from("Hello from a captured variable!");

    // Use move to transfer ownership of message to the thread
    let handle = thread::spawn(move || {
        println!("{}", message);
    });

    // Can't use message here anymore because ownership was transferred
    // println!("{}", message); // This would cause a compilation error

    handle.join().unwrap();
}
```

Without the `move` keyword, the closure would try to borrow `message`, but the compiler can't guarantee that the main thread won't invalidate this reference before or during the spawned thread's execution.

### Thread Builder

For more control over thread creation, Rust provides the `Builder` API:

```rust
use std::thread;

fn main() {
    let builder = thread::Builder::new()
        .name("custom-thread".into())
        .stack_size(32 * 1024); // 32KB stack

    let handle = builder.spawn(|| {
        println!("Running in thread named: {:?}", thread::current().name());
    }).unwrap();

    handle.join().unwrap();
}
```

The `Builder` allows you to customize various aspects of the thread, such as its name and stack size, before spawning it.

### Current Thread and Thread-Local Storage

Rust provides ways to access the current thread and store thread-local data:

```rust
use std::thread;
use std::cell::RefCell;

thread_local! {
    static COUNTER: RefCell<u32> = RefCell::new(0);
}

fn main() {
    let handle1 = thread::spawn(|| {
        COUNTER.with(|counter| {
            *counter.borrow_mut() += 1;
            println!("Thread 1: counter = {}", *counter.borrow());
        });
    });

    let handle2 = thread::spawn(|| {
        COUNTER.with(|counter| {
            *counter.borrow_mut() += 1;
            println!("Thread 2: counter = {}", *counter.borrow());
        });
    });

    handle1.join().unwrap();
    handle2.join().unwrap();

    COUNTER.with(|counter| {
        println!("Main thread: counter = {}", *counter.borrow());
    });
}
```

Each thread gets its own independent copy of the thread-local storage, which can be useful for tracking per-thread state without synchronization overhead.

### Thread Parking

Rust provides mechanisms to temporarily suspend and resume thread execution:

```rust
use std::thread;
use std::time::Duration;

fn main() {
    let handle = thread::spawn(|| {
        println!("Thread going to park");
        thread::park();
        println!("Thread unparked and continuing");
    });

    // Give the thread time to park
    thread::sleep(Duration::from_millis(500));

    // Unpark the thread
    handle.thread().unpark();
    handle.join().unwrap();
}
```

The `park` method suspends the current thread until it is unparked, which can be useful for implementing condition variables and other synchronization primitives.

## Thread Safety Guarantees

One of Rust's most celebrated features is its ability to prevent data races at compile time. This is achieved through a combination of the ownership system, type system, and trait system, which together enforce thread safety.

### Data Races and Why They Matter

A data race occurs when:

1. Two or more threads access the same memory location concurrently
2. At least one of the accesses is a write
3. There's no synchronization mechanism controlling the accesses

Data races lead to undefined behavior, which can manifest as subtle and hard-to-reproduce bugs, crashes, or security vulnerabilities.

### How Rust Prevents Data Races

Rust prevents data races through its type system, specifically with the `Send` and `Sync` traits:

- **`Send`**: Types that can be safely transferred between threads
- **`Sync`**: Types that can be safely shared between threads (via references)

The compiler enforces these traits automatically, preventing you from sharing data between threads unless it's safe to do so.

### The Send Trait

A type is `Send` if it's safe to transfer ownership of values of that type between threads. Most Rust types are `Send`, with a few notable exceptions:

```rust
use std::thread;
use std::rc::Rc;

fn main() {
    let data = Rc::new(42); // Rc is not Send

    // This would fail to compile:
    // let handle = thread::spawn(move || {
    //     println!("The answer is: {}", *data);
    // });

    // Instead, we can use Arc, which is Send:
    let data = std::sync::Arc::new(42);

    let handle = thread::spawn(move || {
        println!("The answer is: {}", *data);
    });

    handle.join().unwrap();
}
```

`Rc` (Reference Counted) is not thread-safe and thus not `Send`. Attempting to move it across thread boundaries will result in a compilation error. `Arc` (Atomic Reference Counted) is the thread-safe alternative.

### The Sync Trait

A type is `Sync` if it's safe to share references to values of that type between threads. Mathematically, a type `T` is `Sync` if and only if `&T` is `Send`.

```rust
use std::thread;
use std::cell::RefCell;
use std::sync::{Arc, Mutex};

fn main() {
    // RefCell is not Sync
    let data = Arc::new(RefCell::new(42));

    // This would fail to compile:
    // let handle = thread::spawn(move || {
    //     *data.borrow_mut() += 1;
    // });

    // Instead, we can use Mutex, which is Sync:
    let data = Arc::new(Mutex::new(42));

    let handle = thread::spawn(move || {
        let mut value = data.lock().unwrap();
        *value += 1;
    });

    handle.join().unwrap();
    println!("Final value: {}", *data.lock().unwrap());
}
```

`RefCell` provides interior mutability, but it's not thread-safe and thus not `Sync`. `Mutex` is the thread-safe alternative that provides similar functionality.

### Implementing Send and Sync

Most types automatically implement `Send` and `Sync` based on their constituent parts. However, you can explicitly implement (or not implement) these traits:

```rust
use std::marker::{Send, Sync};

// A type that is not thread-safe by default
struct MyNonThreadSafeType {
    data: u32,
}

// Mark it as Send and Sync (unsafe because we're promising
// the compiler that our type is thread-safe)
unsafe impl Send for MyNonThreadSafeType {}
unsafe impl Sync for MyNonThreadSafeType {}

fn main() {
    let data = MyNonThreadSafeType { data: 42 };

    let handle = std::thread::spawn(move || {
        println!("Data in thread: {}", data.data);
    });

    handle.join().unwrap();
}
```

This is an unsafe operation because you're bypassing Rust's safety checks. Only do this if you're absolutely certain your type is thread-safe and you understand the concurrency implications.

### Thread Safety at the Type Level

Rust's approach to thread safety is unique because it's enforced at the type level, during compilation. This means:

1. Thread safety bugs are caught before your program runs
2. There's no runtime overhead for these checks
3. The compiler can optimize code knowing certain race conditions are impossible

This type-level approach is what enables "fearless concurrency" in Rust—you can write concurrent code with confidence, knowing that many common concurrency bugs are impossible by design.

## Race Conditions and Data Races

When writing concurrent code, there are two related but distinct problems that can arise: race conditions and data races. Understanding the difference is crucial for writing correct concurrent programs.

### What is a Data Race?

A data race occurs when:

1. Two or more threads access the same memory location concurrently
2. At least one of the accesses is a write
3. There's no synchronization mechanism controlling the accesses

Data races lead to undefined behavior in languages like C and C++. In Rust, the type system prevents data races at compile time, making them impossible in safe code.

### What is a Race Condition?

A race condition is a broader concept than a data race. It occurs when the correctness of a program depends on the relative timing or interleaving of multiple threads or processes. Even with proper synchronization that prevents data races, race conditions can still occur.

### An Example of a Race Condition

Let's look at a simple example that demonstrates a race condition but not a data race:

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            // Get the current value
            let current = *counter.lock().unwrap();

            // Simulate some work
            thread::sleep(std::time::Duration::from_millis(1));

            // Update with current + 1
            *counter.lock().unwrap() = current + 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final count: {}", *counter.lock().unwrap());
}
```

This code has a race condition but not a data race. The `Mutex` prevents data races by ensuring that only one thread can access the counter at a time. However, there's still a race condition because:

1. A thread reads the current value
2. It then releases the lock
3. Other threads may modify the value
4. When the original thread re-acquires the lock and writes, it's based on a stale value

This is a classic "check-then-act" race condition. The solution is to hold the lock across both the read and write operations:

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            // Acquire the lock once and keep it until we're done
            let mut value = counter.lock().unwrap();

            // Simulate some work
            thread::sleep(std::time::Duration::from_millis(1));

            // Update the value while still holding the lock
            *value += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final count: {}", *counter.lock().unwrap());
}
```

### Atomicity and Ordering

Race conditions often involve issues of atomicity (operations that must be performed as a single, indivisible unit) and ordering (the sequence in which operations occur).

Rust provides atomic types in the `std::sync::atomic` module that can help with certain types of race conditions:

```rust
use std::sync::atomic::{AtomicUsize, Ordering};
use std::thread;

fn main() {
    let counter = AtomicUsize::new(0);
    let mut handles = vec![];

    for _ in 0..10 {
        let handle = thread::spawn(move || {
            for _ in 0..1000 {
                // Atomically increment the counter
                counter.fetch_add(1, Ordering::SeqCst);
            }
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final count: {}", counter.load(Ordering::SeqCst));
}
```

This won't compile because `counter` is not shared between threads. Let's fix that:

```rust
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::thread;

fn main() {
    let counter = Arc::new(AtomicUsize::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            for _ in 0..1000 {
                // Atomically increment the counter
                counter.fetch_add(1, Ordering::SeqCst);
            }
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final count: {}", counter.load(Ordering::SeqCst));
}
```

### Detecting Race Conditions

Unlike data races, which Rust prevents at compile time, race conditions can still occur in Rust programs and can be difficult to detect. Here are some strategies to identify and fix race conditions:

1. **Code reviews**: Carefully examine concurrent code for potential race conditions
2. **Testing**: Use stress testing with many threads and iterations
3. **Thread sanitizers**: Tools like TSAN (though support in Rust is still developing)
4. **Formal verification**: For critical systems, consider formal verification techniques

### Debugging Race Conditions

Race conditions can be notoriously difficult to debug because they depend on specific timing and may not reproduce consistently. Here are some tips for debugging race conditions in Rust:

1. **Add logging**: Detailed logging can help understand the sequence of events
2. **Simplify**: Reduce the code to the minimal example that still shows the issue
3. **Force specific interleavings**: Add sleeps or other delays to try to trigger the race condition consistently
4. **Use thread-safe data structures**: Replace your custom synchronization with proven thread-safe abstractions

## Sharing State with Mutex and Arc

Safe concurrent programming often requires sharing state between threads. Rust provides several tools for this, with `Mutex` and `Arc` being among the most important.

### Mutex: Mutual Exclusion

A mutex (mutual exclusion) ensures that only one thread can access a piece of data at a time. In Rust, the `Mutex<T>` type wraps a value of type `T` and ensures exclusive access.

Here's a basic example:

```rust
use std::sync::Mutex;
use std::thread;

fn main() {
    let counter = Mutex::new(0);

    let mut handles = vec![];

    for _ in 0..10 {
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap());
}
```

This code won't compile! The problem is that `counter` is moved into the first thread, leaving nothing for subsequent iterations. This is where `Arc` comes in.

### Arc: Atomic Reference Counting

`Arc` (Atomic Reference Counting) provides shared ownership of a value across multiple threads. It's similar to `Rc`, but it uses atomic operations for its reference counting, making it thread-safe.

Let's fix our example:

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap());
}
```

Now our code compiles and works correctly. `Arc` allows multiple threads to have shared ownership of the `Mutex`, and `Mutex` ensures that only one thread can access the value at a time.

### Understanding lock() and Poisoning

The `lock()` method on a `Mutex` returns a `LockResult<MutexGuard<T>>`. The `MutexGuard` is a smart pointer that automatically releases the lock when it goes out of scope.

If a thread panics while holding a `Mutex` lock, the mutex becomes "poisoned." This means that future attempts to lock the mutex will return an error. This is a safety feature to prevent other threads from seeing inconsistent state:

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let counter_clone = Arc::clone(&counter);

    let handle = thread::spawn(move || {
        let mut num = counter_clone.lock().unwrap();
        *num += 1;
        // This thread will panic
        panic!("Oh no!");
    });

    // Wait for the thread to finish or panic
    let _ = handle.join();

    // Trying to lock a poisoned mutex
    match counter.lock() {
        Ok(mut num) => {
            println!("Successfully acquired lock: {}", *num);
            *num += 1;
        }
        Err(poisoned) => {
            println!("Mutex is poisoned. Recovering...");
            let mut num = poisoned.into_inner();
            *num += 1;
            println!("Recovered value: {}", *num);
        }
    }
}
```

### RwLock: Multiple Readers or Single Writer

Sometimes, you want to allow multiple threads to read data simultaneously, but still ensure exclusive access for writing. `RwLock` (Reader-Writer Lock) provides this functionality:

```rust
use std::sync::{Arc, RwLock};
use std::thread;

fn main() {
    let data = Arc::new(RwLock::new(vec![1, 2, 3]));
    let mut handles = vec![];

    // Spawn some reader threads
    for i in 0..3 {
        let data = Arc::clone(&data);
        let handle = thread::spawn(move || {
            let values = data.read().unwrap();
            println!("Reader {}: {:?}", i, *values);
        });
        handles.push(handle);
    }

    // Spawn a writer thread
    {
        let data = Arc::clone(&data);
        let handle = thread::spawn(move || {
            let mut values = data.write().unwrap();
            values.push(4);
            println!("Writer: {:?}", *values);
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final data: {:?}", *data.read().unwrap());
}
```

`RwLock` allows any number of threads to hold a read lock simultaneously, but only one thread can hold a write lock, and no read locks can be held while a write lock is active.

### Mutex vs RwLock Performance Considerations

Choosing between `Mutex` and `RwLock` depends on your specific use case:

- **`Mutex`**: Simpler and often has less overhead. Better when:

  - Access patterns are write-heavy
  - Critical sections are very short
  - Contention is low

- **`RwLock`**: More complex but allows concurrent reads. Better when:
  - Access patterns are read-heavy
  - Multiple threads need to read simultaneously
  - Write operations are infrequent

Here's a simple benchmark:

```rust
use std::sync::{Arc, Mutex, RwLock};
use std::thread;
use std::time::{Duration, Instant};

fn main() {
    let iterations = 1_000_000;
    let read_percentage = 95; // 95% reads, 5% writes
    let num_threads = 8;

    benchmark_mutex(iterations, read_percentage, num_threads);
    benchmark_rwlock(iterations, read_percentage, num_threads);
}

fn benchmark_mutex(iterations: usize, read_percentage: usize, num_threads: usize) {
    let data = Arc::new(Mutex::new(0));
    let start = Instant::now();

    let mut handles = vec![];
    for _ in 0..num_threads {
        let data = Arc::clone(&data);
        let handle = thread::spawn(move || {
            for i in 0..iterations / num_threads {
                if i % 100 < read_percentage {
                    // Read operation
                    let _ = *data.lock().unwrap();
                } else {
                    // Write operation
                    let mut value = data.lock().unwrap();
                    *value += 1;
                }
            }
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Mutex: {:?}", start.elapsed());
}

fn benchmark_rwlock(iterations: usize, read_percentage: usize, num_threads: usize) {
    let data = Arc::new(RwLock::new(0));
    let start = Instant::now();

    let mut handles = vec![];
    for _ in 0..num_threads {
        let data = Arc::clone(&data);
        let handle = thread::spawn(move || {
            for i in 0..iterations / num_threads {
                if i % 100 < read_percentage {
                    // Read operation
                    let _ = *data.read().unwrap();
                } else {
                    // Write operation
                    let mut value = data.write().unwrap();
                    *value += 1;
                }
            }
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("RwLock: {:?}", start.elapsed());
}
```

### Deadlocks and How to Avoid Them

A deadlock occurs when two or more threads are blocked forever, each waiting for resources held by others. Here's a simple example of a deadlock:

```rust
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

fn main() {
    let mutex_a = Arc::new(Mutex::new(0));
    let mutex_b = Arc::new(Mutex::new(0));

    let mutex_a_clone = Arc::clone(&mutex_a);
    let mutex_b_clone = Arc::clone(&mutex_b);

    let thread_a = thread::spawn(move || {
        println!("Thread A: Trying to lock mutex A");
        let mut a = mutex_a_clone.lock().unwrap();
        println!("Thread A: Locked mutex A");

        thread::sleep(Duration::from_millis(100));

        println!("Thread A: Trying to lock mutex B");
        let mut b = mutex_b_clone.lock().unwrap();
        println!("Thread A: Locked mutex B");

        *a += 1;
        *b += 1;
    });

    let thread_b = thread::spawn(move || {
        println!("Thread B: Trying to lock mutex B");
        let mut b = mutex_b.lock().unwrap();
        println!("Thread B: Locked mutex B");

        thread::sleep(Duration::from_millis(100));

        println!("Thread B: Trying to lock mutex A");
        let mut a = mutex_a.lock().unwrap();
        println!("Thread B: Locked mutex A");

        *a += 1;
        *b += 1;
    });

    thread_a.join().unwrap();
    thread_b.join().unwrap();
}
```

This program will likely deadlock because:

1. Thread A locks mutex A, then tries to lock mutex B
2. Simultaneously, Thread B locks mutex B, then tries to lock mutex A
3. Each thread is waiting for a lock that the other thread holds

To avoid deadlocks:

1. **Lock ordering**: Always acquire locks in a consistent order
2. **Lock timeouts**: Use methods like `try_lock_for` (available with the `parking_lot` crate)
3. **Avoid nested locks**: Minimize the need to hold multiple locks at once
4. **Fine-grained locking**: Use smaller, more focused locks instead of large, coarse-grained ones

Here's the fixed version with consistent lock ordering:

```rust
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

fn main() {
    let mutex_a = Arc::new(Mutex::new(0));
    let mutex_b = Arc::new(Mutex::new(0));

    let mutex_a_clone = Arc::clone(&mutex_a);
    let mutex_b_clone = Arc::clone(&mutex_b);

    let thread_a = thread::spawn(move || {
        // Always lock mutex_a first, then mutex_b
        println!("Thread A: Trying to lock mutex A");
        let mut a = mutex_a_clone.lock().unwrap();
        println!("Thread A: Locked mutex A");

        thread::sleep(Duration::from_millis(100));

        println!("Thread A: Trying to lock mutex B");
        let mut b = mutex_b_clone.lock().unwrap();
        println!("Thread A: Locked mutex B");

        *a += 1;
        *b += 1;
    });

    let thread_b = thread::spawn(move || {
        // Also lock mutex_a first, then mutex_b
        println!("Thread B: Trying to lock mutex A");
        let mut a = mutex_a.lock().unwrap();
        println!("Thread B: Locked mutex A");

        thread::sleep(Duration::from_millis(100));

        println!("Thread B: Trying to lock mutex B");
        let mut b = mutex_b.lock().unwrap();
        println!("Thread B: Locked mutex B");

        *a += 1;
        *b += 1;
    });

    thread_a.join().unwrap();
    thread_b.join().unwrap();
}
```

### Beyond Standard Library: parking_lot

The standard library's synchronization primitives are robust and safe, but sometimes you need more features or better performance. The `parking_lot` crate provides alternative implementations of `Mutex`, `RwLock`, and other synchronization primitives:

```rust
use parking_lot::{Mutex, RwLock};
use std::sync::Arc;
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            // No unwrap needed - parking_lot's Mutex doesn't return a Result
            let mut num = counter.lock();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock());
}
```

Advantages of `parking_lot` over standard library synchronization primitives:

1. **Performance**: Often faster, especially under contention
2. **No poisoning**: Locks don't get poisoned when a thread panics
3. **More features**: Timeouts, try-locking, and fair locks
4. **Smaller size**: Takes up less memory

### Thread-Local Storage vs Shared State

Sometimes, instead of sharing state between threads, it's better to give each thread its own local copy of the data. Rust provides thread-local storage via the `thread_local!` macro:

```rust
use std::cell::RefCell;
use std::thread;

thread_local! {
    static COUNTER: RefCell<u32> = RefCell::new(0);
}

fn main() {
    // Each thread gets its own independent counter
    let handle1 = thread::spawn(|| {
        COUNTER.with(|counter| {
            *counter.borrow_mut() += 1;
            println!("Thread 1: {}", *counter.borrow());
        });
    });

    let handle2 = thread::spawn(|| {
        COUNTER.with(|counter| {
            *counter.borrow_mut() += 1;
            println!("Thread 2: {}", *counter.borrow());
        });
    });

    handle1.join().unwrap();
    handle2.join().unwrap();

    COUNTER.with(|counter| {
        println!("Main thread: {}", *counter.borrow());
    });
}
```

In this example, each thread gets its own independent counter, so there's no need for synchronization.

### Choosing Between Sharing Strategies

When designing concurrent systems, you have several options for handling shared state:

1. **Thread-local storage**: Each thread has its own copy

   - Pros: No synchronization needed, very fast
   - Cons: Data isn't shared, may need to combine results later

2. **Message passing**: Threads communicate by sending messages

   - Pros: Clear ownership, less chance of deadlocks
   - Cons: May require copying data

3. **Shared state with synchronization**: Threads access the same data with locks
   - Pros: Direct access to shared data, no copying needed
   - Cons: Risk of deadlocks, potential contention

Choose the approach that best fits your specific use case, considering factors like data size, access patterns, and performance requirements.

## Channels and Message Passing

While sharing state with synchronization primitives like `Mutex` and `Arc` is powerful, an alternative approach to concurrency is message passing. Instead of sharing memory, threads communicate by sending messages to each other. This paradigm is summed up by the saying: "Do not communicate by sharing memory; instead, share memory by communicating."

### Basic Channel Operations

Rust provides channels through the `std::sync::mpsc` module, where "mpsc" stands for "multiple producer, single consumer". This means that multiple threads can send messages, but only one thread can receive them.

Here's a basic example:

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    // Create a channel
    let (tx, rx) = mpsc::channel();

    // Spawn a thread that will send a message
    thread::spawn(move || {
        // Send a message
        tx.send("Hello from another thread!").unwrap();
    });

    // Receive the message in the main thread
    let message = rx.recv().unwrap();
    println!("Received: {}", message);
}
```

In this example, we create a channel with `mpsc::channel()`, which returns a tuple containing a sender (`tx`) and a receiver (`rx`). We then spawn a thread that sends a message through the channel, and the main thread receives it.

### Multiple Producers

The "mp" in "mpsc" means that multiple threads can send messages through the same channel. Let's see how this works:

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    // Create a channel
    let (tx, rx) = mpsc::channel();

    // Clone the sender for multiple producer threads
    let tx1 = tx.clone();
    let tx2 = tx.clone();

    // Spawn thread 1
    thread::spawn(move || {
        tx1.send("Hello from thread 1").unwrap();
        thread::sleep(Duration::from_millis(100));
        tx1.send("Thread 1 again").unwrap();
    });

    // Spawn thread 2
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(50));
        tx2.send("Hello from thread 2").unwrap();
        thread::sleep(Duration::from_millis(100));
        tx2.send("Thread 2 again").unwrap();
    });

    // Original sender in the main thread
    tx.send("Hello from main thread").unwrap();

    // Drop the original sender to ensure proper cleanup
    drop(tx);

    // Receive all messages
    for message in rx {
        println!("Received: {}", message);
    }
}
```

By cloning the sender (`tx`), we can have multiple threads sending messages through the same channel.

### Synchronous vs. Asynchronous Channels

The standard `mpsc::channel()` is asynchronous, meaning the sender doesn't wait for the receiver to process the message. Rust also provides a synchronous channel with `mpsc::sync_channel()`, which has a bounded buffer:

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    // Create a synchronous channel with a buffer of 2 messages
    let (tx, rx) = mpsc::sync_channel(2);

    thread::spawn(move || {
        println!("Sending message 1");
        tx.send(1).unwrap();

        println!("Sending message 2");
        tx.send(2).unwrap();

        println!("Sending message 3 (this will block until a message is received)");
        tx.send(3).unwrap();

        println!("Message 3 was received, continuing...");
        tx.send(4).unwrap();

        println!("All messages sent");
    });

    // Simulate a slow receiver
    thread::sleep(Duration::from_secs(2));

    for message in rx {
        println!("Received: {}", message);
        thread::sleep(Duration::from_millis(500));
    }
}
```

In this example, the sender will block after sending the third message until the receiver has processed at least one message, freeing up space in the buffer.

### Transferring Ownership Through Channels

Channels transfer ownership of the sent values from the sender to the receiver. This makes them an excellent way to safely share data between threads:

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        // Create a string in this thread
        let message = String::from("Hello from another thread");

        // Send ownership of the string to the receiver
        tx.send(message).unwrap();

        // We can no longer use message here because ownership was transferred
        // println!("After sending: {}", message); // This would cause a compilation error
    });

    // Receive ownership of the string
    let received = rx.recv().unwrap();
    println!("Received: {}", received);
}
```

This ownership transfer ensures that only one thread has access to the data at a time, preventing data races.

### Error Handling with Channels

When using channels, there are two main types of errors to handle:

1. **Send errors**: Occur when the receiver has been dropped
2. **Receive errors**: Occur when all senders have been dropped

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    let (tx, rx) = mpsc::channel();

    let handle = thread::spawn(move || {
        // Wait a bit before trying to send
        thread::sleep(Duration::from_secs(1));

        // At this point, the receiver might have been dropped
        match tx.send("Hello") {
            Ok(()) => println!("Message sent successfully"),
            Err(e) => println!("Failed to send: {}", e),
        }
    });

    // Simulate the receiver being dropped
    drop(rx);

    handle.join().unwrap();

    // -------------------

    let (tx, rx) = mpsc::channel::<String>();

    // Drop the sender without sending anything
    drop(tx);

    // Now try to receive
    match rx.recv() {
        Ok(msg) => println!("Received: {}", msg),
        Err(e) => println!("Failed to receive: {}", e),
    }
}
```

## Thread Pools

Creating a new thread for every task can be inefficient, especially for short-lived tasks. Thread pools solve this problem by maintaining a set of worker threads that are reused for multiple tasks.

### Why Use Thread Pools?

Thread pools offer several advantages:

1. **Reduced overhead**: Thread creation and destruction is expensive
2. **Controlled concurrency**: Limit the number of concurrent tasks
3. **Load balancing**: Distribute work across available threads
4. **Resource management**: Prevent thread exhaustion

### Basic Thread Pool Implementation

Let's implement a simple thread pool to understand the core concepts:

```rust
use std::sync::{mpsc, Arc, Mutex};
use std::thread;

struct ThreadPool {
    workers: Vec<Worker>,
    sender: Option<mpsc::Sender<Job>>,
}

type Job = Box<dyn FnOnce() + Send + 'static>;

impl ThreadPool {
    fn new(size: usize) -> ThreadPool {
        assert!(size > 0);

        let (sender, receiver) = mpsc::channel();
        let receiver = Arc::new(Mutex::new(receiver));

        let mut workers = Vec::with_capacity(size);

        for id in 0..size {
            workers.push(Worker::new(id, Arc::clone(&receiver)));
        }

        ThreadPool {
            workers,
            sender: Some(sender),
        }
    }

    fn execute<F>(&self, f: F)
    where
        F: FnOnce() + Send + 'static,
    {
        let job = Box::new(f);

        self.sender.as_ref().unwrap().send(job).unwrap();
    }
}

impl Drop for ThreadPool {
    fn drop(&mut self) {
        drop(self.sender.take());

        for worker in &mut self.workers {
            println!("Shutting down worker {}", worker.id);

            if let Some(thread) = worker.thread.take() {
                thread.join().unwrap();
            }
        }
    }
}

struct Worker {
    id: usize,
    thread: Option<thread::JoinHandle<()>>,
}

impl Worker {
    fn new(id: usize, receiver: Arc<Mutex<mpsc::Receiver<Job>>>) -> Worker {
        let thread = thread::spawn(move || loop {
            let message = receiver.lock().unwrap().recv();

            match message {
                Ok(job) => {
                    println!("Worker {}: got a job; executing.", id);
                    job();
                }
                Err(_) => {
                    println!("Worker {}: disconnected; shutting down.", id);
                    break;
                }
            }
        });

        Worker {
            id,
            thread: Some(thread),
        }
    }
}

fn main() {
    let pool = ThreadPool::new(4);

    for i in 0..8 {
        pool.execute(move || {
            println!("Processing task {}", i);
            thread::sleep(std::time::Duration::from_secs(1));
            println!("Task {} completed", i);
        });
    }

    // The pool will be dropped at the end of main, which will
    // shut down all workers gracefully.
    println!("All tasks submitted");
}
```

This thread pool creates a fixed number of worker threads and distributes jobs among them using a channel.

## Parallel Iterators

Parallel iterators are one of the most powerful tools for writing concurrent code in Rust. They allow you to perform operations on collections in parallel with minimal effort.

### Introduction to Parallel Iterators

The `rayon` crate provides parallel versions of Rust's standard iterators. The main entry points are:

- `par_iter()`: Parallel immutable iterator
- `par_iter_mut()`: Parallel mutable iterator
- `into_par_iter()`: Parallel iterator that consumes the collection

Let's see a basic example:

```rust
use rayon::prelude::*;

fn main() {
    let v = vec![1, 2, 3, 4, 5, 6, 7, 8];

    // Sequential map and filter
    let sum_sequential: i32 = v.iter()
        .map(|&x| x * x)
        .filter(|&x| x % 2 == 0)
        .sum();

    // Parallel map and filter
    let sum_parallel: i32 = v.par_iter()
        .map(|&x| x * x)
        .filter(|&x| x % 2 == 0)
        .sum();

    println!("Sequential sum: {}", sum_sequential);
    println!("Parallel sum: {}", sum_parallel);
    assert_eq!(sum_sequential, sum_parallel);
}
```

By changing `iter()` to `par_iter()`, we make the computation parallel with minimal code changes.

### Common Parallel Iterator Operations

Parallel iterators support most of the operations that sequential iterators do:

```rust
use rayon::prelude::*;

fn main() {
    let v = vec![1, 2, 3, 4, 5];

    // Parallel map
    let squares: Vec<i32> = v.par_iter().map(|&x| x * x).collect();
    println!("Squares: {:?}", squares);

    // Parallel filter
    let evens: Vec<i32> = v.par_iter().filter(|&&x| x % 2 == 0).cloned().collect();
    println!("Evens: {:?}", evens);

    // Parallel fold (similar to reduce)
    let sum = v.par_iter().fold(|| 0, |acc, &x| acc + x);
    println!("Sum: {}", sum);

    // Parallel reduce
    let product = v.par_iter()
        .cloned()
        .reduce(|| 1, |a, b| a * b);
    println!("Product: {}", product);

    // Parallel for_each
    v.par_iter().for_each(|&x| {
        println!("Processing: {}", x);
    });
}
```

### Comparing Sequential and Parallel Performance

Let's benchmark parallel iterators against sequential ones:

```rust
use rayon::prelude::*;
use std::time::Instant;

fn main() {
    let size = 10_000_000;
    let v: Vec<i32> = (0..size).collect();

    // Warm-up
    let _ = v.iter().map(|&x| x * x).sum::<i64>();
    let _ = v.par_iter().map(|&x| x * x).sum::<i64>();

    // Benchmark sequential
    let start = Instant::now();
    let sum_sequential: i64 = v.iter().map(|&x| x * x).sum();
    let sequential_time = start.elapsed();
    println!("Sequential: {:?}", sequential_time);

    // Benchmark parallel
    let start = Instant::now();
    let sum_parallel: i64 = v.par_iter().map(|&x| x * x).sum();
    let parallel_time = start.elapsed();
    println!("Parallel: {:?}", parallel_time);

    println!("Speedup: {:.2}x", sequential_time.as_secs_f64() / parallel_time.as_secs_f64());
    assert_eq!(sum_sequential, sum_parallel);
}
```

The speedup you'll see depends on:

1. The number of cores in your system
2. The complexity of the computation
3. The size of the data
4. The overhead of parallelization

## Project: Parallel Web Scraper

Let's apply what we've learned to build a practical project—a parallel web scraper that fetches and processes multiple web pages simultaneously.

### Project Outline

Our web scraper will:

1. Take a list of URLs as input
2. Fetch the content of each URL in parallel
3. Extract relevant information (like title and links)
4. Save the results to a file

### Dependencies

First, let's define the dependencies we'll need in our `Cargo.toml`:

```toml
[dependencies]
reqwest = { version = "0.11", features = ["blocking"] }
rayon = "1.5"
scraper = "0.13"
url = "2.2"
anyhow = "1.0"
```

### Basic Structure

Here's the implementation of our parallel web scraper:

```rust
use anyhow::{Context, Result};
use rayon::prelude::*;
use reqwest::blocking::Client;
use scraper::{Html, Selector};
use std::collections::HashSet;
use std::fs::File;
use std::io::Write;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use url::Url;

// Structure to hold scraped data for a page
#[derive(Debug)]
struct PageData {
    url: String,
    title: String,
    links: Vec<String>,
}

// Fetch and parse a single URL
fn scrape_url(client: &Client, url: &str) -> Result<PageData> {
    println!("Fetching: {}", url);

    // Fetch the page content
    let response = client.get(url).send()
        .with_context(|| format!("Failed to fetch {}", url))?;

    let status = response.status();
    if !status.is_success() {
        anyhow::bail!("Failed to fetch {}: {}", url, status);
    }

    let content = response.text()
        .with_context(|| format!("Failed to read content from {}", url))?;

    // Parse the HTML
    let document = Html::parse_document(&content);

    // Extract the title
    let title_selector = Selector::parse("title").unwrap();
    let title = document.select(&title_selector)
        .next()
        .map(|element| element.text().collect::<Vec<_>>().join(""))
        .unwrap_or_else(|| "No title".to_string());

    // Extract links
    let link_selector = Selector::parse("a[href]").unwrap();
    let base_url = Url::parse(url)?;

    let mut links = Vec::new();
    for element in document.select(&link_selector) {
        if let Some(href) = element.value().attr("href") {
            if let Ok(absolute_url) = base_url.join(href) {
                links.push(absolute_url.to_string());
            }
        }
    }

    Ok(PageData {
        url: url.to_string(),
        title,
        links,
    })
}

// Main function to scrape multiple URLs in parallel
fn parallel_scrape(urls: Vec<String>) -> Result<Vec<PageData>> {
    // Create a shared HTTP client
    let client = Client::new();

    // Use a mutex to collect errors from parallel tasks
    let errors = Arc::new(Mutex::new(Vec::new()));

    // Scrape URLs in parallel
    let results: Vec<Option<PageData>> = urls.par_iter()
        .map(|url| {
            match scrape_url(&client, url) {
                Ok(data) => Some(data),
                Err(err) => {
                    let mut errors = errors.lock().unwrap();
                    errors.push(format!("Error scraping {}: {}", url, err));
                    None
                }
            }
        })
        .collect();

    // Report any errors
    let errors = errors.lock().unwrap();
    for error in errors.iter() {
        eprintln!("{}", error);
    }

    // Filter out None values (failed scrapes)
    let results: Vec<PageData> = results.into_iter()
        .filter_map(|x| x)
        .collect();

    Ok(results)
}

// Save the scraped data to a file
fn save_results(results: &[PageData], filename: &str) -> Result<()> {
    let mut file = File::create(filename)
        .with_context(|| format!("Failed to create file: {}", filename))?;

    for page in results {
        writeln!(file, "URL: {}", page.url)?;
        writeln!(file, "Title: {}", page.title)?;
        writeln!(file, "Links: {}", page.links.len())?;

        for link in &page.links {
            writeln!(file, "  - {}", link)?;
        }

        writeln!(file)?;
    }

    Ok(())
}

// Find unique domains in the scraped data
fn find_unique_domains(results: &[PageData]) -> HashSet<String> {
    let mut domains = HashSet::new();

    for page in results {
        if let Ok(url) = Url::parse(&page.url) {
            if let Some(domain) = url.host_str() {
                domains.insert(domain.to_string());
            }
        }

        for link in &page.links {
            if let Ok(url) = Url::parse(link) {
                if let Some(domain) = url.host_str() {
                    domains.insert(domain.to_string());
                }
            }
        }
    }

    domains
}

fn main() -> Result<()> {
    // List of URLs to scrape
    let urls = vec![
        "https://www.rust-lang.org".to_string(),
        "https://blog.rust-lang.org".to_string(),
        "https://crates.io".to_string(),
        "https://doc.rust-lang.org".to_string(),
        "https://www.github.com/rust-lang/rust".to_string(),
    ];

    println!("Starting parallel web scraper...");
    let start = Instant::now();

    // Perform the parallel scrape
    let results = parallel_scrape(urls)?;

    let elapsed = start.elapsed();
    println!("Scraped {} pages in {:.2?}", results.len(), elapsed);

    // Save results to a file
    save_results(&results, "scrape_results.txt")?;

    // Find and display unique domains
    let domains = find_unique_domains(&results);
    println!("Found {} unique domains:", domains.len());
    for domain in domains {
        println!("  - {}", domain);
    }

    Ok(())
}
```

### How It Works

1. We use `rayon` for parallel processing of URLs
2. `reqwest` handles the HTTP requests
3. `scraper` parses the HTML content
4. We use a thread-safe error collection mechanism with `Arc<Mutex<Vec<String>>>`
5. The scraper extracts titles and links from each page
6. Results are saved to a file and statistics are displayed

### Extending the Project

Here are some ways you could extend this web scraper:

1. **Add depth control**: Implement recursive crawling with a maximum depth
2. **Respect robots.txt**: Add a parser for robots.txt to avoid scraping disallowed pages
3. **Add rate limiting**: Implement delays between requests to the same domain
4. **Improve error handling**: Add retries for failed requests
5. **Add more extractors**: Extract additional information like meta tags, images, etc.
6. **Use async/await**: Convert to asynchronous code for potentially better performance

This project demonstrates how to use Rust's concurrency features for a real-world task, combining threads, synchronization, and parallel iterators to efficiently process multiple web pages.

## Summary

In this chapter, we've explored Rust's approach to concurrency, which combines powerful primitives with compile-time safety guarantees. We've covered:

1. **Concurrency vs. Parallelism**: Understanding the difference between structure (concurrency) and execution (parallelism)
2. **Threads**: Creating and managing threads with `std::thread`
3. **Thread Safety**: How Rust's type system prevents data races with `Send` and `Sync` traits
4. **Race Conditions**: Understanding and preventing more subtle concurrency bugs
5. **Sharing State**: Using `Mutex`, `RwLock`, and `Arc` for safe shared access
6. **Message Passing**: Using channels for communication between threads
7. **Thread Pools**: Managing groups of worker threads for efficient task execution
8. **Parallel Iterators**: Processing collections in parallel with minimal code changes

Rust's approach to concurrency is unique among programming languages. Rather than relying on runtime checks or programmer discipline, it leverages the type system to prevent many common concurrency bugs at compile time. This "fearless concurrency" allows you to write concurrent code with confidence, knowing that the compiler has your back.

As you build concurrent systems in Rust, remember these key principles:

1. **Be explicit about sharing**: Use the appropriate synchronization primitives when sharing data
2. **Consider message passing**: Often simpler and less error-prone than shared state
3. **Use high-level abstractions**: Libraries like `rayon` make parallelism accessible
4. **Measure performance**: Don't assume parallelism always improves performance
5. **Mind the cost of synchronization**: Locking and thread coordination have overhead

With these tools and principles, you're well-equipped to write safe, efficient concurrent code in Rust.

## Exercises

1. **Channel Calculator**: Implement a calculator where operations are sent through channels to worker threads, with results returned through another channel.

2. **Thread-safe Counter**: Create a counter that can be safely incremented from multiple threads, then implement versions using `Mutex`, `atomic`, and a channel-based approach. Compare their performance.

3. **Parallel File Processor**: Write a program that processes multiple files in parallel, calculating statistics like word count, line count, and character frequencies.

4. **Custom Thread Pool**: Extend the thread pool implementation with features like task priorities, task cancellation, and worker thread statistics.

5. **Parallel Merge Sort**: Implement a parallel version of the merge sort algorithm using `rayon`.

6. **Web API Aggregator**: Create a program that fetches data from multiple API endpoints in parallel and combines the results.

7. **Parallel Image Processing**: Write a program that applies filters to images in parallel, using a thread for each region of the image.

8. **Concurrent Map**: Implement a thread-safe map data structure that allows concurrent reads and writes.

9. **Lock-free Stack**: Implement a lock-free stack using atomic operations.

10. **Parallel Graph Algorithm**: Implement a parallel graph traversal algorithm like breadth-first search.

## Further Reading

- [The Rust Programming Language - Fearless Concurrency](https://doc.rust-lang.org/book/ch16-00-concurrency.html)
- [Rust By Example - Concurrency](https://doc.rust-lang.org/rust-by-example/std_misc/threads.html)
- [The Rayon Crate Documentation](https://docs.rs/rayon/)
- [The Parking Lot Crate Documentation](https://docs.rs/parking_lot/)
- [Programming Rust - O'Reilly book with excellent coverage of concurrency](https://www.oreilly.com/library/view/programming-rust-2nd/9781492052586/)
- [Rust Atomics and Locks - Jon Gjengset's book on low-level concurrency](https://marabos.nl/atomics/)
- [Crossbeam Documentation](https://docs.rs/crossbeam/) - Advanced concurrency primitives
- [Tokio Documentation](https://docs.rs/tokio/) - Asynchronous runtime for Rust
