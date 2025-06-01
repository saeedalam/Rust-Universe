# Chapter 25: Asynchronous Programming

## Introduction

In the previous chapter, we explored thread-based concurrency in Rust, which offers a powerful way to execute multiple tasks simultaneously. However, thread-based concurrency has inherent limitations: threads consume significant system resources, context switching between threads incurs overhead, and managing shared state across threads requires careful synchronization.

Asynchronous programming provides an alternative approach to concurrency. Instead of relying on the operating system to manage multiple threads, asynchronous code allows a single thread to efficiently juggle multiple tasks by working on each task when it's ready to make progress and pausing it when it would otherwise wait. This approach can dramatically improve the scalability of I/O-bound applications, allowing them to handle thousands or even millions of concurrent operations with minimal resource usage.

Rust's approach to asynchronous programming is both powerful and unique. Rather than building async functionality directly into the language's runtime like JavaScript or Go, Rust takes a more explicit approach. The language provides core primitives like `async`/`await` syntax and the `Future` trait, while leaving the actual execution of asynchronous tasks to specialized libraries called async runtimes.

This design offers remarkable flexibility and performance. Applications can choose the runtime that best fits their specific needs, and the zero-cost abstraction principle ensures that Rust's async code compiles down to efficient state machines with minimal overhead.

In this chapter, we'll explore the world of asynchronous programming in Rust from the ground up. We'll begin by understanding the core concepts, work through the `async`/`await` syntax, delve into the mechanics of futures, and examine how async runtimes like Tokio and async-std execute them. By the end, you'll be equipped to write efficient, robust asynchronous code that can handle enormous concurrency demands while maintaining Rust's guarantees of safety and reliability.

## Why Async Programming?

Before diving into the technical details, let's understand why asynchronous programming has become so important in modern software development.

### The Concurrency Challenge

Modern applications frequently need to handle numerous concurrent operations:

- Web servers processing thousands of simultaneous requests
- Database systems maintaining many active connections
- Chat applications with countless users sending messages
- IoT platforms collecting data from thousands of devices

Traditional thread-based approaches quickly hit scaling limitations:

```rust
// Thread-based approach to handle many connections
fn main() -> std::io::Result<()> {
    let listener = std::net::TcpListener::bind("127.0.0.1:8080")?;

    for stream in listener.incoming() {
        let stream = stream?;

        // Spawn a thread for each connection
        std::thread::spawn(|| {
            handle_connection(stream);
        });
    }

    Ok(())
}

fn handle_connection(mut stream: std::net::TcpStream) {
    // Read and process data, potentially blocking
    // ...
}
```

While this code works for a moderate number of connections, it doesn't scale well. Each thread:

1. **Consumes memory**: Typically 1-8 MB for the thread stack
2. **Adds scheduling overhead**: The OS must switch between threads
3. **Increases contention**: More threads means more lock contention

### The I/O Bottleneck

In many applications, tasks spend most of their time waiting for I/O operations:

- Waiting for network responses
- Reading from or writing to files
- Waiting for database queries to complete

During this waiting time, the thread is blocked and cannot do useful work:

```
Thread 1: ████████░░░░░░░░░░████████░░░░░░░░░░░░░░████████
          │        │         │        │              │
          └──CPU   └──Wait   └──CPU   └──Wait        └──CPU
```

This inefficiency becomes critical at scale. If each connection requires a dedicated thread, and each thread spends 95% of its time waiting, we're wasting significant resources.

### The Async Solution

Asynchronous programming addresses these challenges by:

1. **Decoupling tasks from threads**: Many tasks can run on a single thread
2. **Eliminating blocking waits**: When a task would block, it yields control
3. **Utilizing wait time efficiently**: The thread can work on other tasks while waiting

```
Single Thread: ████████████████████████████████████████████████
               │      │      │      │      │      │      │
               │      │      │      │      │      │      │
Task 1:        ████░░░░░░░░░░████░░░░░░░░░░░░░░░░░░████░░░░░░
Task 2:        ░░░░████░░░░░░░░░░████░░░░░░░░░░░░░░░░░░████░░
Task 3:        ░░░░░░░░████░░░░░░░░░░████░░░░░░░░░░░░░░░░░░██
```

In this model, a single thread can efficiently handle thousands of concurrent tasks by working on each one precisely when it can make progress.

### The Case for Async Rust

Rust's async model offers unique advantages:

1. **Zero-cost abstraction**: Async code compiles to efficient state machines
2. **Type safety and ownership**: Prevents data races and memory safety issues
3. **No garbage collection**: Predictable, low-latency performance
4. **Fearless concurrency**: The compiler prevents common concurrency bugs
5. **Flexible runtime model**: Choose the runtime that suits your needs

Consider a simplified comparison between the thread-based and async approaches for handling 10,000 concurrent connections:

```
┌───────────────┬───────────────────┬───────────────────┐
│ Approach      │ Memory Usage      │ Context Switches  │
├───────────────┼───────────────────┼───────────────────┤
│ Thread-based  │ ~10-80 GB         │ Thousands/second  │
│ Async         │ ~10-100 MB        │ Near zero         │
└───────────────┴───────────────────┴───────────────────┘
```

The async approach allows applications to efficiently utilize system resources, resulting in better scalability, responsiveness, and cost-effectiveness.

### When to Use Async

Despite its advantages, async programming isn't always the right choice:

**Use async when:**

- Handling many concurrent operations
- Most operations are I/O bound
- Scalability is a primary concern
- Latency requirements are strict

**Consider threads when:**

- Tasks are CPU-intensive
- Tasks don't need to coordinate much
- The number of concurrent tasks is small
- Simplicity is more important than maximum scalability

In the next sections, we'll explore how Rust implements asynchronous programming and how to effectively write async code.

## Understanding async/await

At the heart of Rust's asynchronous programming model is the `async`/`await` syntax. This syntax provides an intuitive way to write asynchronous code that looks and feels like synchronous code, making it easier to reason about complex asynchronous operations.

### Fundamentals of async/await

The `async` keyword transforms a block of code or function into a state machine that implements the `Future` trait. A `Future` represents a computation that may not have completed yet.

The `await` keyword suspends execution until the specified future completes, allowing other tasks to run in the meantime.

Let's see a basic example:

```rust
async fn fetch_data(url: &str) -> Result<String, reqwest::Error> {
    let response = reqwest::get(url).await?;
    let text = response.text().await?;
    Ok(text)
}
```

This function:

1. Initiates an HTTP request to the specified URL
2. Awaits the response without blocking the thread
3. Extracts the text content, again without blocking
4. Returns the result

The key insight is that when we `await` a future, we're telling the runtime, "I can't proceed until this operation completes, so feel free to run something else in the meantime."

### Async Functions

Rust allows you to create asynchronous functions using the `async fn` syntax:

```rust
// Synchronous function
fn regular_function() -> String {
    "Hello, world!".to_string()
}

// Asynchronous function
async fn async_function() -> String {
    "Hello, async world!".to_string()
}
```

The difference is crucial: `regular_function()` returns a `String` directly, while `async_function()` returns an implementation of `Future<Output = String>`. This future needs to be `await`ed or executed by a runtime to actually produce the string value.

### Async Blocks

In addition to async functions, Rust supports async blocks, which create anonymous futures:

```rust
fn main() {
    let future = async {
        println!("Hello from an async block!");
        42
    };

    // The future hasn't run yet - it needs to be executed by a runtime
    println!("Created a future");
}
```

Async blocks are useful when you need to create a future without defining a separate function, or when you need to capture variables from the surrounding scope.

### Using await

The `await` keyword is used inside async functions or blocks to suspend execution until a future completes:

```rust
async fn process_data() -> Result<(), reqwest::Error> {
    // Start multiple operations
    let future1 = fetch_data("https://example.com/data1");
    let future2 = fetch_data("https://example.com/data2");

    // Wait for both to complete
    let result1 = future1.await?;
    let result2 = future2.await?;

    // Process the results
    println!("Got data: {} and {}", result1, result2);

    Ok(())
}
```

When an `await` is encountered, the current async task is suspended, and control returns to the async runtime, which can execute other tasks. When the awaited future completes, the runtime resumes the task from where it left off.

### Executing Async Code

Importantly, simply calling an async function does not execute it:

```rust
fn main() {
    // This only creates a future, it doesn't run it
    let future = fetch_data("https://example.com");

    // The future needs to be executed by a runtime
    // ...
}
```

To actually run async code, you need an async runtime like Tokio:

```rust
#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    // Now we can use await
    let data = fetch_data("https://example.com").await?;
    println!("Received: {}", data);
    Ok(())
}
```

The `#[tokio::main]` attribute transforms the `main` function into a regular function that initializes the Tokio runtime and executes our async code.

### Behind the Scenes

To better understand `async`/`await`, let's peek under the hood. When the compiler sees an async function like this:

```rust
async fn example(value: u32) -> u32 {
    println!("Processing: {}", value);
    let intermediate = process_value(value).await;
    intermediate + 1
}
```

It effectively transforms it into a state machine that looks conceptually like this:

```rust
enum ExampleStateMachine {
    Start(u32),
    WaitingOnProcessValue {
        value: u32,
        future: ProcessValueFuture,
    },
    Completed,
}

impl Future for ExampleStateMachine {
    type Output = u32;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        match self.as_mut().get_mut() {
            ExampleStateMachine::Start(value) => {
                println!("Processing: {}", value);
                let future = process_value(*value);

                // Update state
                *self = ExampleStateMachine::WaitingOnProcessValue {
                    value: *value,
                    future,
                };

                // Try to make progress immediately
                self.poll(cx)
            }

            ExampleStateMachine::WaitingOnProcessValue { future, value } => {
                match Pin::new(future).poll(cx) {
                    Poll::Ready(intermediate) => {
                        let result = intermediate + 1;
                        *self = ExampleStateMachine::Completed;
                        Poll::Ready(result)
                    }
                    Poll::Pending => Poll::Pending,
                }
            }

            ExampleStateMachine::Completed => {
                panic!("Future polled after completion")
            }
        }
    }
}
```

This transformation:

1. Tracks the state of execution (where in the function we are)
2. Stores any variables needed across await points
3. Implements the `poll` method to make progress when possible
4. Returns `Poll::Pending` when it can't proceed further

This state machine approach is what makes Rust's async programming so efficient. There's no thread overhead, and the compiler can optimize the state representation.

### Async Lifetime Rules

Async functions have special lifetime rules because they return futures that may not complete immediately:

```rust
// This won't compile!
async fn borrow_string(s: &str) -> &str {
    s
}
```

The problem is that the returned future might be `await`ed after `s` is no longer valid. Instead, we need to ensure the returned reference lives as long as the input:

```rust
// This works
async fn borrow_string<'a>(s: &'a str) -> &'a str {
    s
}
```

Or more commonly, we might avoid the issue by returning an owned value:

```rust
async fn process_string(s: &str) -> String {
    s.to_uppercase()
}
```

Understanding these lifetime considerations is essential for writing correct async Rust code.

### Common Patterns with async/await

Here are some common patterns you'll encounter when using `async`/`await`:

#### Sequential Execution

When you await futures one after another, they execute sequentially:

```rust
async fn sequential() -> Result<(), Error> {
    let data1 = fetch_data("url1").await?;
    let data2 = fetch_data("url2").await?;
    let data3 = fetch_data("url3").await?;

    process_results(data1, data2, data3);
    Ok(())
}
```

#### Concurrent Execution

To execute futures concurrently, create them first, then await them:

```rust
async fn concurrent() -> Result<(), Error> {
    let future1 = fetch_data("url1");
    let future2 = fetch_data("url2");
    let future3 = fetch_data("url3");

    let (data1, data2, data3) = tokio::join!(future1, future2, future3);

    process_results(data1?, data2?, data3?);
    Ok(())
}
```

The `join!` macro awaits multiple futures concurrently and returns their results as a tuple.

#### Error Handling

Async functions work seamlessly with Rust's error handling mechanisms:

```rust
async fn with_error_handling() -> Result<(), Error> {
    let result = fetch_data("https://example.com").await?;

    if result.is_empty() {
        return Err(Error::EmptyResponse);
    }

    process_data(&result).await?;
    Ok(())
}
```

The `?` operator works as expected, propagating errors through the async function.

In the next section, we'll explore how async programming differs from thread-based concurrency and the trade-offs involved.

## How Async Differs from Threads

We've already seen that asynchronous programming provides an alternative to thread-based concurrency, but let's examine the specific differences and trade-offs in more detail.

### Conceptual Differences

The fundamental conceptual difference is how the two approaches handle concurrent tasks:

1. **Thread-based concurrency** uses multiple execution contexts managed by the operating system. Each thread has its own stack and runs independently, with the OS scheduler determining when each thread executes.

2. **Async concurrency** uses a single thread (or a small number of threads) to interleave the execution of multiple tasks. Tasks explicitly yield control at specific points (when they would otherwise block), allowing other tasks to run.

Let's visualize this difference:

```
Thread-based concurrency:
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│     Thread 1      │  │     Thread 2      │  │     Thread 3      │
│  ┌─────────────┐  │  │  ┌─────────────┐  │  │  ┌─────────────┐  │
│  │   Task A    │  │  │  │   Task B    │  │  │  │   Task C    │  │
│  └─────────────┘  │  │  └─────────────┘  │  │  └─────────────┘  │
└───────────────────┘  └───────────────────┘  └───────────────────┘
      OS Scheduler controls switching between threads

Async concurrency:
┌───────────────────────────────────────────────────────────────┐
│                          Thread                               │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐   │
│  │   Task A    │  →   │   Task B    │  →   │   Task C    │   │
│  └─────────────┘      └─────────────┘      └─────────────┘   │
└───────────────────────────────────────────────────────────────┘
      Tasks yield control at await points
```

### Resource Usage

The resource differences between the two approaches are significant:

#### Memory Usage

- **Threads**: Each thread requires its own stack (typically 1-8 MB) regardless of how much stack space is actually used. For thousands of threads, this quickly adds up.

- **Async Tasks**: Tasks share the stack of the thread they run on, and only the state needed between yield points is stored on the heap. This allows a single thread to handle thousands or even millions of tasks with minimal memory overhead.

```rust
// Memory usage for 10,000 concurrent operations

// Thread approach: ~10-80 GB (10,000 × 1-8 MB)
for _ in 0..10_000 {
    std::thread::spawn(|| {
        // Each thread gets a 1-8 MB stack
        process_request();
    });
}

// Async approach: ~10-50 MB total
for _ in 0..10_000 {
    tokio::spawn(async {
        // Each task might use only a few KB
        process_request().await;
    });
}
```

#### CPU Utilization

- **Threads**: Context switching between threads is expensive. The OS must save and restore CPU registers, update memory mappings, and flush caches. At scale, this overhead becomes significant.

- **Async Tasks**: Switching between tasks is a simple function call with minimal overhead. The runtime has complete control over task scheduling and can make intelligent decisions about which tasks to run next.

#### Scaling Limits

- **Threads**: Most systems have practical limits (a few thousand threads) before performance degrades significantly due to scheduling overhead and memory pressure.

- **Async Tasks**: Practical limits are much higher—often hundreds of thousands or millions of tasks—because the overhead per task is so low.

### Control Flow Differences

The control flow in threaded and async code is fundamentally different:

#### Thread Control Flow

In threaded code, control flow is implicit. A thread continues executing until it's preempted by the OS scheduler, blocks on I/O, or explicitly yields control:

```rust
fn thread_function() {
    // This runs start-to-finish unless preempted by the OS
    let data = fetch_data_blocking();  // Thread blocks here
    process_data(data);                // Continues when data arrives
}
```

#### Async Control Flow

In async code, control flow is explicit. The programmer must mark points where the task can yield control using `await`:

```rust
async fn async_function() {
    // Control may yield to other tasks at await points
    let data = fetch_data().await;  // Explicitly yields control
    process_data(data).await;       // Yields again if processing is async
}
```

This explicit control flow can make async code more predictable but requires more careful consideration by the programmer.

### Error Handling and Cancellation

The two approaches handle errors and cancellation differently:

#### Thread Error Handling

In threaded code, errors can be propagated through normal return values, panic handling, or message passing:

```rust
fn thread_function() -> Result<(), Error> {
    // Error handling within a thread
    let result = risky_operation()?;

    // If a thread panics, it typically affects only that thread
    // unless you're using thread::join() or shared state
    Ok(())
}
```

#### Async Error Handling

Async code typically uses the same error handling mechanisms, but with some important differences:

```rust
async fn async_function() -> Result<(), Error> {
    // Propagating errors works with the ? operator
    let result = risky_operation().await?;

    // Panics in async code can be trickier to handle
    // and may affect the entire runtime if not properly caught
    Ok(())
}
```

#### Cancellation

- **Threads**: Canceling a thread safely is difficult. The typical approach is to use a shared flag that the thread checks periodically, or to use platform-specific thread cancellation mechanisms.

- **Async Tasks**: Many async runtimes provide structured cancellation, allowing tasks to be cleanly canceled when they're no longer needed. Dropped futures in Rust are typically not polled again.

```rust
// Cancellation in async code using drop and select
async fn with_timeout<T>(
    future: impl Future<Output = T>,
    timeout: Duration,
) -> Option<T> {
    tokio::select! {
        result = future => Some(result),
        _ = tokio::time::sleep(timeout) => None,
    }
}
```

### CPU-Bound vs. I/O-Bound Work

The two approaches have different strengths depending on the nature of the work:

#### CPU-Bound Work

- **Threads**: Excellent for CPU-bound tasks that need to run in parallel. Each thread can fully utilize a CPU core without yielding.

- **Async**: Not ideal for CPU-bound tasks, as a CPU-intensive task will prevent other tasks on the same thread from making progress until it reaches an `await` point.

```rust
// CPU-bound work is better with threads
fn thread_approach() {
    let cpus = num_cpus::get();
    let pool = rayon::ThreadPoolBuilder::new()
        .num_threads(cpus)
        .build()
        .unwrap();

    pool.install(|| {
        // Each task gets its own thread and can use a full CPU
        (0..1000).into_par_iter().for_each(|i| {
            heavy_computation(i);
        });
    });
}
```

#### I/O-Bound Work

- **Threads**: Less efficient for I/O-bound work, as blocked threads waste resources.

- **Async**: Ideal for I/O-bound tasks, as it can efficiently multiplex many I/O operations on a few threads.

```rust
// I/O-bound work is better with async
async fn async_approach() {
    let mut handles = vec![];

    for i in 0..1000 {
        handles.push(tokio::spawn(async move {
            // While waiting for I/O, other tasks can run
            let result = fetch_data(i).await;
            process_result(result).await;
        }));
    }

    for handle in handles {
        let _ = handle.await;
    }
}
```

### Debugging and Profiling

The two approaches present different challenges for debugging and profiling:

- **Threads**: Thread behavior can be non-deterministic due to OS scheduling, making some bugs hard to reproduce. However, thread-based code is often easier to step through in a debugger.

- **Async**: Async code transforms into state machines, which can make debugging more difficult. Stack traces may not show the complete picture of how execution reached a particular point. However, async execution is often more deterministic.

### Interoperability

The two approaches can be combined, but with some considerations:

- **Running async code in threads**: Async runtimes typically provide ways to run async code from synchronous contexts:

```rust
fn sync_function() -> Result<String, reqwest::Error> {
    // Run async code from a synchronous function
    tokio::runtime::Runtime::new()
        .unwrap()
        .block_on(async {
            fetch_data("https://example.com").await
        })
}
```

- **Running blocking code in async**: Async runtimes provide ways to run blocking code without blocking the entire async thread:

```rust
async fn async_function() -> Result<(), std::io::Error> {
    // Run blocking code in a dedicated thread pool
    let result = tokio::task::spawn_blocking(|| {
        // This code runs in a thread pool dedicated to blocking operations
        std::fs::read_to_string("large_file.txt")
    }).await??;

    println!("File contents: {}", result);
    Ok(())
}
```

### When to Choose Each Approach

Based on these differences, here are some guidelines for choosing between threads and async:

#### Choose Threads When:

- You're doing CPU-intensive work
- You need true parallelism
- You have a small number of tasks
- You want simpler debugging
- You need to integrate with blocking APIs
- Latency of individual operations is not critical

#### Choose Async When:

- You're doing I/O-bound work
- You need to handle many concurrent operations
- Memory usage per task is a concern
- You want fine-grained control over scheduling
- Low latency is critical
- You're working primarily with non-blocking APIs

Often, the best approach is to combine both: use a small number of threads (typically one per CPU core) running async executors, which then manage a large number of lightweight async tasks.

## Futures and the Future Trait

At the core of Rust's async programming model is the `Future` trait, which represents a computation that will complete at some point. Understanding futures is essential for effective async programming in Rust.

### The Future Trait

The `Future` trait is defined in the standard library as follows:

```rust
pub trait Future {
    type Output;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>;
}
```

Let's break down the key components:

- **`Output`**: The type that the future will eventually produce when it completes.

- **`poll`**: The method called to make progress on the future. It returns either:

  - `Poll::Pending` if the future is not yet complete
  - `Poll::Ready(result)` if the future has completed with `result`

- **`Pin<&mut Self>`**: Ensures that the future can't be moved in memory once it's been polled. This is crucial for futures that contain self-references.

- **`Context`**: Provides a way for the future to register a "waker" that will be notified when the future can make progress.

### Creating Futures

There are several ways to create futures in Rust:

#### 1. Using async/await

The most common way is through `async` functions or blocks, which the compiler transforms into futures:

```rust
// This function returns an implementation of Future<Output = u32>
async fn answer() -> u32 {
    42
}

// This creates a future using an async block
let future = async {
    let x = answer().await;
    x + 1
};
```

#### 2. Implementing the Future Trait Manually

For advanced cases, you can implement the `Future` trait directly:

```rust
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

struct MyFuture {
    value: u32,
}

impl Future for MyFuture {
    type Output = u32;

    fn poll(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Self::Output> {
        // This future completes immediately
        Poll::Ready(self.value)
    }
}

// Create and use our custom future
let future = MyFuture { value: 42 };
```

#### 3. Using Combinators

Some libraries provide combinator functions that transform or combine futures:

```rust
use futures::future::{self, FutureExt, TryFutureExt};

async fn example() -> Result<(), Box<dyn std::error::Error>> {
    // Create a future that returns Ok(42)
    let future = future::ready(Ok(42));

    // Transform the future's output using map
    let mapped = future.map(|x| x * 2);

    // Chain futures with and_then
    let chained = future.and_then(|x| async move {
        if x > 0 {
            Ok(x)
        } else {
            Err("Negative number".into())
        }
    });

    // Await the result
    let result = chained.await?;
    println!("Result: {}", result);

    Ok(())
}
```

### Understanding Poll and Waking

The key to understanding how futures work is the polling model. Unlike promises or callbacks in other languages, Rust futures are lazy and make progress only when polled.

#### The Polling Model

1. When you `await` a future or a runtime executes it, the runtime calls `poll()` on the future.
2. If the future can complete immediately, it returns `Poll::Ready(result)`.
3. If the future can't complete yet (e.g., waiting for I/O), it returns `Poll::Pending`.
4. Before returning `Pending`, the future registers a "waker" in the provided `Context`.
5. When the future can make progress (e.g., I/O is ready), it calls the waker.
6. The runtime receives the wake notification and polls the future again.

This "push-pull" model is efficient because futures are only polled when they can actually make progress.

Here's a simplified example of a future that waits for a value to be available:

```rust
use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll, Waker};

struct SharedState {
    value: Option<String>,
    waker: Option<Waker>,
}

struct ValueFuture {
    state: Arc<Mutex<SharedState>>,
}

impl Future for ValueFuture {
    type Output = String;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let mut state = self.state.lock().unwrap();

        if let Some(value) = state.value.take() {
            // Value is ready, return it
            Poll::Ready(value)
        } else {
            // Value is not ready, register waker for later notification
            state.waker = Some(cx.waker().clone());
            Poll::Pending
        }
    }
}

// Function to set the value and wake the future
fn set_value(state: Arc<Mutex<SharedState>>, value: String) {
    let mut state = state.lock().unwrap();
    state.value = Some(value);

    // If there's a waker, notify it that the value is ready
    if let Some(waker) = state.waker.take() {
        waker.wake();
    }
}
```

#### Nested Polling

When futures are composed (e.g., one future awaits another), polling propagates through the future chain. When you `await` a future inside an async function, the compiler generates code that:

1. Polls the inner future
2. Returns `Poll::Pending` if the inner future returns `Pending`
3. Continues execution if the inner future returns `Ready`

### Pin and Self-referential Futures

The `Pin` type plays a crucial role in Rust's async system. It ensures that a future cannot be moved in memory once it's been polled.

#### Why Pin is Necessary

Futures generated by `async`/`await` often contain self-references—references to data within the same future. For example:

```rust
async fn self_referential() {
    let s = String::from("Hello");
    let s_ref = &s;  // This is a reference to `s`

    // Between these two await points, the future's state includes
    // both `s` and a reference to it
    something_else().await;

    println!("{}", s_ref);
    another_thing().await;
}
```

If this future could be moved in memory after being polled, the reference `s_ref` would become invalid because it points to the old location of `s`. `Pin` prevents this problem by ensuring the future stays in one place.

#### Using Pin

Most of the time, you don't need to work with `Pin` directly, as the async runtime handles it for you. However, when implementing custom futures or working with low-level async code, you'll need to understand `Pin`.

Here's an example of creating a pinned future:

```rust
use std::pin::Pin;
use futures::Future;

async fn example() -> i32 {
    42
}

fn pin_example() {
    // Create a future
    let future = example();

    // Pin it to the stack (unsafe because we must guarantee it won't move)
    let mut pinned = unsafe { Pin::new_unchecked(&mut future) };

    // Now we can poll it
    // (though we'd normally use a runtime instead of polling manually)
}
```

For safe pinning, you can use `Box::pin`:

```rust
use std::pin::Pin;
use futures::Future;

async fn example() -> i32 {
    42
}

fn pin_example() {
    // Create a future and pin it to the heap
    let pinned: Pin<Box<dyn Future<Output = i32>>> = Box::pin(example());

    // Now we can poll it safely
}
```

### Common Future Combinators

The `futures` crate provides many useful combinators for working with futures:

#### Joining Futures

To run multiple futures concurrently and wait for all of them:

```rust
use futures::future;

async fn join_example() -> Result<(), Box<dyn std::error::Error>> {
    // Execute three futures concurrently
    let (result1, result2, result3) = future::join3(
        fetch_data("url1"),
        fetch_data("url2"),
        fetch_data("url3"),
    ).await;

    println!("Results: {}, {}, {}", result1?, result2?, result3?);
    Ok(())
}
```

#### Selecting Futures

To wait for the first of multiple futures to complete:

```rust
use futures::future;
use std::time::Duration;
use tokio::time;

async fn select_example() {
    // Create two futures
    let fast = async {
        time::sleep(Duration::from_millis(100)).await;
        "fast"
    };

    let slow = async {
        time::sleep(Duration::from_millis(200)).await;
        "slow"
    };

    // Wait for the first to complete
    let winner = future::select(fast, slow).await;

    match winner {
        future::Either::Left((result, _remaining_future)) => {
            println!("Fast future completed first with: {}", result);
        }
        future::Either::Right((result, _remaining_future)) => {
            println!("Slow future completed first with: {}", result);
        }
    }
}
```

#### Transforming Futures

To transform the output of a future:

```rust
use futures::future::FutureExt;

async fn transform_example() -> Result<(), Box<dyn std::error::Error>> {
    let data = fetch_data("https://example.com")
        .map(|result| {
            result.map(|text| text.to_uppercase())
        })
        .await?;

    println!("Transformed data: {}", data);
    Ok(())
}
```

### Stream: Asynchronous Iterators

While `Future` represents a single asynchronous value, the `Stream` trait represents a sequence of asynchronous values—essentially an asynchronous iterator:

```rust
pub trait Stream {
    type Item;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>>;
}
```

Streams are useful for handling sequences of events or data chunks:

```rust
use futures::stream::{self, StreamExt};

async fn stream_example() {
    // Create a stream of numbers
    let mut stream = stream::iter(vec![1, 2, 3, 4, 5]);

    // Process items as they become available
    while let Some(item) = stream.next().await {
        println!("Got: {}", item);
    }

    // Or collect all items
    let values: Vec<i32> = stream::iter(vec![1, 2, 3, 4, 5])
        .collect()
        .await;

    println!("Collected: {:?}", values);
}
```

### Future Extensions Beyond the Standard Library

While the standard library provides the basic `Future` trait, most async Rust code relies on additional functionality from crates like `futures` and async runtimes:

- **`futures` crate**: Provides combinators, adapters, and utilities for working with futures
- **`tokio`**: A popular async runtime with extensive I/O and scheduling capabilities
- **`async-std`**: An async version of the standard library
- **`smol`**: A small, simple async runtime
- **`embassy`**: An async runtime for embedded systems

Each of these extends the basic futures model with additional functionality.

### Performance Considerations

Futures in Rust are designed to be zero-cost abstractions, meaning they don't add runtime overhead beyond what's necessary:

1. **No heap allocations required**: Futures can be allocated on the stack
2. **No virtual dispatch required**: The compiler can monomorphize and inline future implementations
3. **Efficient state machines**: The compiler optimizes async functions into compact state machines
4. **No thread overhead**: Futures don't require their own threads

However, there are some performance considerations:

1. **Task size**: Large futures with many variables carried across await points use more memory
2. **Polling frequency**: Frequent waking with no progress can cause "thrashing"
3. **Executor overhead**: Different async runtimes have different scheduling characteristics
4. **Blocking operations**: Blocking inside async code can stall the entire executor thread

In the next section, we'll explore how async runtimes execute futures and the trade-offs between different runtime implementations.

## Async Runtimes Explained

While Rust's language features provide the syntax for writing async code, an async runtime is required to actually execute futures. Understanding how runtimes work is crucial for writing effective and efficient async code.

### What is an Async Runtime?

An async runtime is a library that provides:

1. **Task scheduling**: Deciding which futures to poll and when
2. **I/O event notification**: Integrating with the operating system's I/O facilities
3. **Task spawning**: Creating and managing concurrent tasks
4. **Resource management**: Handling thread pools, timers, and other resources

The standard library intentionally does not include a runtime, allowing developers to choose the runtime that best suits their specific needs. This design decision provides flexibility but means you must explicitly include a runtime in your project.

### Core Components of an Async Runtime

Most async runtimes consist of several key components:

#### 1. Executor

The executor is responsible for polling futures when they're ready to make progress. It maintains a queue of tasks and decides which ones to poll based on wake notifications and scheduling policies.

#### 2. Reactor

The reactor is responsible for waiting on I/O events and notifying the executor when futures can make progress. It typically uses platform-specific APIs like `epoll` (Linux), `kqueue` (BSD/macOS), or `IOCP` (Windows) to efficiently wait for multiple I/O events simultaneously.

#### 3. Task System

The task system manages the lifecycle of individual asynchronous tasks, including creation, scheduling, and cleanup.

#### 4. Timer Facilities

Timers allow futures to be woken after a specific duration or at a scheduled time.

#### 5. Synchronization Primitives

Async-aware synchronization primitives like mutexes, channels, and semaphores are often provided by the runtime.

### Popular Rust Async Runtimes

Several async runtimes are available in the Rust ecosystem:

#### Tokio

Tokio is the most widely used async runtime in Rust. It provides a comprehensive set of features:

```rust
use tokio::net::TcpListener;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let listener = TcpListener::bind("127.0.0.1:8080").await?;

    println!("Server listening on port 8080");

    loop {
        let (mut socket, addr) = listener.accept().await?;

        // Spawn a new task for each connection
        tokio::spawn(async move {
            println!("Accepted connection from: {}", addr);

            let mut buf = [0; 1024];

            loop {
                let n = match socket.read(&mut buf).await {
                    Ok(0) => break, // Connection closed
                    Ok(n) => n,
                    Err(e) => {
                        eprintln!("Failed to read from socket: {}", e);
                        break;
                    }
                };

                // Echo the data back
                if let Err(e) = socket.write_all(&buf[0..n]).await {
                    eprintln!("Failed to write to socket: {}", e);
                    break;
                }
            }

            println!("Connection closed: {}", addr);
        });
    }
}
```

Key features of Tokio include:

- Multi-threaded scheduler for true parallelism
- Comprehensive I/O and networking support
- Highly optimized for performance
- Extensive ecosystem (tokio-util, tokio-stream, etc.)
- Provides both async and blocking versions of APIs

#### async-std

async-std is designed to mirror the standard library API but with async versions of common functions:

```rust
use async_std::net::TcpListener;
use async_std::prelude::*;
use async_std::task;

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let listener = TcpListener::bind("127.0.0.1:8080").await?;

    println!("Server listening on port 8080");

    let mut incoming = listener.incoming();

    while let Some(stream) = incoming.next().await {
        let stream = stream?;

        task::spawn(async move {
            handle_connection(stream).await;
        });
    }

    Ok(())
}
```

Key features of async-std include:

- API that closely resembles the standard library
- Simplified mental model
- Good performance
- Well-documented

#### smol

smol is a small, simple async runtime focused on minimalism:

```rust
use smol::{net::TcpListener, prelude::*};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    smol::block_on(async {
        let listener = TcpListener::bind("127.0.0.1:8080").await?;

        loop {
            let (stream, addr) = listener.accept().await?;

            smol::spawn(async move {
                handle_connection(stream).await;
            }).detach();
        }
    })
}
```

Key features of smol include:

- Minimalist API
- Small code size
- Low overhead
- Designed for simplicity

#### Other Runtimes

- **embassy**: Designed for embedded systems with limited resources
- **glommio**: Optimized for I/O-intensive workloads using io_uring
- **fuchsia-async**: Used in the Fuchsia operating system

### Runtime Configuration

Most runtimes offer configuration options to tune their behavior:

```rust
// Configuring a Tokio runtime
let runtime = tokio::runtime::Builder::new_multi_thread()
    .worker_threads(4)            // Number of worker threads
    .enable_io()                  // Enable I/O driver
    .enable_time()                // Enable time facilities
    .thread_name("my-custom-name") // Set thread names
    .thread_stack_size(3 * 1024 * 1024) // Set thread stack size
    .build()
    .unwrap();

// Run async code on the configured runtime
runtime.block_on(async {
    // Your async code here
});
```

### Building a Simple Async Runtime

To understand how async runtimes work, let's build a simple one from scratch:

```rust
use std::collections::VecDeque;
use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll, Wake, Waker};

// A simple executor that runs futures
struct SimpleExecutor {
    task_queue: VecDeque<Task>,
}

// A task is a future that can be polled
struct Task {
    future: Pin<Box<dyn Future<Output = ()> + Send>>,
    waker: Waker,
}

// A waker implementation that pushes the task back into the queue
struct TaskWaker {
    task_queue: Arc<Mutex<VecDeque<Task>>>,
    task_id: usize,
}

impl Wake for TaskWaker {
    fn wake(self: Arc<Self>) {
        println!("Waking task {}", self.task_id);
        // In a real executor, we would recreate the task and add it to the queue
    }
}

impl SimpleExecutor {
    fn new() -> Self {
        SimpleExecutor {
            task_queue: VecDeque::new(),
        }
    }

    // Spawn a new future onto the executor
    fn spawn<F>(&mut self, future: F)
    where
        F: Future<Output = ()> + Send + 'static,
    {
        let task_id = self.task_queue.len();

        // Create a task queue for the waker
        let task_queue = Arc::new(Mutex::new(VecDeque::new()));

        // Create a waker for the task
        let waker = Arc::new(TaskWaker {
            task_queue: task_queue.clone(),
            task_id,
        }).into_waker();

        // Create a task with the future and waker
        let task = Task {
            future: Box::pin(future),
            waker,
        };

        // Add the task to the queue
        self.task_queue.push_back(task);
    }

    // Run the executor until all tasks complete
    fn run(&mut self) {
        while let Some(mut task) = self.task_queue.pop_front() {
            // Create a context with the waker
            let mut context = Context::from_waker(&task.waker);

            // Poll the future
            match task.future.as_mut().poll(&mut context) {
                Poll::Ready(()) => {
                    // Task completed, nothing to do
                    println!("Task completed");
                }
                Poll::Pending => {
                    // Task not ready, put it back in the queue
                    println!("Task pending, re-queueing");
                    self.task_queue.push_back(task);
                }
            }
        }
    }
}

// Example usage
fn main() {
    let mut executor = SimpleExecutor::new();

    // Spawn a simple task
    executor.spawn(async {
        println!("Hello from async task!");
    });

    // Run the executor
    executor.run();
}
```

This simplified runtime demonstrates the core concepts, but a production-ready runtime would additionally need:

1. **Efficient task scheduling**: Using work-stealing algorithms for better CPU utilization
2. **I/O event notification**: Integration with OS-specific I/O polling mechanisms
3. **Timer management**: Efficient handling of timers and deadlines
4. **Thread management**: Distributing tasks across multiple threads
5. **Cancellation support**: Properly handling dropped futures

### Choosing the Right Runtime

When selecting an async runtime, consider these factors:

1. **Application type**: Server, client, embedded system, etc.
2. **Performance requirements**: Throughput, latency, memory usage
3. **Feature needs**: I/O types, timer precision, task priorities
4. **Ecosystem compatibility**: Integration with libraries and frameworks
5. **Maturity and support**: Community size, update frequency, documentation

For most applications, Tokio is a safe choice due to its maturity, performance, and wide ecosystem support. However, specialized applications might benefit from alternative runtimes:

- **Resource-constrained environments**: Consider `smol` or `embassy`
- **Simple applications**: `async-std` might be easier to learn and use
- **Specialized I/O patterns**: `glommio` for io_uring-based workloads

### Common Runtime Patterns

Regardless of which runtime you choose, some patterns are universally helpful:

#### 1. Spawn and Forget

For background tasks that don't need to report results:

```rust
tokio::spawn(async {
    process_background_task().await;
});
```

#### 2. Spawn and Join

For tasks that need to return results:

```rust
let handle = tokio::spawn(async {
    let result = process_task().await;
    result
});

// Later, get the result
let result = handle.await.unwrap();
```

#### 3. Graceful Shutdown

For cleanly shutting down when the application terminates:

```rust
// Create a shutdown signal
let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

// Spawn a task that can be shut down
let task = tokio::spawn(async move {
    tokio::select! {
        _ = shutdown_rx => {
            println!("Shutting down gracefully");
        }
        _ = async_operation() => {
            println!("Operation completed");
        }
    }
});

// Trigger shutdown when needed
shutdown_tx.send(()).unwrap();
```

In the next section, we'll explore Streams and async iterators, which build on futures to handle sequences of asynchronous values.

## Streams and Async Iterators

While futures represent a single asynchronous value, many real-world scenarios involve processing sequences of values that arrive over time. In Rust's async ecosystem, these sequences are represented by the `Stream` trait.

### Understanding Streams

A `Stream` is to an asynchronous context what an `Iterator` is to a synchronous one. Just as you can think of an `Iterator` as a sequence of values, a `Stream` is a sequence of asynchronous values.

Here's the simplified definition of the `Stream` trait:

```rust
pub trait Stream {
    type Item;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>>;
}
```

The key points to understand:

1. `Item` is the type of values produced by the stream
2. `poll_next` returns:
   - `Poll::Ready(Some(item))` when a new item is available
   - `Poll::Ready(None)` when the stream is exhausted
   - `Poll::Pending` when no item is ready yet, but more might arrive later

### Creating Streams

There are several ways to create streams:

#### 1. From Iterators

The simplest way to create a stream is to convert an existing iterator:

```rust
use futures::stream::{self, StreamExt};

async fn from_iterator() {
    let iter = vec![1, 2, 3, 4, 5].into_iter();

    // Convert the iterator into a stream
    let mut stream = stream::iter(iter);

    // Process each item as it becomes available
    while let Some(item) = stream.next().await {
        println!("Got: {}", item);
    }
}
```

#### 2. Stream Adapters

Just like iterators, streams can be created by transforming other streams:

```rust
use futures::stream::{self, StreamExt};

async fn adapter_example() {
    let stream = stream::iter(1..=10)
        .filter(|x| futures::future::ready(*x % 2 == 0))
        .map(|x| x * x);

    tokio::pin!(stream);

    while let Some(item) = stream.next().await {
        println!("Got squared even number: {}", item);
    }
}
```

#### 3. Custom Streams

For more complex cases, you can implement the `Stream` trait directly:

```rust
use futures::stream::Stream;
use std::pin::Pin;
use std::task::{Context, Poll};
use std::time::{Duration, Instant};

struct Countdown {
    remaining: u32,
}

impl Stream for Countdown {
    type Item = u32;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        if self.remaining == 0 {
            return Poll::Ready(None);
        }

        let value = self.remaining;
        self.remaining -= 1;

        Poll::Ready(Some(value))
    }
}
```

#### 4. Channel-based Streams

Async channels can be used to create streams:

```rust
use futures::stream::StreamExt;
use tokio::sync::mpsc;

async fn channel_stream() {
    let (tx, mut rx) = mpsc::channel(10);

    // Producer task
    let producer = tokio::spawn(async move {
        for i in 1..=5 {
            tx.send(i).await.unwrap();
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }
    });

    // Convert the receiver into a stream
    let mut stream = tokio_stream::wrappers::ReceiverStream::new(rx);

    // Process each value as it arrives
    while let Some(value) = stream.next().await {
        println!("Received: {}", value);
    }
}
```

### Stream Combinators

Like iterators, streams support a rich set of combinators for transforming and processing sequences:

#### Mapping and Filtering

```rust
use futures::stream::{self, StreamExt};

async fn map_filter_example() {
    let stream = stream::iter(1..=10)
        .map(|x| x * 2)              // Double each item
        .filter(|x| async move { x % 3 == 0 }) // Keep only multiples of 3
        .collect::<Vec<_>>()         // Collect into a vector
        .await;

    println!("Collected: {:?}", stream); // [6, 12, 18]
}
```

#### Chaining and Zipping

```rust
use futures::stream::{self, StreamExt};

async fn chain_zip_example() {
    // Chain two streams together
    let stream1 = stream::iter(vec!["a", "b", "c"]);
    let stream2 = stream::iter(vec!["x", "y", "z"]);

    let mut chained = stream1.chain(stream2);
    while let Some(item) = chained.next().await {
        println!("Chained: {}", item);
    }

    // Zip two streams together
    let numbers = stream::iter(1..=3);
    let letters = stream::iter(vec!["a", "b", "c"]);

    let mut zipped = numbers.zip(letters);
    while let Some((num, letter)) = zipped.next().await {
        println!("Zipped: {} - {}", num, letter);
    }
}
```

#### Folding and Reducing

```rust
use futures::stream::{self, StreamExt};

async fn fold_reduce_example() {
    let sum = stream::iter(1..=5)
        .fold(0, |acc, x| async move { acc + x })
        .await;

    println!("Sum: {}", sum); // 15

    // Reduce (like fold but uses the first item as the initial value)
    let product = stream::iter(1..=5)
        .reduce(|acc, x| async move { acc * x })
        .await;

    println!("Product: {:?}", product); // Some(120)
}
```

#### Buffering and Windowing

```rust
use futures::stream::{self, StreamExt};

async fn buffer_window_example() {
    // Process items in chunks of 2
    let stream = stream::iter(1..=5)
        .chunks(2)
        .map(|chunk| chunk.into_iter().sum::<i32>())
        .collect::<Vec<_>>()
        .await;

    println!("Chunked sums: {:?}", stream); // [3, 7, 5]

    // Sliding window
    let stream = stream::iter(1..=5)
        .ready_chunks(2) // Process items as soon as 2 are ready
        .map(|chunk| chunk.into_iter().sum::<i32>())
        .collect::<Vec<_>>()
        .await;

    println!("Ready chunks: {:?}", stream);
}
```

### Processing Streams

There are several ways to process streams:

#### 1. Using `next()` with `while let`

The most basic approach is to use `next()` in a loop:

```rust
use futures::stream::{self, StreamExt};

async fn process_with_next() {
    let mut stream = stream::iter(1..=5);

    while let Some(item) = stream.next().await {
        println!("Processing: {}", item);
    }
}
```

#### 2. Using `for_each`

For simple processing where you don't need to accumulate a result:

```rust
use futures::stream::{self, StreamExt};

async fn process_with_for_each() {
    stream::iter(1..=5)
        .for_each(|item| async move {
            println!("Processing: {}", item);
        })
        .await;
}
```

#### 3. Using `try_for_each` for Error Handling

When processing can fail:

```rust
use futures::stream::{self, StreamExt, TryStreamExt};
use std::io;

async fn process_with_try_for_each() -> io::Result<()> {
    let results = vec![
        Ok(1),
        Ok(2),
        Err(io::Error::new(io::ErrorKind::Other, "Something went wrong")),
        Ok(4),
        Ok(5),
    ];

    stream::iter(results)
        .try_for_each(|item| async move {
            println!("Successfully processed: {}", item);
            Ok(())
        })
        .await
}
```

#### 4. Collecting Results

To accumulate all items into a collection:

```rust
use futures::stream::{self, StreamExt};

async fn collect_example() {
    let values: Vec<i32> = stream::iter(1..=5)
        .map(|x| x * 2)
        .collect()
        .await;

    println!("Collected values: {:?}", values);
}
```

### Backpressure with Streams

Backpressure is a mechanism to ensure that fast producers don't overwhelm slow consumers. Streams in Rust naturally support backpressure because they're pull-based—consumers request items at their own pace.

```rust
use futures::stream::{self, StreamExt};
use tokio::time::{sleep, Duration};

async fn backpressure_example() {
    let mut stream = stream::iter(1..=100);

    while let Some(item) = stream.next().await {
        println!("Processing item: {}", item);

        // Simulate slow processing
        sleep(Duration::from_millis(100)).await;

        // The stream naturally waits until we request the next item
    }
}
```

For more complex scenarios, you can use bounded channels to enforce backpressure:

```rust
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use futures::stream::StreamExt;

async fn bounded_channel_example() {
    // Create a bounded channel with a capacity of 5
    let (tx, rx) = mpsc::channel(5);

    // Producer task
    let producer = tokio::spawn(async move {
        for i in 1..=100 {
            println!("Producing item: {}", i);

            // This will block if the channel is full,
            // implementing backpressure
            if tx.send(i).await.is_err() {
                break;
            }
        }
    });

    // Consumer task
    let consumer = tokio::spawn(async move {
        let mut stream = ReceiverStream::new(rx);

        while let Some(item) = stream.next().await {
            println!("Consuming item: {}", item);

            // Simulate slow consumption
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        }
    });

    // Wait for both tasks to complete
    let _ = tokio::join!(producer, consumer);
}
```

### Stream Utilities and Extensions

The `futures` and `tokio-stream` crates provide additional utilities for working with streams:

#### Stream Buffering

```rust
use futures::stream::{self, StreamExt};

async fn buffering_example() {
    let mut stream = stream::iter(1..=10)
        .map(|i| {
            // Simulate variable-time processing
            async move {
                let delay = if i % 3 == 0 { 100 } else { 10 };
                tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
                i
            }
        })
        .buffer_unordered(3) // Process up to 3 items concurrently
        .collect::<Vec<_>>()
        .await;

    // Note: the order may not be 1,2,3,... due to concurrent processing
    println!("Results: {:?}", stream);
}
```

#### Rate Limiting

```rust
use futures::stream::{self, StreamExt};
use tokio::time::Duration;

async fn rate_limit_example() {
    stream::iter(1..=10)
        .then(|i| async move {
            println!("Processing item {}", i);
            i
        })
        .throttle(Duration::from_millis(200)) // Limit to 5 items per second
        .for_each(|i| async move {
            println!("Completed item {}", i);
        })
        .await;
}
```

### Async Iteration Syntax

Rust doesn't yet have native syntax for async iteration (like `for await` in JavaScript), but there are proposals to add it. For now, we use `while let` with `next()` or the various combinators:

```rust
// Current approach
async fn process_stream() {
    let mut stream = get_some_stream();

    while let Some(item) = stream.next().await {
        process_item(item).await;
    }
}

// Possible future syntax (not yet implemented in Rust)
// async fn process_stream() {
//     let stream = get_some_stream();
//
//     for await item in stream {
//         process_item(item).await;
//     }
// }
```

### Real-World Stream Examples

Let's look at some practical examples of streams in real-world scenarios:

#### WebSocket Message Stream

```rust
use futures::stream::StreamExt;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

async fn websocket_stream_example() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to a WebSocket server
    let (ws_stream, _) = connect_async("wss://echo.websocket.org").await?;

    // Split the stream into sender and receiver
    let (mut write, read) = ws_stream.split();

    // Send a message
    write.send(Message::Text("Hello, WebSocket!".to_string())).await?;

    // Process incoming messages as a stream
    read.take(10) // Limit to 10 messages
        .for_each(|message| async {
            if let Ok(msg) = message {
                match msg {
                    Message::Text(text) => println!("Received text: {}", text),
                    Message::Binary(data) => println!("Received binary: {} bytes", data.len()),
                    _ => println!("Received other message type"),
                }
            }
        })
        .await;

    Ok(())
}
```

#### File Line Stream

```rust
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio_stream::wrappers::LinesStream;
use futures::stream::StreamExt;

async fn process_file_as_stream() -> Result<(), Box<dyn std::error::Error>> {
    // Open a file
    let file = File::open("large_log_file.txt").await?;
    let reader = BufReader::new(file);

    // Create a stream of lines
    let mut lines = LinesStream::new(reader.lines());

    // Process each line
    let mut count = 0;
    while let Some(line) = lines.next().await {
        let line = line?;

        // Look for error messages
        if line.contains("ERROR") {
            println!("Found error: {}", line);
            count += 1;
        }
    }

    println!("Found {} error lines", count);
    Ok(())
}
```

#### Database Query Stream

```rust
use futures::stream::TryStreamExt;
use tokio_postgres::{Client, NoTls};

async fn query_stream_example() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to PostgreSQL
    let (client, connection) = tokio_postgres::connect(
        "host=localhost user=postgres dbname=mydb",
        NoTls,
    ).await?;

    // Spawn the connection handling
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("Connection error: {}", e);
        }
    });

    // Create a query that returns a large result set
    let stream = client
        .query_raw("SELECT * FROM large_table WHERE value > $1", &[&100])
        .await?
        .try_filter_map(|row| async move {
            // Extract data from the row
            let id: i32 = row.get(0);
            let value: i64 = row.get(1);

            // Filter out some rows
            if value > 1000 {
                Ok(Some((id, value)))
            } else {
                Ok(None)
            }
        });

    // Process the rows without loading everything into memory
    tokio::pin!(stream);

    let mut count = 0;
    while let Some((id, value)) = stream.try_next().await? {
        println!("Row {}: {}", id, value);
        count += 1;
    }

    println!("Processed {} rows", count);
    Ok(())
}
```

Streams are a powerful abstraction for handling asynchronous sequences in Rust. They combine the flexibility of iterators with the efficiency of async programming, enabling scalable processing of data from network sources, files, and other asynchronous data producers.

In the next section, we'll explore how to choose and work with async runtimes in more detail.

## Practical Project: Building an Async Web Crawler

To consolidate our understanding of asynchronous programming, let's build a practical project: a simple web crawler that concurrently fetches and processes web pages. This project will demonstrate many of the concepts we've covered in this chapter.

### Project Requirements

Our web crawler will:

1. Start with a seed URL
2. Fetch the page content asynchronously
3. Parse the HTML to extract links
4. Follow links within the same domain, up to a specified depth
5. Limit concurrency to avoid overwhelming servers
6. Track visited URLs to avoid cycles

### Setting Up the Project

First, let's create a new Rust project and add the necessary dependencies:

```bash
cargo new async-crawler
cd async-crawler
```

Add the following dependencies to your `Cargo.toml`:

```toml
[dependencies]
tokio = { version = "1.28", features = ["full"] }
reqwest = { version = "0.11", features = ["json"] }
futures = "0.3"
scraper = "0.16"
url = "2.3"
thiserror = "1.0"
async-recursion = "1.0"
```

### Defining the Core Structures

Let's start by defining our core data structures:

```rust
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use url::Url;

/// Configuration for the crawler
struct CrawlerConfig {
    max_depth: usize,
    max_concurrent_requests: usize,
    user_agent: String,
}

impl Default for CrawlerConfig {
    fn default() -> Self {
        Self {
            max_depth: 2,
            max_concurrent_requests: 10,
            user_agent: "Rust Async Crawler/0.1".to_string(),
        }
    }
}

/// A simple web crawler
struct Crawler {
    config: CrawlerConfig,
    client: reqwest::Client,
    visited: Arc<Mutex<HashSet<String>>>,
}
```

### Implementing the Crawler

Now, let's implement the crawler's functionality:

```rust
use async_recursion::async_recursion;
use futures::stream::{self, StreamExt};
use scraper::{Html, Selector};
use thiserror::Error;

#[derive(Error, Debug)]
enum CrawlerError {
    #[error("Request error: {0}")]
    RequestError(#[from] reqwest::Error),

    #[error("URL parse error: {0}")]
    UrlParseError(#[from] url::ParseError),

    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
}

impl Crawler {
    /// Create a new crawler with the given configuration
    fn new(config: CrawlerConfig) -> Result<Self, CrawlerError> {
        let client = reqwest::Client::builder()
            .user_agent(&config.user_agent)
            .build()?;

        Ok(Self {
            config,
            client,
            visited: Arc::new(Mutex::new(HashSet::new())),
        })
    }

    /// Start crawling from a seed URL
    pub async fn crawl(&self, seed_url: &str) -> Result<(), CrawlerError> {
        let url = Url::parse(seed_url)?;
        self.crawl_page(url, 0).await
    }

    /// Crawl a single page and follow links recursively
    #[async_recursion]
    async fn crawl_page(&self, url: Url, depth: usize) -> Result<(), CrawlerError> {
        let url_str = url.to_string();

        // Check if we've already visited this URL
        {
            let mut visited = self.visited.lock().unwrap();
            if visited.contains(&url_str) {
                return Ok(());
            }
            visited.insert(url_str.clone());
        }

        println!("Crawling: {} (depth: {})", url_str, depth);

        // Stop if we've reached the maximum depth
        if depth >= self.config.max_depth {
            return Ok(());
        }

        // Fetch the page
        let response = self.client.get(url.clone()).send().await?;
        if !response.status().is_success() {
            println!("  Failed: HTTP {}", response.status());
            return Ok(());
        }

        let content_type = response
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");

        // Only process HTML pages
        if !content_type.contains("text/html") {
            println!("  Skipping: Not HTML ({})", content_type);
            return Ok(());
        }

        let html = response.text().await?;

        // Parse the HTML
        let document = Html::parse_document(&html);

        // Extract links
        let selector = Selector::parse("a[href]").unwrap();
        let links: Vec<_> = document
            .select(&selector)
            .filter_map(|element| element.value().attr("href"))
            .filter_map(|href| self.normalize_url(&url, href).ok())
            .filter(|link_url| link_url.domain() == url.domain())
            .collect();

        println!("  Found {} links", links.len());

        // Process links concurrently, but limit concurrency
        stream::iter(links)
            .map(|link| self.crawl_page(link, depth + 1))
            .buffer_unordered(self.config.max_concurrent_requests)
            .collect::<Vec<_>>()
            .await;

        Ok(())
    }

    /// Convert a relative URL to an absolute URL
    fn normalize_url(&self, base: &Url, href: &str) -> Result<Url, CrawlerError> {
        match base.join(href) {
            Ok(url) => Ok(url),
            Err(e) => {
                println!("  Invalid URL: {} - {}", href, e);
                Err(CrawlerError::InvalidUrl(href.to_string()))
            }
        }
    }
}
```

### The Main Application

Finally, let's implement the main application:

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create a custom configuration
    let config = CrawlerConfig {
        max_depth: 2,
        max_concurrent_requests: 5,
        user_agent: "Rust Async Crawler Example/0.1".to_string(),
    };

    // Create the crawler
    let crawler = Crawler::new(config)?;

    // Start crawling from a seed URL
    crawler.crawl("https://www.rust-lang.org").await?;

    println!("Crawling completed!");
    Ok(())
}
```

### Running the Crawler

You can run the crawler with:

```bash
cargo run
```

This will start crawling from the Rust website, following links to a depth of 2, and limiting concurrency to 5 simultaneous requests.

### Analyzing Our Implementation

Our crawler demonstrates several important async concepts:

1. **Async/await syntax**: The `crawl` and `crawl_page` methods are asynchronous.
2. **Concurrency control**: We use `buffer_unordered` to limit the number of concurrent requests.
3. **Error handling**: We use `thiserror` to define custom error types and propagate errors with `?`.
4. **Shared state**: We use `Arc<Mutex<HashSet>>` to track visited URLs across async tasks.
5. **HTTP client**: We use `reqwest` for asynchronous HTTP requests.
6. **Stream processing**: We use `StreamExt` to process links as a stream.

This example shows how async programming can efficiently handle I/O-bound tasks like web crawling, making many concurrent requests without the overhead of using one thread per request.

## Summary and Best Practices

In this chapter, we've explored Rust's approach to asynchronous programming. Here's a summary of the key concepts we've covered:

### Key Concepts

1. **Async/await syntax**: Provides an intuitive way to write asynchronous code.
2. **Futures**: Represent computations that may not have completed yet.
3. **Polling model**: Futures make progress only when polled.
4. **Async runtimes**: Execute futures by managing tasks and I/O events.
5. **Streams**: Represent asynchronous sequences of values.

### Best Practices for Async Rust

1. **Choose the right tool for the job**:

   - Use async for I/O-bound workloads with many concurrent operations.
   - Use threads for CPU-bound tasks or when simplicity is more important than scalability.

2. **Understand the costs**:

   - Async code has compilation and runtime overhead.
   - Large futures with many variables across await points consume more memory.
   - Debugging async code can be more challenging.

3. **Avoid blocking in async contexts**:

   - Use `spawn_blocking` for unavoidable blocking operations.
   - Prefer async versions of libraries when available.

4. **Use appropriate concurrency patterns**:

   - Create futures first, then await them for concurrent execution.
   - Use `join!` or `try_join!` to await multiple futures concurrently.
   - Use `select!` for racing futures or implementing timeouts.

5. **Handle cancellation properly**:

   - Design futures to clean up resources when dropped.
   - Use structured concurrency patterns like scoped tasks.

6. **Manage backpressure**:

   - Use bounded channels and queues to prevent overwhelming consumers.
   - Implement throttling where appropriate.

7. **Test async code thoroughly**:
   - Test different interleaving of async operations.
   - Use simulated delays to expose race conditions.

### Common Async Pitfalls

1. **Block-on-block deadlock**: Calling `block_on` from within an async context that's already being driven by the same runtime.
2. **Task starvation**: Long-running CPU-bound tasks preventing other tasks from making progress.
3. **Excessive spawning**: Creating too many tasks, leading to scheduling overhead.
4. **Forgetting to spawn**: Creating a future but not spawning or awaiting it.
5. **Over-synchronization**: Using too many synchronization primitives, leading to contention.

## Exercises

To reinforce your understanding of asynchronous programming in Rust, try these exercises:

1. **Async File Processor**:

   - Create a program that asynchronously reads multiple files.
   - Process the files concurrently and collect the results.
   - Implement error handling for file operations.

2. **Enhanced Web Crawler**:

   - Extend our web crawler to save page content to files.
   - Add support for rate limiting (maximum requests per second).
   - Implement retry logic for failed requests.

3. **Async Chat Server**:

   - Build a simple chat server using async networking.
   - Support multiple concurrent clients.
   - Implement broadcast messaging to all connected clients.

4. **Custom Stream Implementation**:

   - Create a custom `Stream` implementation that produces Fibonacci numbers.
   - Add a timeout feature to limit how long you wait for the next item.

5. **Async Runtime Comparison**:
   - Implement the same functionality using different async runtimes (Tokio, async-std, smol).
   - Compare performance, memory usage, and code complexity.

## Further Reading

To deepen your understanding of asynchronous programming in Rust:

1. [Asynchronous Programming in Rust](https://rust-lang.github.io/async-book/) - The official Async Book
2. [Tokio Documentation](https://tokio.rs/tokio/tutorial) - Comprehensive guide to the Tokio runtime
3. [Futures Explained in 200 Lines of Rust](https://cfsamson.github.io/books-futures-explained/) - Deep dive into how futures work
4. [async-std Book](https://book.async.rs/) - Guide to the async-std runtime
5. [Pin and Unpin in Rust](https://blog.rust-lang.org/inside-rust/2021/01/26/pin-overview.html) - Detailed explanation of the Pin API

---

Asynchronous programming in Rust provides a powerful way to handle concurrent operations efficiently. By leveraging futures, async/await syntax, and purpose-built runtimes, you can write code that scales to handle thousands or even millions of concurrent tasks while maintaining Rust's guarantees of safety and performance. Whether you're building web servers, database systems, or network utilities, the techniques you've learned in this chapter will help you write robust, efficient asynchronous code.
