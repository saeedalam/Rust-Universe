# Chapter 49: WebAssembly and Frontend Development with Rust

## Introduction

WebAssembly (WASM) has revolutionized web development by enabling languages other than JavaScript to run in browsers at near-native speed. Rust has emerged as one of the premier languages for WebAssembly development due to its performance characteristics, memory safety guarantees, and excellent tooling support.

In this chapter, we'll explore how Rust and WebAssembly work together to create high-performance web applications. We'll cover WebAssembly fundamentals, the Rust-to-WASM compilation process, popular frontend frameworks, and best practices for building production-ready web applications with Rust.

By the end of this chapter, you'll have the knowledge to build modern, efficient web applications using Rust that run in any modern browser.

## WebAssembly Fundamentals for Rust Developers

### What is WebAssembly?

WebAssembly is a binary instruction format designed as a portable compilation target for high-level languages. It allows code written in languages like Rust to run in web browsers with performance comparable to native applications.

Key characteristics of WebAssembly include:

- **Performance**: WebAssembly code executes at near-native speed
- **Safety**: Runs in a sandboxed environment with memory safety guarantees
- **Portability**: Works across all major browsers and platforms
- **Compact binary format**: Efficiently transfers over the network
- **Compatibility**: Interoperates with JavaScript and the DOM

WebAssembly is not a replacement for JavaScript but a complement to it. It excels at computationally intensive tasks where JavaScript might struggle, such as:

- Data processing and analytics
- Image and video manipulation
- Game engines and physics simulations
- Cryptography and compression
- Machine learning inference

### WebAssembly Memory Model

Understanding the WebAssembly memory model is crucial for Rust developers. WebAssembly uses a linear memory model, represented as a contiguous array of bytes:

```rust
// In Rust, WebAssembly memory is often represented as:
let memory: &mut [u8];
```

Key points about WebAssembly memory:

1. **Linear memory**: A single, contiguous block of memory
2. **Resizable**: Can grow (but not shrink) during execution
3. **Shared with JavaScript**: Accessible from both Rust and JavaScript
4. **Not garbage collected**: Memory management is the responsibility of the Rust code (which is where Rust's ownership system shines)

Rust's ownership system maps perfectly to this model, as it guarantees memory safety without a garbage collector.

### The Rust-to-WASM Compilation Pipeline

Compiling Rust to WebAssembly involves several steps and tools:

1. **rustc**: The Rust compiler with WebAssembly as a compilation target
2. **wasm-bindgen**: Facilitates high-level interactions between Rust and JavaScript
3. **wasm-pack**: Packages Rust crates for the web
4. **wasm-opt**: Optimizes WebAssembly binaries for size and performance

Here's a typical compilation flow:

```bash
# Initialize a new Rust project
cargo new --lib wasm-example
cd wasm-example

# Configure as a WebAssembly library in Cargo.toml
# [lib]
# crate-type = ["cdylib", "rlib"]

# Build with wasm-pack
wasm-pack build --target web
```

The `Cargo.toml` file for a WebAssembly project typically looks like:

```toml
[package]
name = "wasm-example"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2.87"

[profile.release]
opt-level = 3
lto = true
```

### wasm-bindgen and the Web Ecosystem

The `wasm-bindgen` tool is a critical component in the Rust-WASM ecosystem. It provides the glue between Rust and JavaScript, allowing for seamless interoperability.

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    // Import JavaScript console.log
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn greet(name: &str) {
    log(&format!("Hello, {}!", name));
}
```

In addition to `wasm-bindgen`, several other crates enhance the Rust-WASM ecosystem:

- **web-sys**: Provides bindings to Web APIs
- **js-sys**: Provides bindings to JavaScript's standard library
- **wasm-bindgen-futures**: Bridges Rust's async/await with JavaScript Promises
- **gloo**: A toolkit for building Rust and WebAssembly applications

Here's an example using `web-sys` to interact with the DOM:

```rust
use wasm_bindgen::prelude::*;
use web_sys::{Document, Element, HtmlElement, Window};

#[wasm_bindgen]
pub fn create_element() -> Result<(), JsValue> {
    // Get the window object
    let window = web_sys::window().expect("no global window exists");

    // Get the document object
    let document = window.document().expect("no document on window");

    // Create a new div element
    let div = document.create_element("div")?;

    // Set some properties
    div.set_inner_html("Hello from Rust!");
    div.set_class_name("rust-div");

    // Append to the body
    let body = document.body().expect("document should have a body");
    body.append_child(&div)?;

    Ok(())
}
```

## Modern Frontend Frameworks in Rust

While you can use `wasm-bindgen` and `web-sys` directly to build web applications, several frameworks have emerged to make frontend development in Rust more productive and enjoyable.

### Yew: The React-inspired Framework

[Yew](https://yew.rs/) is a modern Rust framework for creating multi-threaded frontend applications with WebAssembly. It's heavily inspired by React and uses a component-based architecture with a JSX-like syntax:

```rust
use yew::prelude::*;

#[function_component(App)]
fn app() -> Html {
    let counter = use_state(|| 0);
    let onclick = {
        let counter = counter.clone();
        Callback::from(move |_| {
            counter.set(*counter + 1);
        })
    };

    html! {
        <div>
            <h1>{ "Counter: " }{ *counter }</h1>
            <button {onclick}>{ "Increment" }</button>
        </div>
    }
}

fn main() {
    yew::Renderer::<App>::new().render();
}
```

Key features of Yew include:

- **Component-based architecture**: Build reusable components
- **HTML macro**: Write HTML-like code within Rust
- **State management**: Built-in hooks for local state management
- **Agent system**: For cross-component communication
- **Router**: For single-page applications
- **Server-side rendering**: Improve initial page load performance

### Leptos: The Signals-based Framework

[Leptos](https://leptos.dev/) is a newer full-stack framework that uses a signals-based reactive system, similar to SolidJS. It excels at fine-grained reactivity:

```rust
use leptos::*;

#[component]
fn Counter(cx: Scope) -> impl IntoView {
    let (count, set_count) = create_signal(cx, 0);

    view! { cx,
        <div>
            <h1>"Counter: " {count}</h1>
            <button on:click=move |_| set_count.update(|n| *n += 1)>
                "Increment"
            </button>
        </div>
    }
}

fn main() {
    mount_to_body(|cx| view! { cx, <Counter/> })
}
```

Key features of Leptos include:

- **Fine-grained reactivity**: Only re-renders what changed
- **Server functions**: Write backend code in the same file as frontend
- **Progressive enhancement**: Works with or without JavaScript
- **Hydration**: Seamless transition from server-rendered to interactive content
- **Island architecture**: Independently hydrate components
- **Multi-backend**: Supports both WebAssembly and server-side rendering

### Dioxus: The Universal Rust UI Framework

[Dioxus](https://dioxuslabs.com/) aims to be a universal UI framework, allowing Rust developers to target not just the web, but also desktop, mobile, and more from a single codebase:

```rust
use dioxus::prelude::*;

fn main() {
    dioxus_web::launch(App);
}

fn App(cx: Scope) -> Element {
    let mut count = use_state(cx, || 0);

    cx.render(rsx! {
        div {
            h1 { "Counter: {count}" }
            button {
                onclick: move |_| count += 1,
                "Increment"
            }
        }
    })
}
```

Key features of Dioxus include:

- **Unified API**: Write once, run anywhere
- **Desktop and mobile support**: Beyond just the web
- **Hot reloading**: For rapid development
- **Native rendering**: Option to render using native OS widgets
- **Compatible syntax**: Familiar to React/JSX developers
- **Suspense and async**: First-class support for async components

### Component Design Patterns

When building applications with these frameworks, several design patterns emerge as particularly effective:

#### Pure Components

Pure components depend only on their inputs and produce consistent outputs, making them easier to test and maintain:

```rust
// A pure component in Yew
#[derive(Properties, PartialEq)]
struct PriceProps {
    amount: f64,
    currency: String,
}

#[function_component(Price)]
fn price(props: &PriceProps) -> Html {
    html! {
        <span class="price">
            { format!("{:.2} {}", props.amount, props.currency) }
        </span>
    }
}
```

#### Container and Presentation Components

This pattern separates data fetching and state management (containers) from rendering (presentation):

```rust
// Container component in Leptos
#[component]
fn UserContainer(cx: Scope, user_id: i32) -> impl IntoView {
    let user_data = create_resource(
        cx,
        move || user_id,
        |id| async move { fetch_user(id).await }
    );

    view! { cx,
        <Suspense fallback=move || view! { cx, <p>"Loading..."</p> }>
            {move || user_data.read().map(|user| view! { cx, <UserProfile user=user /> })}
        </Suspense>
    }
}

// Presentation component
#[component]
fn UserProfile(cx: Scope, user: User) -> impl IntoView {
    view! { cx,
        <div class="profile">
            <h2>{&user.name}</h2>
            <p>{&user.email}</p>
            // More UI elements
        </div>
    }
}
```

#### Composition over Inheritance

Rust doesn't have inheritance, which encourages better component composition:

```rust
// Button component in Dioxus
#[derive(Props, PartialEq)]
struct ButtonProps {
    onclick: EventHandler<MouseEvent>,
    variant: Option<String>,
    children: Element,
}

fn Button(cx: Scope<ButtonProps>) -> Element {
    let variant = cx.props.variant.clone().unwrap_or_else(|| "primary".to_string());
    let class = format!("btn btn-{}", variant);

    cx.render(rsx! {
        button {
            class: "{class}",
            onclick: move |evt| cx.props.onclick.call(evt),
            &cx.props.children
        }
    })
}

// Usage
fn App(cx: Scope) -> Element {
    cx.render(rsx! {
        Button {
            variant: "danger",
            onclick: move |_| log::info!("Clicked!"),
            "Delete Item"
        }
    })
}
```

## State Management Approaches

State management is a critical aspect of frontend applications. Rust WebAssembly frameworks offer several approaches:

### Local Component State

All frameworks provide mechanisms for local component state:

```rust
// Yew local state
#[function_component(Counter)]
fn counter() -> Html {
    let state = use_state(|| 0);

    let increment = {
        let state = state.clone();
        Callback::from(move |_| {
            state.set(*state + 1);
        })
    };

    html! {
        <div>
            <p>{ "Count: " }{ *state }</p>
            <button onclick={increment}>{ "Increment" }</button>
        </div>
    }
}
```

### Context for Shared State

For state that needs to be shared across components, context APIs are available:

```rust
// Leptos context example
#[component]
fn App(cx: Scope) -> impl IntoView {
    let theme = create_rw_signal(cx, "light");

    provide_context(cx, theme);

    view! { cx,
        <div class=move || format!("theme-{}", theme.get())>
            <Header />
            <Main />
            <Footer />
        </div>
    }
}

#[component]
fn ThemeSwitcher(cx: Scope) -> impl IntoView {
    let theme = use_context::<RwSignal<&str>>(cx).expect("theme context not found");

    let toggle_theme = move |_| {
        theme.update(|t| *t = if *t == "light" { "dark" } else { "light" });
    };

    view! { cx,
        <button on:click=toggle_theme>
            {move || format!("Switch to {} mode", if theme.get() == "light" { "dark" } else { "light" })}
        </button>
    }
}
```

### Global State Management

For more complex applications, dedicated state management solutions exist:

```rust
// Yew global state with yewdux
use yew::prelude::*;
use yewdux::prelude::*;

#[derive(Default, Clone, PartialEq, Eq, Store)]
struct AppState {
    count: i32,
    user: Option<String>,
}

#[function_component(Counter)]
fn counter() -> Html {
    let (state, dispatch) = use_store::<AppState>();

    let increment = dispatch.reduce_callback(|state| {
        state.count += 1;
    });

    html! {
        <div>
            <p>{ "Count: " }{ state.count }</p>
            <button onclick={increment}>{ "Increment" }</button>
        </div>
    }
}
```

### Architectural Considerations

When choosing a state management approach, consider:

1. **Complexity**: Use the simplest approach that meets your needs
2. **Performance**: Global state can impact performance if not carefully designed
3. **Data flow**: Unidirectional data flow makes applications easier to reason about
4. **Immutability**: Prefer immutable updates for predictable behavior
5. **Serialization**: Consider if state needs to be saved/restored

## Interoperability with JavaScript

One of the greatest strengths of Rust WebAssembly is its ability to interoperate with existing JavaScript code and libraries.

### Calling JavaScript from Rust

Using `wasm-bindgen`, you can call JavaScript functions from Rust:

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    // Import individual functions
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    // Import a JavaScript class
    type Date;

    #[wasm_bindgen(constructor)]
    fn new() -> Date;

    #[wasm_bindgen(method, js_name = toISOString)]
    fn to_iso_string(this: &Date) -> String;
}

#[wasm_bindgen]
pub fn log_current_date() {
    let date = Date::new();
    let date_string = date.to_iso_string();
    log(&format!("Current date: {}", date_string));
}
```

### Calling Rust from JavaScript

Conversely, JavaScript can call functions exposed from Rust:

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2)
    }
}
```

In JavaScript:

```javascript
import { fibonacci } from "./pkg/my_wasm_lib.js";

console.log(fibonacci(10)); // 55
```

### Working with Complex Data Types

For complex data types, `serde` combined with `wasm-bindgen` enables seamless serialization:

```rust
use serde::{Serialize, Deserialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct User {
    id: u32,
    name: String,
    email: String,
}

#[wasm_bindgen]
pub fn process_user(js_user: JsValue) -> Result<JsValue, JsValue> {
    // Convert JsValue to Rust struct
    let user: User = serde_wasm_bindgen::from_value(js_user)?;

    // Process the user...
    let processed_user = User {
        id: user.id,
        name: user.name.to_uppercase(),
        email: user.email,
    };

    // Convert back to JsValue
    Ok(serde_wasm_bindgen::to_value(&processed_user)?)
}
```

In JavaScript:

```javascript
import { process_user } from "./pkg/my_wasm_lib.js";

const user = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
};

const processed = process_user(user);
console.log(processed); // { id: 1, name: 'ALICE', email: 'alice@example.com' }
```

### Using JavaScript Libraries from Rust

For complex JavaScript libraries, you might want to create proper typings:

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[derive(Debug)]
    type Chart;

    #[wasm_bindgen(constructor)]
    fn new(canvas_id: &str, config: &JsValue) -> Chart;

    #[wasm_bindgen(method)]
    fn update(this: &Chart);

    #[wasm_bindgen(method)]
    fn destroy(this: &Chart);
}

#[wasm_bindgen]
pub fn create_chart() -> Result<(), JsValue> {
    let config = js_sys::Object::new();
    let data = js_sys::Array::new();

    // Configure chart...
    js_sys::Reflect::set(&config, &"type".into(), &"bar".into())?;
    js_sys::Reflect::set(&config, &"data".into(), &data)?;

    let chart = Chart::new("myChart", &config);

    // Store chart reference for later use...

    Ok(())
}
```

## Working with the DOM and Web APIs

Interacting with the DOM and other Web APIs is a common task in web development. While Rust frameworks abstract much of this away, understanding the low-level details is valuable.

### Direct DOM Manipulation

Using `web-sys`, you can manipulate the DOM directly:

```rust
use wasm_bindgen::prelude::*;
use web_sys::{Document, Element, HtmlElement, Window};

#[wasm_bindgen]
pub fn update_counter_display(count: u32) -> Result<(), JsValue> {
    let window = web_sys::window().expect("no global window exists");
    let document = window.document().expect("no document on window");

    match document.get_element_by_id("counter") {
        Some(element) => {
            element.set_text_content(Some(&count.to_string()));
            Ok(())
        },
        None => {
            let counter = document.create_element("div")?;
            counter.set_id("counter");
            counter.set_text_content(Some(&count.to_string()));

            let body = document.body().expect("document should have a body");
            body.append_child(&counter)?;
            Ok(())
        }
    }
}
```

### Event Handling

Handling DOM events with `web-sys`:

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{EventTarget, HtmlInputElement};

#[wasm_bindgen]
pub fn setup_form() -> Result<(), JsValue> {
    let window = web_sys::window().expect("no global window exists");
    let document = window.document().expect("no document on window");

    let input = document.get_element_by_id("name-input")
        .expect("should have input element")
        .dyn_into::<HtmlInputElement>()?;

    let output_div = document.get_element_by_id("output")
        .expect("should have output element");

    // Clone for closure
    let input_clone = input.clone();
    let output_clone = output_div.clone();

    // Create closure
    let closure = Closure::wrap(Box::new(move |_event: web_sys::Event| {
        let value = input_clone.value();
        output_clone.set_text_content(Some(&format!("Hello, {}!", value)));
    }) as Box<dyn FnMut(_)>);

    // Set the event listener
    input.set_oninput(Some(closure.as_ref().unchecked_ref()));

    // Forget the closure to keep it alive
    // This leaks memory if not managed properly!
    closure.forget();

    Ok(())
}
```

### Working with Fetch and Promises

For asynchronous operations like network requests, you can use `wasm-bindgen-futures`:

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, RequestMode, Response};

#[wasm_bindgen]
pub async fn fetch_data(url: String) -> Result<JsValue, JsValue> {
    let mut opts = RequestInit::new();
    opts.method("GET");
    opts.mode(RequestMode::Cors);

    let request = Request::new_with_str_and_init(&url, &opts)?;

    let window = web_sys::window().unwrap();
    let resp_value = JsFuture::from(window.fetch_with_request(&request)).await?;
    let resp: Response = resp_value.dyn_into()?;

    // Read response as JSON
    let json = JsFuture::from(resp.json()?).await?;

    Ok(json)
}
```

### Using WebGL and Canvas

For graphics-intensive applications, WebGL provides hardware-accelerated rendering:

```rust
use wasm_bindgen::prelude::*;
use web_sys::{HtmlCanvasElement, WebGlRenderingContext};

#[wasm_bindgen]
pub fn setup_webgl() -> Result<(), JsValue> {
    let window = web_sys::window().expect("no global window exists");
    let document = window.document().expect("no document on window");

    let canvas = document.get_element_by_id("canvas")
        .expect("should have canvas element")
        .dyn_into::<HtmlCanvasElement>()?;

    let context = canvas
        .get_context("webgl")?
        .expect("browser should support webgl")
        .dyn_into::<WebGlRenderingContext>()?;

    // Set up WebGL rendering
    context.clear_color(0.0, 0.0, 0.0, 1.0);
    context.clear(WebGlRenderingContext::COLOR_BUFFER_BIT);

    // More WebGL setup...

    Ok(())
}
```

These examples demonstrate the power and flexibility of using Rust with WebAssembly for web development. In the next part of this chapter, we'll explore more advanced topics including performance optimization, server-side rendering, and building production-ready applications.

## Performance Optimization for WASM Applications

One of the primary reasons to use Rust with WebAssembly is performance. However, achieving optimal performance requires careful consideration and specific optimization techniques.

### Binary Size Optimization

WebAssembly binaries need to be downloaded by the browser, so keeping them small is crucial:

1. **Use the release profile**:

   ```toml
   [profile.release]
   opt-level = 3        # Maximum optimization
   lto = true           # Link-time optimization
   codegen-units = 1    # Maximize optimizations
   panic = 'abort'      # Remove panic unwinding code
   strip = true         # Strip symbols from binary
   ```

2. **Tree shaking with wasm-bindgen**:

   ```rust
   // Only export what's necessary
   #[wasm_bindgen]
   pub fn exposed_function() { /* ... */ }

   // Internal function not exported to JS
   fn internal_function() { /* ... */ }
   ```

3. **Use wasm-opt**:

   ```bash
   wasm-opt -Oz -o output.wasm input.wasm
   ```

4. **Code splitting**:
   ```rust
   // Feature flags to include only what's needed
   #[cfg(feature = "advanced")]
   pub fn advanced_functionality() { /* ... */ }
   ```

### Computational Performance

For computation-heavy tasks, optimizing the core algorithms is essential:

1. **Minimize allocations**:

   ```rust
   // Reuse buffers instead of allocating new ones
   pub struct ImageProcessor {
       buffer: Vec<u8>,
       width: usize,
       height: usize,
   }

   impl ImageProcessor {
       pub fn process(&mut self, input: &[u8]) {
           // Reuse existing buffer if possible
           if self.buffer.len() < input.len() {
               self.buffer.resize(input.len(), 0);
           }

           // Process input into buffer
           for (i, pixel) in input.chunks(4).enumerate() {
               // Process pixels...
           }
       }
   }
   ```

2. **Use SIMD when available**:

   ```rust
   #[cfg(target_feature = "simd128")]
   pub fn sum_f32_simd(values: &[f32]) -> f32 {
       use wasm_bindgen::JsValue;
       use std::arch::wasm32::*;

       let mut sum = f32x4_splat(0.0);
       let chunks = values.chunks_exact(4);
       let remainder = chunks.remainder();

       for chunk in chunks {
           let v = unsafe { f32x4_load(chunk.as_ptr() as *const f32) };
           sum = f32x4_add(sum, v);
       }

       let mut result = f32x4_extract_lane::<0>(sum) +
                        f32x4_extract_lane::<1>(sum) +
                        f32x4_extract_lane::<2>(sum) +
                        f32x4_extract_lane::<3>(sum);

       for &val in remainder {
           result += val;
       }

       result
   }
   ```

3. **Minimize JS/Rust boundary crossings**:

   ```rust
   // Inefficient: Many boundary crossings
   #[wasm_bindgen]
   pub fn process_items_inefficient(items: &[JsValue]) -> Vec<JsValue> {
       items.iter().map(|item| {
           // Each iteration crosses the boundary
           process_single_item(item)
       }).collect()
   }

   // Efficient: Single boundary crossing
   #[wasm_bindgen]
   pub fn process_items_efficient(items: &[JsValue]) -> Vec<JsValue> {
       // Process everything in Rust, then return
       let mut results = Vec::with_capacity(items.len());
       for item in items {
           let processed = process_single_item_internal(item);
           results.push(processed);
       }
       results
   }
   ```

### Memory Management Optimization

Efficient memory management is critical for WebAssembly performance:

1. **Reuse memory**:

   ```rust
   pub struct BufferPool {
       buffers: Vec<Vec<u8>>,
   }

   impl BufferPool {
       pub fn get_buffer(&mut self, size: usize) -> Vec<u8> {
           // Find a buffer of appropriate size or create a new one
           match self.buffers.iter().position(|buf| buf.capacity() >= size) {
               Some(idx) => self.buffers.swap_remove(idx),
               None => Vec::with_capacity(size),
           }
       }

       pub fn return_buffer(&mut self, buffer: Vec<u8>) {
           self.buffers.push(buffer);
       }
   }
   ```

2. **Optimize memory layout**:

   ```rust
   // Cache-friendly layout: Group data accessed together
   #[repr(C)]
   struct Particle {
       // Position and velocity are often accessed together
       position_x: f32,
       position_y: f32,
       velocity_x: f32,
       velocity_y: f32,
       // Other properties...
   }

   // Array of Structs vs Struct of Arrays
   struct ParticleSystem {
       // Array of Structs (AoS)
       particles: Vec<Particle>,

       // Struct of Arrays (SoA) - can be more efficient for SIMD
       // positions_x: Vec<f32>,
       // positions_y: Vec<f32>,
       // velocities_x: Vec<f32>,
       // velocities_y: Vec<f32>,
   }
   ```

3. **Custom allocators**:

   ```rust
   use wasm_bindgen::prelude::*;
   use std::alloc::{GlobalAlloc, Layout};

   struct WebAssemblyAllocator;

   unsafe impl GlobalAlloc for WebAssemblyAllocator {
       unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
           // Custom allocation strategy for WebAssembly
           // ...
       }

       unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
           // Custom deallocation
           // ...
       }
   }

   #[global_allocator]
   static ALLOCATOR: WebAssemblyAllocator = WebAssemblyAllocator;
   ```

### Loading and Initialization Optimization

Fast startup time is crucial for web applications:

1. **Lazy loading**:

   ```javascript
   // In JavaScript
   async function loadWasmModule() {
     if (window.wasmModule) return window.wasmModule;

     // Load only when needed
     const module = await import("./pkg/my_wasm_lib.js");
     await module.default();
     window.wasmModule = module;
     return module;
   }
   ```

2. **Streaming compilation**:

   ```javascript
   // In JavaScript
   async function loadWasm() {
     // Compile while downloading
     const { instance } = await WebAssembly.instantiateStreaming(
       fetch("my_module.wasm"),
       importObject
     );
     return instance.exports;
   }
   ```

3. **Progressive enhancement**:

   ```html
   <!-- In HTML -->
   <div id="app">
     <!-- Initial server-rendered content -->
     <div class="loading">Loading advanced features...</div>
   </div>

   <script type="module">
     // Load Rust WASM module for enhanced functionality
     import { initialize } from "./pkg/my_wasm_lib.js";
     initialize().then(() => {
       document.querySelector(".loading").remove();
       // Enable advanced features...
     });
   </script>
   ```

### Profiling and Benchmarking

Effective optimization requires measurement:

1. **Browser performance tools**:

   - Use Chrome DevTools Performance panel
   - Use Firefox Profiler
   - Analyze WebAssembly code with browser tools

2. **Custom performance measurement**:

   ```rust
   use web_sys::Performance;

   #[wasm_bindgen]
   pub fn benchmark_function() -> f64 {
       let window = web_sys::window().expect("should have window");
       let performance = window.performance().expect("should have performance");

       let start = performance.now();

       // Code to benchmark
       for _ in 0..1000 {
           expensive_operation();
       }

       let end = performance.now();
       end - start
   }
   ```

3. **Memory profiling**:
   ```rust
   #[wasm_bindgen]
   pub fn memory_usage() -> JsValue {
       let mut usage = std::collections::HashMap::new();

       // Get memory statistics
       // This is simplified; actual implementation would require
       // custom instrumentation
       usage.insert("heap_size", js_sys::global().total_js_heap_size());
       usage.insert("used_heap", js_sys::global().used_js_heap_size());

       serde_wasm_bindgen::to_value(&usage).unwrap()
   }
   ```

By applying these optimization techniques, you can ensure your Rust WebAssembly applications are both fast to load and execute efficiently once running.

## Building and Bundling WASM Applications

To deploy a production-ready WebAssembly application, you need proper building and bundling strategies.

### Using wasm-pack

[wasm-pack](https://rustwasm.github.io/wasm-pack/) is the standard tool for building Rust WebAssembly packages:

```bash
# Basic build
wasm-pack build

# Target different environments
wasm-pack build --target web       # For direct use in browsers
wasm-pack build --target bundler   # For bundlers like webpack
wasm-pack build --target nodejs    # For Node.js
wasm-pack build --target no-modules # For script tags

# Include debug symbols for development
wasm-pack build --dev
```

### Integration with JavaScript Bundlers

Most projects use bundlers like webpack, Rollup, or Vite to manage dependencies:

#### Webpack Configuration:

```javascript
// webpack.config.js
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

module.exports = {
  entry: "./js/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "index.html",
    }),
    new WasmPackPlugin({
      crateDirectory: path.resolve(__dirname, "."),
    }),
  ],
  experiments: {
    asyncWebAssembly: true,
  },
};
```

#### Vite Configuration:

```javascript
// vite.config.js
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  build: {
    target: "esnext",
  },
});
```

### Optimized Production Builds

For production, additional optimizations are recommended:

```bash
# Build with optimizations
wasm-pack build --release -- --features production

# Further optimize with wasm-opt
wasm-opt -Oz -o optimized.wasm pkg/my_crate_bg.wasm
```

### Serving WebAssembly Files

WebAssembly files need proper MIME types when served:

```nginx
# Nginx configuration
server {
    # ...
    location ~ \.wasm$ {
        types { application/wasm wasm; }
    }
}
```

### Code Splitting and Lazy Loading

For larger applications, consider code splitting:

```javascript
// In JavaScript
async function loadFeature() {
  // Only load the feature when needed
  const feature = await import("./features/advanced.js");
  const wasmModule = await feature.initWasm();
  return wasmModule;
}

// Use when required
button.addEventListener("click", async () => {
  const module = await loadFeature();
  module.runAdvancedFeature();
});
```

## Conclusion

WebAssembly and Rust together create a powerful platform for building high-performance web applications. The combination of Rust's safety guarantees and WebAssembly's near-native performance opens up new possibilities for web development.

In this chapter, we've explored the fundamentals of WebAssembly from a Rust developer's perspective, examined modern frontend frameworks like Yew, Leptos, and Dioxus, and covered essential topics like state management, JavaScript interoperability, and performance optimization.

As the WebAssembly ecosystem continues to evolve, Rust remains at the forefront, with excellent tooling and framework support. By mastering the techniques covered in this chapter, you're well-equipped to build sophisticated, performant web applications using Rust and WebAssembly.

## Exercises

1. Create a simple counter application using each of the three frameworks (Yew, Leptos, and Dioxus) and compare their code organization and performance.

2. Build a web application that performs image processing (like grayscale conversion or blur effects) using Rust WebAssembly for the computationally intensive parts.

3. Create a reusable component library with one of the frameworks, complete with proper documentation and examples.

4. Implement a hybrid application that uses both Rust/WASM and JavaScript, leveraging the strengths of each technology.

5. Profile a WebAssembly application and identify performance bottlenecks, then optimize them using the techniques covered in this chapter.

6. Build a WebAssembly module that can be dynamically loaded and unloaded to implement a plugin system for a web application.

7. Create a server-rendered application with hydration using Leptos or a similar framework that supports this pattern.

8. Implement a custom allocator optimized for a specific WebAssembly use case, and benchmark it against the default allocator.

## Project: Interactive Web Application

Let's put everything together by building a feature-rich single-page application using Rust and WebAssembly. We'll create a task management application with the following features:

- Task creation, editing, and deletion
- Task categorization and filtering
- Data persistence using localStorage
- Drag-and-drop for task reordering
- Performance optimizations for large task lists

This project will demonstrate how to build a complete, production-ready web application using Rust and WebAssembly, incorporating the concepts covered in this chapter.
