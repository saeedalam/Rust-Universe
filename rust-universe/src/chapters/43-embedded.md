# Chapter 43: Embedded Systems and IoT

## Introduction

Embedded systems are specialized computing systems designed to perform dedicated functions within larger mechanical or electrical systems. From simple microcontrollers in household appliances to complex systems in automobiles and industrial equipment, embedded systems are everywhere in our modern world. The Internet of Things (IoT) extends this concept by connecting these devices to the internet, enabling them to collect and exchange data.

Rust offers unique advantages for embedded and IoT development:

1. **Memory safety without garbage collection**: Rust's ownership model ensures memory safety without the need for a garbage collector, which is crucial for systems with limited resources.

2. **Predictable performance**: Rust provides fine-grained control over hardware while eliminating whole classes of bugs at compile time.

3. **Zero-cost abstractions**: Rust allows you to write high-level code that compiles down to efficient low-level code without runtime overhead.

4. **Strong cross-platform support**: Rust can target many different processor architectures, making it an excellent choice for heterogeneous IoT ecosystems.

5. **Growing ecosystem of embedded libraries**: The Rust community has developed rich libraries and frameworks for embedded development.

In this chapter, we'll explore how to use Rust for embedded systems and IoT applications. We'll cover programming microcontrollers, handling hardware resources, implementing communication protocols, and building a complete IoT sensor node project.

## Embedded Programming Concepts

Before diving into Rust-specific aspects of embedded programming, let's review some fundamental concepts that apply to embedded systems development.

### What Makes Embedded Systems Different?

Embedded systems differ from general-purpose computing in several key ways:

1. **Resource constraints**: Embedded systems typically have limited memory, processing power, and energy availability.

2. **Real-time requirements**: Many embedded systems must respond to events within strict timing constraints.

3. **Direct hardware interaction**: Embedded software often interacts directly with hardware through memory-mapped registers.

4. **No operating system or minimal OS**: Many embedded systems run without an OS ("bare metal") or with a minimal real-time operating system (RTOS).

5. **Long-running code**: Embedded systems often need to run continuously for years without rebooting.

6. **Safety and reliability requirements**: Many embedded systems control critical functions where failures could be dangerous.

### Common Embedded System Components

A typical embedded system includes:

1. **Microcontroller or processor**: The central computing unit (e.g., ARM Cortex-M, RISC-V, AVR)

2. **Memory**:

   - Flash memory for program storage
   - RAM for runtime data
   - EEPROM/Flash for persistent data storage

3. **Input/Output peripherals**:

   - GPIO (General Purpose Input/Output) pins
   - ADC (Analog-to-Digital Converters)
   - DAC (Digital-to-Analog Converters)
   - PWM (Pulse Width Modulation)

4. **Communication interfaces**:

   - UART (Universal Asynchronous Receiver-Transmitter)
   - SPI (Serial Peripheral Interface)
   - I2C (Inter-Integrated Circuit)
   - CAN (Controller Area Network)
   - USB (Universal Serial Bus)
   - Wireless protocols (Wi-Fi, Bluetooth, LoRa, etc.)

5. **Timers and interrupts**: For handling time-dependent operations and asynchronous events

6. **Power management components**: To control and minimize power consumption

### Embedded Development Workflow

The typical workflow for embedded development differs from application development:

1. **Code development**: Write code using an IDE or text editor

2. **Cross-compilation**: Compile the code on a development machine for the target architecture

3. **Flashing**: Transfer the compiled binary to the target device's program memory

4. **Debugging**: Use hardware debuggers like JTAG or SWD to debug the running code

5. **Testing**: Test the system's functionality, often requiring specialized hardware

This workflow introduces unique challenges, such as the need for cross-compilation toolchains, hardware debugging tools, and testing with physical hardware.

## Bare Metal Rust

"Bare metal" programming refers to writing code that runs directly on hardware without an operating system. Rust has excellent support for bare metal programming, enabling developers to write safe, efficient code for microcontrollers and other embedded devices.

### Setting Up for Bare Metal Development

To start with bare metal Rust, you'll need:

1. **Rust and Cargo**: The standard Rust toolchain

2. **Target-specific toolchain**: Support for your target architecture (e.g., `thumbv7em-none-eabihf` for ARM Cortex-M4F)

3. **cargo-binutils**: For working with binary files

4. **probe-run or similar flashing tools**: To upload your code to the device

Here's how to set up these tools:

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add target support for Cortex-M thumbv7em architecture with hardware floating point
rustup target add thumbv7em-none-eabihf

# Install cargo-binutils
cargo install cargo-binutils
rustup component add llvm-tools-preview

# Install probe-run for flashing and debugging
cargo install probe-run
```

### Creating a Bare Metal Project

Let's create a simple LED blinking project for an ARM Cortex-M microcontroller. First, set up a new Cargo project:

```bash
cargo new --bin blinky
cd blinky
```

Next, configure the project for cross-compilation by creating a `.cargo/config.toml` file:

```toml
[target.'cfg(all(target_arch = "arm", target_os = "none"))']
rustflags = [
  "-C", "link-arg=-Tlink.x",
]

[build]
target = "thumbv7em-none-eabihf"

[unstable]
build-std = ["core", "alloc"]
```

Add the necessary dependencies to `Cargo.toml`:

```toml
[package]
name = "blinky"
version = "0.1.0"
edition = "2021"

[dependencies]
cortex-m = "0.7.7"
cortex-m-rt = "0.7.3"
panic-halt = "0.2.0"
embedded-hal = "0.2.7"

# Board-specific HAL (example for STM32F4xx)
stm32f4xx-hal = { version = "0.14.0", features = ["stm32f411"] }

[profile.release]
opt-level = "s"        # Optimize for size
lto = true             # Enable link-time optimization
codegen-units = 1      # Better optimizations at the cost of build time
debug = true           # Keep debug symbols for better stack traces
```

Now, let's write the code for blinking an LED (`src/main.rs`):

```rust
#![no_std]
#![no_main]

use core::panic::PanicInfo;
use cortex_m_rt::entry;
use stm32f4xx_hal::{
    gpio::{Output, Pin},
    pac,
    prelude::*,
};

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

#[entry]
fn main() -> ! {
    // Get access to device-specific peripherals
    let dp = pac::Peripherals::take().unwrap();

    // Set up the system clock
    let rcc = dp.RCC.constrain();
    let clocks = rcc.cfgr.sysclk(48.MHz()).freeze();

    // Set up GPIO for the LED (example for STM32F411 Discovery board)
    let gpiod = dp.GPIOD.split();
    let mut led = gpiod.pd12.into_push_pull_output();

    // Create a delay abstraction based on system clock
    let mut delay = dp.TIM2.delay_ms(&clocks);

    loop {
        // Toggle the LED
        led.toggle();

        // Wait for 500ms
        delay.delay_ms(500_u16);
    }
}
```

### The `no_std` Environment

One of the most important aspects of bare metal Rust is the `no_std` attribute. This tells the Rust compiler not to include the standard library, which depends on an operating system for features like threads, files, and network access.

Instead, bare metal Rust code uses the `core` library, which provides basic Rust functionality without OS dependencies:

```rust
#![no_std]  // Don't use the standard library
#![no_main] // Don't use the normal entry point chain
```

The `core` library provides:

- Basic types (`Option`, `Result`, etc.)
- Collections (but not ones that require dynamic memory allocation)
- Traits
- Basic operations on primitive types
- Panic mechanisms (but you need to provide a panic handler)

When using `no_std`, you need to implement several key components yourself or use libraries that provide them:

1. **Panic handler**: Defines what happens when a panic occurs
2. **Memory allocator**: If you need dynamic memory allocation
3. **Entry point**: The function where execution begins

### Memory Management in Bare Metal Rust

Memory management is a critical aspect of embedded programming. Rust's ownership model helps prevent many common memory-related bugs, but you still need to be aware of how memory is used in your embedded system.

#### Memory Layout

A typical embedded system has different types of memory:

- **Flash**: Non-volatile memory for program code and constants
- **RAM**: Volatile memory for stack and heap
- **Special memory regions**: For memory-mapped peripherals

The memory layout is defined in a linker script (often called `memory.x`):

```
MEMORY
{
  /* Example memory layout for an STM32F411 microcontroller */
  FLASH : ORIGIN = 0x08000000, LENGTH = 512K
  RAM : ORIGIN = 0x20000000, LENGTH = 128K
}

/* This is where the call stack will be allocated */
_stack_start = ORIGIN(RAM) + LENGTH(RAM);
```

#### Static Allocation

In many embedded systems, especially very constrained ones, all memory is statically allocated at compile time. Rust's strong type system and ownership model work well with this approach:

```rust
// Statically allocated buffer
static mut BUFFER: [u8; 1024] = [0; 1024];

fn use_buffer() {
    // Safety: We need to ensure exclusive access when using static mut
    unsafe {
        BUFFER[0] = 42;
    }
}
```

#### Heap Allocation

For more complex applications, you might want to use dynamic memory allocation. In `no_std` environments, you need to provide your own allocator:

```rust
#![feature(alloc_error_handler)]
extern crate alloc;

use alloc::vec::Vec;
use core::alloc::{GlobalAlloc, Layout};

// A very simple bump allocator
struct BumpAllocator {
    heap_start: usize,
    heap_end: usize,
    next: usize,
}

unsafe impl GlobalAlloc for BumpAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        // Simplified implementation
        let alloc_start = align_up(self.next, layout.align());
        let alloc_end = alloc_start + layout.size();

        if alloc_end <= self.heap_end {
            self.next = alloc_end;
            alloc_start as *mut u8
        } else {
            core::ptr::null_mut()
        }
    }

    unsafe fn dealloc(&self, _ptr: *mut u8, _layout: Layout) {
        // This allocator never frees memory
    }
}

fn align_up(addr: usize, align: usize) -> usize {
    (addr + align - 1) & !(align - 1)
}

// Declare a global allocator
#[global_allocator]
static ALLOCATOR: BumpAllocator = BumpAllocator {
    heap_start: 0x2000_0000,
    heap_end: 0x2000_4000,
    next: 0x2000_0000,
};

// Required for handling allocation failures
#[alloc_error_handler]
fn alloc_error(_layout: Layout) -> ! {
    loop {}
}

// Now we can use heap-allocated types from the alloc crate
fn use_vec() {
    let mut vec = Vec::new();
    vec.push(42);
}
```

In practice, you would typically use a more sophisticated allocator like `alloc-cortex-m` or `embedded-alloc`.

### Handling Peripherals

Microcontrollers interact with the outside world through peripherals, which are accessed through memory-mapped registers. In Rust, peripherals are typically modeled using the "type-state" pattern, which encodes the state of a peripheral in its type.

The `embedded-hal` crate defines traits for common peripherals, allowing for portable code:

```rust
use embedded_hal::digital::v2::OutputPin;

// This function works with any type that implements OutputPin
fn blink<P: OutputPin>(led: &mut P, delay_ms: u32) -> Result<(), P::Error> {
    led.set_high()?;
    // Delay implementation would go here
    led.set_low()?;
    // Delay implementation would go here
    Ok(())
}
```

Different microcontroller families have their own HAL (Hardware Abstraction Layer) crates that implement these traits for specific hardware. For example, the STM32F4 HAL provides implementations for STM32F4xx microcontrollers:

```rust
use stm32f4xx_hal::{
    gpio::{gpioa::PA5, Output, PushPull},
    prelude::*,
};

// This function only works with the specific LED pin type
fn blink_specific_led(led: &mut PA5<Output<PushPull>>) {
    led.set_high().unwrap();
    // Delay implementation would go here
    led.set_low().unwrap();
    // Delay implementation would go here
}
```

### Interrupt Handling

Interrupts are essential for responsive embedded systems. Rust provides safe abstractions for interrupt handling through crates like `cortex-m-rt`:

```rust
use cortex_m::peripheral::Peripherals;
use cortex_m_rt::{entry, exception, interrupt};
use stm32f4xx_hal::stm32::{interrupt, Interrupt, EXTI};

#[entry]
fn main() -> ! {
    let p = Peripherals::take().unwrap();

    // Configure GPIO for interrupt
    // ...

    // Enable the EXTI interrupt in the NVIC
    unsafe {
        cortex_m::peripheral::NVIC::unmask(Interrupt::EXTI0);
    }

    loop {
        // Go to sleep until an interrupt occurs
        cortex_m::asm::wfi();
    }
}

#[interrupt]
fn EXTI0() {
    // Handle the interrupt
    // ...

    // Clear the interrupt pending bit
    unsafe {
        let exti = &(*EXTI::ptr());
        exti.pr.write(|w| w.pr0().set_bit());
    }
}

#[exception]
fn HardFault(ef: &cortex_m_rt::ExceptionFrame) -> ! {
    panic!("HardFault at {:#?}", ef);
}
```

This pattern ensures that interrupt handlers are registered correctly and provides a safe way to handle exceptions.

## No-std Development

### Understanding the `no_std` Ecosystem

The `no_std` ecosystem in Rust has grown significantly, with many crates designed specifically for constrained environments. Here are some key crates for `no_std` development:

1. **Core Library**: Provides essential Rust types and traits without OS dependencies.

2. **Alloc Library**: Provides collection types that require heap allocation, if you provide an allocator.

3. **embedded-hal**: Defines traits for common embedded peripherals.

4. **cortex-m**: Support for ARM Cortex-M processors.

5. **cortex-m-rt**: Runtime support for Cortex-M processors.

6. **panic-halt**: A simple panic handler that halts execution.

7. **micromath**: Math routines optimized for microcontrollers.

8. **heapless**: Collection types that don't require heap allocation.

### Working with Collections in `no_std`

The `heapless` crate provides fixed-size versions of common collections:

```rust
use heapless::{Vec, String, consts::U128};

fn use_heapless_collections() {
    // A vector with a maximum capacity of 128 elements
    let mut vec: Vec<u32, U128> = Vec::new();
    vec.push(42).unwrap();

    // A string with a maximum capacity of 128 bytes
    let mut string: String<U128> = String::new();
    string.push_str("Hello, world!").unwrap();
}
```

### Error Handling in `no_std`

Error handling in `no_std` environments follows the same patterns as standard Rust, but with some constraints:

```rust
// Using Result for recoverable errors
fn perform_operation() -> Result<u32, Error> {
    // ...
    Ok(42)
}

// Define a custom error type
#[derive(Debug)]
enum Error {
    InvalidInput,
    HardwareFailure,
}

// For unrecoverable errors, use panic
fn critical_operation(value: u32) {
    if value == 0 {
        panic!("Critical failure: value cannot be zero");
    }
    // ...
}
```

### Optimizing for Size and Performance

Embedded systems often have strict constraints on code size and performance. Rust provides several ways to optimize your code:

```toml
[profile.release]
opt-level = "s"        # Optimize for size
lto = true             # Enable link-time optimization
codegen-units = 1      # Better optimizations at the cost of build time
debug = true           # Keep debug symbols for better stack traces
```

You can further reduce binary size using the `panic-abort` crate, which simplifies panic handling:

```toml
[dependencies]
panic-abort = "0.3.2"
```

For performance-critical code, you might need to use inline assembly:

```rust
use core::arch::asm;

// Count leading zeros using a processor-specific instruction
unsafe fn count_leading_zeros(value: u32) -> u32 {
    let result: u32;
    asm!(
        "clz {result}, {value}",
        value = in(reg) value,
        result = out(reg) result,
    );
    result
}
```

## Working with Microcontrollers

### Understanding Microcontroller Architecture

A microcontroller is a small computer on a single integrated circuit containing a processor core, memory, and programmable input/output peripherals. Common microcontroller families include:

1. **ARM Cortex-M**: Widely used 32-bit architecture (e.g., STM32, NXP, Nordic nRF)
2. **RISC-V**: Open-source instruction set architecture gaining popularity
3. **AVR**: 8-bit architecture used in Arduino boards
4. **ESP32/ESP8266**: Popular Wi-Fi and Bluetooth-enabled microcontrollers

### Selecting a Development Board

For learning embedded Rust, consider these popular development boards:

1. **STM32F4 Discovery**: Feature-rich ARM Cortex-M4F board with good Rust support
2. **nRF52840 DK**: Nordic's development kit with BLE capabilities
3. **Adafruit Feather nRF52840**: Compact board with USB and battery support
4. **Raspberry Pi Pico**: Affordable dual-core RP2040 microcontroller
5. **ESP32-C3 DevKit**: RISC-V based Wi-Fi and Bluetooth capable board

### GPIO and Digital I/O

General Purpose Input/Output (GPIO) pins are the most basic way for microcontrollers to interact with the outside world. Here's how to use GPIO pins in Rust:

```rust
use stm32f4xx_hal::{gpio::*, prelude::*};

fn gpio_example(dp: stm32f4xx_hal::pac::Peripherals) {
    // Initialize GPIO ports
    let gpioa = dp.GPIOA.split();

    // Configure pins
    let mut led = gpioa.pa5.into_push_pull_output(); // Output pin
    let button = gpioa.pa0.into_pull_up_input();     // Input pin with pull-up

    // Set output high/low
    led.set_high().unwrap();
    led.set_low().unwrap();

    // Read input
    if button.is_high().unwrap() {
        // Button is not pressed (due to pull-up)
    } else {
        // Button is pressed
    }

    // Toggle output
    led.toggle().unwrap();
}
```

### Analog Input and Output

Many microcontrollers have Analog-to-Digital Converters (ADCs) and Digital-to-Analog Converters (DACs):

```rust
use stm32f4xx_hal::{adc, dac, prelude::*};

fn analog_example(dp: stm32f4xx_hal::pac::Peripherals) {
    // Set up clocks
    let rcc = dp.RCC.constrain();
    let clocks = rcc.cfgr.freeze();

    // Set up GPIO ports
    let gpioa = dp.GPIOA.split();

    // Set up ADC
    let adc_pin = gpioa.pa0.into_analog();
    let mut adc = adc::Adc::adc1(dp.ADC1, true, adc::config::AdcConfig::default());

    // Read analog value
    let analog_value: u16 = adc.convert(&adc_pin, adc::config::SampleTime::Cycles_480);

    // Set up DAC
    let mut dac = dac::Dac::new(dp.DAC);
    let mut dac_pin = gpioa.pa4.into_analog();

    // Output analog value
    dac.enable(&mut dac_pin);
    dac.set_value(&mut dac_pin, analog_value / 16); // DAC is 12-bit, adjust as needed
}
```

### Timers and PWM

Timers are useful for timing events and generating PWM signals:

```rust
use stm32f4xx_hal::{prelude::*, timer::{Timer, Event}};

fn timer_example(dp: stm32f4xx_hal::pac::Peripherals) {
    // Set up clocks
    let rcc = dp.RCC.constrain();
    let clocks = rcc.cfgr.freeze();

    // Create a 1 second timer
    let mut timer = Timer::tim2(dp.TIM2, 1.Hz(), clocks);

    // Set up an interrupt on timer expiry
    timer.listen(Event::TimeOut);

    // Create a PWM output
    let gpioa = dp.GPIOA.split();
    let channels = (
        gpioa.pa0.into_alternate(),
        gpioa.pa1.into_alternate(),
    );

    // TIM2 channels 1 and 2 as PWM outputs
    let mut pwm = dp.TIM2.pwm(
        channels,
        20.kHz(),
        clocks,
    );

    // Set duty cycle (0-100%)
    let max_duty = pwm.get_max_duty();
    pwm.set_duty(0, max_duty / 2); // 50% duty cycle on channel 1

    // Enable PWM outputs
    pwm.enable(0);
}
```

### Communication Protocols

Microcontrollers use various communication protocols to interact with sensors, actuators, and other devices:

#### UART (Serial Communication)

```rust
use stm32f4xx_hal::{
    serial::{config::Config, Serial},
    prelude::*,
};

fn uart_example(dp: stm32f4xx_hal::pac::Peripherals) {
    // Set up clocks
    let rcc = dp.RCC.constrain();
    let clocks = rcc.cfgr.freeze();

    // Set up UART pins
    let gpioa = dp.GPIOA.split();
    let tx_pin = gpioa.pa2.into_alternate();
    let rx_pin = gpioa.pa3.into_alternate();

    // Set up UART with 115200 baud
    let serial = Serial::new(
        dp.USART2,
        (tx_pin, rx_pin),
        Config::default().baudrate(115_200.bps()),
        clocks,
    ).unwrap();

    // Split into TX and RX parts
    let (mut tx, mut rx) = serial.split();

    // Send data
    tx.write(b'X').unwrap();

    // Receive data (blocking)
    let received = nb::block!(rx.read()).unwrap();
}
```

#### SPI

```rust
use stm32f4xx_hal::{
    spi::{Mode, Phase, Polarity, Spi},
    prelude::*,
};

fn spi_example(dp: stm32f4xx_hal::pac::Peripherals) {
    // Set up clocks
    let rcc = dp.RCC.constrain();
    let clocks = rcc.cfgr.freeze();

    // Set up SPI pins
    let gpioa = dp.GPIOA.split();
    let sck = gpioa.pa5.into_alternate();
    let miso = gpioa.pa6.into_alternate();
    let mosi = gpioa.pa7.into_alternate();

    // Chip select pin
    let mut cs = gpioa.pa4.into_push_pull_output();
    cs.set_high().unwrap(); // Deselect device initially

    // Set up SPI with custom mode
    let mode = Mode {
        polarity: Polarity::IdleLow,
        phase: Phase::CaptureOnFirstTransition,
    };

    let mut spi = Spi::new(
        dp.SPI1,
        (sck, miso, mosi),
        mode,
        1.MHz(),
        clocks,
    );

    // SPI transaction
    cs.set_low().unwrap(); // Select device

    // Send and receive data
    let send_data = [0x01, 0x02, 0x03];
    let mut receive_data = [0u8; 3];

    for (send_byte, receive_byte) in send_data.iter().zip(receive_data.iter_mut()) {
        *receive_byte = nb::block!(spi.send(*send_byte)).unwrap();
    }

    cs.set_high().unwrap(); // Deselect device
}
```

#### I2C

```rust
use stm32f4xx_hal::{
    i2c::{I2c, Mode},
    prelude::*,
};

fn i2c_example(dp: stm32f4xx_hal::pac::Peripherals) {
    // Set up clocks
    let rcc = dp.RCC.constrain();
    let clocks = rcc.cfgr.freeze();

    // Set up I2C pins
    let gpiob = dp.GPIOB.split();
    let scl = gpiob.pb8.into_alternate_open_drain();
    let sda = gpiob.pb9.into_alternate_open_drain();

    // Set up I2C
    let mut i2c = I2c::new(
        dp.I2C1,
        (scl, sda),
        Mode::Standard { frequency: 100.kHz() },
        clocks,
    );

    // Device address (7-bit address shifted left by 1)
    let device_addr = 0x48;

    // Write to device
    let write_data = [0x01, 0x02];
    i2c.write(device_addr, &write_data).unwrap();

    // Read from device
    let mut read_data = [0u8; 2];
    i2c.read(device_addr, &mut read_data).unwrap();

    // Write then read (common pattern for register access)
    let register_addr = [0x00]; // Register to read from
    i2c.write_read(device_addr, &register_addr, &mut read_data).unwrap();
}
```

## Hardware Abstraction Layers

A Hardware Abstraction Layer (HAL) provides an interface between the hardware and the software, abstracting away the hardware-specific details. This makes the code more portable and easier to maintain.

### The `embedded-hal` Traits

The `embedded-hal` crate defines a set of traits that represent common embedded peripherals. By programming against these traits rather than specific hardware implementations, you can write portable code that works across different microcontroller families.

```rust
use embedded_hal::digital::v2::{InputPin, OutputPin};
use embedded_hal::blocking::delay::DelayMs;

// This function works with any hardware that implements the required traits
fn blink_led<LED, BUTTON, DELAY>(
    led: &mut LED,
    button: &BUTTON,
    delay: &mut DELAY,
    duration_ms: u32,
) -> Result<(), Error>
where
    LED: OutputPin,
    BUTTON: InputPin,
    DELAY: DelayMs<u32>,
    Error: From<LED::Error> + From<BUTTON::Error>,
{
    // Check button state
    if button.is_high()? {
        // Toggle LED
        led.set_high()?;
        delay.delay_ms(duration_ms);
        led.set_low()?;
        delay.delay_ms(duration_ms);
    }

    Ok(())
}
```

### Board Support Packages (BSPs)

A Board Support Package (BSP) provides a higher-level abstraction specific to a particular development board. BSPs build on top of HALs to provide convenient access to board-specific features like LEDs, buttons, and on-board sensors.

```rust
// Example using the STM32F4DISCOVERY BSP
use stm32f4xx_hal::prelude::*;
use stm32f4_discovery::led::Leds;
use stm32f4_discovery::button::UserButton;

fn bsp_example() -> ! {
    // Get access to device-specific peripherals
    let dp = stm32f4xx_hal::pac::Peripherals::take().unwrap();

    // Set up the system clock
    let rcc = dp.RCC.constrain();
    let clocks = rcc.cfgr.sysclk(48.MHz()).freeze();

    // Initialize the board's LEDs
    let gpiod = dp.GPIOD.split();
    let mut leds = Leds::new(gpiod);

    // Initialize the user button
    let gpioa = dp.GPIOA.split();
    let button = UserButton::new(gpioa.pa0);

    // Create a delay provider
    let mut delay = dp.TIM2.delay_ms(&clocks);

    loop {
        if button.is_pressed() {
            // Cycle through all LEDs
            leds.ld3.on();  // Orange LED
            delay.delay_ms(100_u32);
            leds.ld3.off();

            leds.ld4.on();  // Green LED
            delay.delay_ms(100_u32);
            leds.ld4.off();

            leds.ld5.on();  // Red LED
            delay.delay_ms(100_u32);
            leds.ld5.off();

            leds.ld6.on();  // Blue LED
            delay.delay_ms(100_u32);
            leds.ld6.off();
        }
    }
}
```

### Creating Custom HALs

Sometimes you may need to work with hardware that doesn't have an existing HAL. In such cases, you can create your own HAL implementation:

```rust
use embedded_hal::digital::v2::{InputPin, OutputPin};

// Define a custom HAL for a GPIO expander chip
pub struct GPIOExpander {
    i2c_addr: u8,
    // Fields for I2C interface
}

impl GPIOExpander {
    pub fn new(i2c_addr: u8) -> Self {
        Self { i2c_addr }
    }

    fn read_register(&self, reg: u8) -> u8 {
        // Implement I2C read from register
        0 // Placeholder
    }

    fn write_register(&mut self, reg: u8, value: u8) {
        // Implement I2C write to register
    }
}

// Implement OutputPin for a pin on the expander
pub struct OutputExpanderPin {
    expander: GPIOExpander,
    pin: u8,
}

impl OutputPin for OutputExpanderPin {
    type Error = ();

    fn set_low(&mut self) -> Result<(), Self::Error> {
        let current = self.expander.read_register(0x01);
        self.expander.write_register(0x01, current & !(1 << self.pin));
        Ok(())
    }

    fn set_high(&mut self) -> Result<(), Self::Error> {
        let current = self.expander.read_register(0x01);
        self.expander.write_register(0x01, current | (1 << self.pin));
        Ok(())
    }
}

// Similarly, implement InputPin for input pins
```

### The Type-State Pattern

The type-state pattern encodes the state of a peripheral in its type, making invalid operations unrepresentable. This is commonly used in HALs to ensure that peripherals are used correctly.

```rust
// Simplified example of type-state pattern for GPIO pins
use core::marker::PhantomData;

// Mode type states
pub struct Input<MODE> {
    _mode: PhantomData<MODE>,
}

pub struct Output<MODE> {
    _mode: PhantomData<MODE>,
}

// Pin configurations
pub struct Floating;
pub struct PullUp;
pub struct PullDown;
pub struct PushPull;
pub struct OpenDrain;

// Pin type with mode encoded in its type
pub struct Pin<MODE> {
    pin_number: u8,
    _mode: PhantomData<MODE>,
}

impl<MODE> Pin<MODE> {
    // Methods that apply to all pin modes
    pub fn pin_number(&self) -> u8 {
        self.pin_number
    }
}

impl Pin<Input<Floating>> {
    // Create a new floating input pin
    pub fn new_floating_input(pin_number: u8) -> Self {
        // Configure the hardware...
        Self {
            pin_number,
            _mode: PhantomData,
        }
    }

    // Convert to pull-up input
    pub fn into_pull_up_input(self) -> Pin<Input<PullUp>> {
        // Reconfigure the hardware...
        Pin {
            pin_number: self.pin_number,
            _mode: PhantomData,
        }
    }
}

impl Pin<Output<PushPull>> {
    // Create a new push-pull output pin
    pub fn new_push_pull_output(pin_number: u8) -> Self {
        // Configure the hardware...
        Self {
            pin_number,
            _mode: PhantomData,
        }
    }

    // Methods specific to output pins
    pub fn set_high(&mut self) {
        // Set pin high...
    }

    pub fn set_low(&mut self) {
        // Set pin low...
    }
}

// Usage
fn type_state_example() {
    let input_pin = Pin::new_floating_input(0);
    let pulled_up = input_pin.into_pull_up_input();

    let mut output_pin = Pin::new_push_pull_output(1);
    output_pin.set_high();
    output_pin.set_low();

    // This would not compile:
    // input_pin.set_high(); // Error: no method `set_high` on `Pin<Input<Floating>>`
}
```

## Real-time Programming

Real-time systems must respond to events within strict timing constraints. In embedded systems, real-time capabilities are often essential for applications like motor control, sensor sampling, and communication protocols.

### Real-time Concepts

There are two main categories of real-time systems:

1. **Hard Real-time**: Missing a deadline is a system failure (e.g., airbag deployment)
2. **Soft Real-time**: Missing a deadline degrades system performance but is not catastrophic (e.g., video playback)

Key concepts in real-time programming include:

- **Deadlines**: The time by which a task must complete
- **Jitter**: Variation in the timing of periodic events
- **Response Time**: The time between an event and the system's response
- **Priority**: The relative importance of different tasks

### Deterministic Timing in Rust

Rust's zero-cost abstractions and lack of garbage collection make it well-suited for real-time programming. However, achieving deterministic timing still requires careful programming.

#### Critical Sections

Critical sections are portions of code that must execute without interruption to maintain data consistency:

```rust
use cortex_m::interrupt;

static mut SHARED_DATA: u32 = 0;

fn critical_section_example() {
    // Enter a critical section by disabling interrupts
    interrupt::free(|_cs| {
        // Access shared data safely
        unsafe {
            SHARED_DATA += 1;
        }
    });
    // Interrupts are automatically re-enabled when we exit the closure
}
```

#### Interrupt Priorities

Setting appropriate interrupt priorities is crucial for real-time systems:

```rust
use cortex_m::peripheral::NVIC;
use stm32f4xx_hal::stm32::{interrupt, Interrupt};

fn configure_interrupts() {
    unsafe {
        // Set priorities (lower number = higher priority)
        // High priority for time-critical interrupt
        NVIC::set_priority(Interrupt::TIM2, 0);

        // Medium priority for less critical interrupt
        NVIC::set_priority(Interrupt::USART2, 1);

        // Low priority for background tasks
        NVIC::set_priority(Interrupt::EXTI0, 2);

        // Enable interrupts
        NVIC::unmask(Interrupt::TIM2);
        NVIC::unmask(Interrupt::USART2);
        NVIC::unmask(Interrupt::EXTI0);
    }
}
```

#### Avoiding Dynamic Memory Allocation

Dynamic memory allocation can introduce unpredictable delays. For real-time systems, prefer static allocation:

```rust
use heapless::Vec;
use heapless::consts::U128;

// Statically allocated vector with a maximum capacity of 128 elements
static mut BUFFER: Vec<u32, U128> = Vec::new();

fn real_time_processing() {
    interrupt::free(|_cs| {
        unsafe {
            // Clear the buffer
            BUFFER.clear();

            // Process data without dynamic allocation
            for i in 0..10 {
                BUFFER.push(i).unwrap();
            }
        }
    });
}
```

### Real-time Operating Systems (RTOS)

For more complex real-time applications, you might want to use a Real-time Operating System (RTOS). Several RTOS options are available for Rust:

#### RTFM (Real-Time For the Masses)

RTFM (now called RTIC - Real-Time Interrupt-driven Concurrency) is a framework for building real-time applications in Rust:

```rust
#![no_std]
#![no_main]

use panic_halt as _;
use rtic::app;
use stm32f4xx_hal::{
    gpio::{gpioa::PA5, Output, PushPull},
    prelude::*,
    stm32,
};

#[app(device = stm32f4xx_hal::stm32, peripherals = true)]
const APP: () = {
    // Define resources
    struct Resources {
        led: PA5<Output<PushPull>>,
    }

    // Initialization
    #[init]
    fn init(ctx: init::Context) -> init::LateResources {
        let device = ctx.device;

        // Configure clocks
        let rcc = device.RCC.constrain();
        let _clocks = rcc.cfgr.freeze();

        // Configure LED
        let gpioa = device.GPIOA.split();
        let led = gpioa.pa5.into_push_pull_output();

        // Set up timer interrupt
        // ...

        // Return initialized resources
        init::LateResources { led }
    }

    // Background task
    #[idle]
    fn idle(_: idle::Context) -> ! {
        loop {
            // Low-priority work
            cortex_m::asm::nop();
        }
    }

    // Timer interrupt task
    #[task(binds = TIM2, resources = [led])]
    fn timer_tick(ctx: timer_tick::Context) {
        // Toggle LED
        ctx.resources.led.toggle().unwrap();

        // Clear interrupt flag
        // ...
    }
};
```

#### FreeRTOS with Rust

You can also use FreeRTOS, a popular RTOS, with Rust through the `freertos-rust` crate:

```rust
use freertos_rust::{Duration, Task, TaskPriority};

fn freertos_example() {
    // Initialize FreeRTOS

    // Create a high-priority task
    let high_priority_task = Task::new()
        .name("high_priority")
        .priority(TaskPriority(3))
        .stack_size(128)
        .start(|| {
            loop {
                // High-priority work
                // ...

                // Yield to other tasks of same priority
                Task::delay(Duration::ms(10));
            }
        })
        .unwrap();

    // Create a medium-priority task
    let medium_priority_task = Task::new()
        .name("medium_priority")
        .priority(TaskPriority(2))
        .stack_size(128)
        .start(|| {
            loop {
                // Medium-priority work
                // ...

                Task::delay(Duration::ms(50));
            }
        })
        .unwrap();

    // Start the FreeRTOS scheduler
    // ...
}
```

### Measuring and Optimizing Real-time Performance

To ensure your system meets its timing requirements, you need to measure and optimize its performance:

#### Cycle Counting

You can use the Cortex-M's DWT (Data Watchpoint and Trace) unit to count CPU cycles:

```rust
use cortex_m::peripheral::DWT;

fn measure_execution_time<F>(f: F) -> u32
where
    F: FnOnce(),
{
    // Reset the cycle counter
    DWT::reset_cycle_count();

    // Run the function
    f();

    // Return the cycle count
    DWT::get_cycle_count()
}

fn timing_example() {
    // Enable the cycle counter
    unsafe { DWT::enable_cycle_counter(); }

    // Measure execution time
    let cycles = measure_execution_time(|| {
        // Code to measure
        for _ in 0..1000 {
            cortex_m::asm::nop();
        }
    });

    // Convert to time (assuming 48 MHz clock)
    let microseconds = cycles / 48;
}
```

#### Memory Access Patterns

Memory access patterns can significantly impact real-time performance. Prefer sequential access over random access, and be mindful of cache effects.

```rust
// Poor memory access pattern (cache unfriendly)
fn process_matrix_poor(matrix: &mut [[u32; 1000]; 1000]) {
    for j in 0..1000 {
        for i in 0..1000 {
            matrix[i][j] += 1; // Column-wise traversal is cache-unfriendly
        }
    }
}

// Better memory access pattern (cache friendly)
fn process_matrix_better(matrix: &mut [[u32; 1000]; 1000]) {
    for i in 0..1000 {
        for j in 0..1000 {
            matrix[i][j] += 1; // Row-wise traversal is cache-friendly
        }
    }
}
```

#### Avoiding Locks and Contention

In real-time systems, locks can lead to priority inversion, where a high-priority task is blocked by a lower-priority task. Use lock-free data structures where possible:

```rust
use core::sync::atomic::{AtomicU32, Ordering};

// Lock-free counter
static COUNTER: AtomicU32 = AtomicU32::new(0);

fn increment_counter() {
    COUNTER.fetch_add(1, Ordering::SeqCst);
}

fn get_counter() -> u32 {
    COUNTER.load(Ordering::SeqCst)
}
```

## Memory Constraints

Embedded systems typically have limited memory resources, often measured in kilobytes rather than gigabytes. Managing these constraints effectively is crucial for successful embedded development.

### Understanding Memory Types

Embedded systems have different types of memory with different characteristics:

1. **Flash/ROM**: Non-volatile memory for program storage

   - Typically larger than RAM (tens or hundreds of KB)
   - Slower to access than RAM
   - Limited write cycles (avoid frequent writes)

2. **RAM**: Volatile memory for runtime data

   - Typically smaller than Flash (a few KB to tens of KB)
   - Faster to access than Flash
   - Lost on power down

3. **EEPROM/Flash for data**: Non-volatile memory for configuration and data storage
   - Limited write cycles
   - Sometimes organized in pages or sectors

### Stack Usage Analysis

The stack is where local variables, function parameters, and return addresses are stored. In embedded systems, stack overflows can be catastrophic. Tools like `cortex-m-rtfm` can help analyze stack usage:

```rust
#[rtfm::app(device = stm32f4xx_hal::stm32, peripherals = true)]
const APP: () = {
    // Tasks with stack size analysis
    #[task(capacity = 4, priority = 2, stack_size = 256)]
    fn high_priority_task(ctx: high_priority_task::Context, data: u32) {
        // This task has 256 bytes of stack space
    }

    #[task(capacity = 8, priority = 1, stack_size = 512)]
    fn low_priority_task(ctx: low_priority_task::Context, data: u32) {
        // This task has 512 bytes of stack space
    }
};
```

### Static Memory Techniques

In constrained environments, static memory allocation is preferred:

```rust
// Use const generics for fixed-size arrays
fn process_buffer<const N: usize>(buffer: &mut [u8; N]) {
    for i in 0..N {
        buffer[i] = buffer[i].wrapping_add(1);
    }
}

// Use the heapless crate for static collections
use heapless::{Vec, String, FnvIndexMap};
use heapless::consts::*;

fn static_collections_example() {
    // A vector with a maximum of 16 elements
    let mut vec: Vec<u32, U16> = Vec::new();

    // A string with a maximum of 32 bytes
    let mut string: String<U32> = String::new();

    // A map with a maximum of 8 key-value pairs
    let mut map: FnvIndexMap<u8, u32, U8> = FnvIndexMap::new();

    // Add elements
    vec.push(42).unwrap();
    string.push_str("Hello").unwrap();
    map.insert(1, 100).unwrap();
}
```

### Memory-Mapped Peripherals

In embedded systems, peripherals are accessed through memory-mapped registers. Rust provides safe abstractions for working with these registers:

```rust
use core::ptr::{read_volatile, write_volatile};

// Define register addresses
const GPIO_ODR: *mut u32 = 0x4002_0014 as *mut u32;
const GPIO_IDR: *const u32 = 0x4002_0010 as *const u32;

unsafe fn toggle_led() {
    // Read current state
    let current = read_volatile(GPIO_ODR);

    // Toggle bit 5 (LED pin)
    let new_state = current ^ (1 << 5);

    // Write back
    write_volatile(GPIO_ODR, new_state);
}

unsafe fn read_button() -> bool {
    // Read input register
    let input = read_volatile(GPIO_IDR);

    // Check bit 0 (button pin)
    (input & (1 << 0)) != 0
}
```

However, it's usually better to use HAL libraries that provide safer abstractions.

### Memory Pool Allocators

For situations where dynamic allocation is necessary, consider using a memory pool allocator. This pre-allocates a fixed amount of memory and divides it into fixed-size blocks:

```rust
use core::alloc::{GlobalAlloc, Layout};
use core::cell::UnsafeCell;
use core::ptr;

struct Block {
    next: *mut Block,
}

struct PoolAllocator {
    block_size: usize,
    pool: UnsafeCell<*mut Block>,
}

unsafe impl Sync for PoolAllocator {}

unsafe impl GlobalAlloc for PoolAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        // Check if the requested size fits in our blocks
        if layout.size() <= self.block_size {
            let pool = self.pool.get();
            if !(*pool).is_null() {
                // Take the first free block
                let block = *pool;
                *pool = (*block).next;
                block as *mut u8
            } else {
                // No free blocks
                ptr::null_mut()
            }
        } else {
            // Requested size too large
            ptr::null_mut()
        }
    }

    unsafe fn dealloc(&self, ptr: *mut u8, _layout: Layout) {
        let block = ptr as *mut Block;
        let pool = self.pool.get();

        // Add the block back to the free list
        (*block).next = *pool;
        *pool = block;
    }
}

// Initialize the allocator with a fixed pool
static mut MEMORY_POOL: [u8; 4096] = [0; 4096];
const BLOCK_SIZE: usize = 128;
const NUM_BLOCKS: usize = 4096 / BLOCK_SIZE;

#[global_allocator]
static ALLOCATOR: PoolAllocator = {
    // Initialize the free list
    let mut free_list: *mut Block = ptr::null_mut();
    let mut i = NUM_BLOCKS;

    while i > 0 {
        i -= 1;
        let block = unsafe {
            (MEMORY_POOL.as_ptr() as usize + i * BLOCK_SIZE) as *mut Block
        };

        unsafe {
            (*block).next = free_list;
            free_list = block;
        }
    }

    PoolAllocator {
        block_size: BLOCK_SIZE,
        pool: UnsafeCell::new(free_list),
    }
};
```

### Handling Out-of-Memory Conditions

In constrained environments, it's important to handle out-of-memory conditions gracefully:

```rust
use heapless::Vec;
use heapless::consts::U16;

fn process_data(input: &[u8]) -> Result<(), Error> {
    let mut buffer: Vec<u8, U16> = Vec::new();

    for &byte in input {
        // Try to add to buffer, handle failure
        if buffer.push(byte).is_err() {
            return Err(Error::BufferFull);
        }
    }

    // Process buffer
    Ok(())
}

enum Error {
    BufferFull,
    // Other error types...
}
```

## Interrupt Handling

Interrupts are essential for embedded systems, allowing the CPU to respond to external events without constant polling.

### Interrupt Concepts

An interrupt is a signal that causes the CPU to pause its current execution, save its state, and execute an interrupt handler function. Common sources of interrupts include:

1. **Timer interrupts**: For periodic tasks
2. **GPIO interrupts**: For button presses or sensor signals
3. **Communication interrupts**: For UART, SPI, I2C events
4. **ADC interrupts**: When a conversion is complete
5. **DMA interrupts**: When a data transfer is complete

### The Interrupt Vector Table

The interrupt vector table (IVT) is a data structure that maps interrupt numbers to handler functions. In Rust, the `cortex-m-rt` crate helps set up the IVT:

```rust
#![no_std]
#![no_main]

use cortex_m_rt::{entry, exception, interrupt};
use panic_halt as _;
use stm32f4xx_hal::{interrupt, pac::{Interrupt, NVIC}};

#[entry]
fn main() -> ! {
    // Enable the EXTI0 interrupt in NVIC
    unsafe {
        NVIC::unmask(Interrupt::EXTI0);
    }

    loop {
        // Main loop code
    }
}

#[interrupt]
fn EXTI0() {
    // This function is called when the EXTI0 interrupt occurs
    // ...

    // Clear the interrupt pending bit
    // ...
}

#[exception]
fn HardFault(ef: &cortex_m_rt::ExceptionFrame) -> ! {
    // Handle hard fault exception
    loop {}
}
```

### Safe Interrupt Handling

Rust's ownership model helps ensure safe interrupt handling. The `cortex-m` crate provides tools for working with interrupts safely:

```rust
use cortex_m::interrupt::{free, Mutex};
use core::cell::RefCell;

// Shared resources protected by a mutex
static SHARED_DATA: Mutex<RefCell<u32>> = Mutex::new(RefCell::new(0));

#[entry]
fn main() -> ! {
    // Access shared data in the main thread
    free(|cs| {
        let mut data = SHARED_DATA.borrow(cs).borrow_mut();
        *data = 42;
    });

    loop {
        // Main loop code
    }
}

#[interrupt]
fn SOME_INTERRUPT() {
    // Access shared data in the interrupt handler
    free(|cs| {
        let mut data = SHARED_DATA.borrow(cs).borrow_mut();
        *data += 1;
    });
}
```

### Interrupt Priorities and Nesting

Interrupt priorities determine which interrupts can preempt others. In ARM Cortex-M, lower priority numbers indicate higher priorities:

```rust
use cortex_m::peripheral::NVIC;
use stm32f4xx_hal::stm32::Interrupt;

fn configure_interrupt_priorities() {
    unsafe {
        // Configure interrupt priorities (0 = highest, 255 = lowest)
        // High priority for time-critical interrupt
        NVIC::set_priority(Interrupt::EXTI0, 0);

        // Medium priority for less critical interrupt
        NVIC::set_priority(Interrupt::USART2, 64);

        // Low priority for background tasks
        NVIC::set_priority(Interrupt::TIM2, 128);

        // Enable interrupts
        NVIC::unmask(Interrupt::EXTI0);
        NVIC::unmask(Interrupt::USART2);
        NVIC::unmask(Interrupt::TIM2);
    }
}
```

### Handling Multiple Interrupt Sources

Sometimes multiple sources can trigger the same interrupt. You need to check which source triggered the interrupt and handle it accordingly:

```rust
#[interrupt]
fn EXTI0_1() {
    // Check which pin triggered the interrupt
    let exti = unsafe { &(*stm32f4xx_hal::stm32::EXTI::ptr()) };

    if (exti.pr.read().pr0().bit_is_set()) {
        // Pin 0 triggered the interrupt
        // Handle pin 0 interrupt

        // Clear the interrupt pending bit
        exti.pr.write(|w| w.pr0().set_bit());
    }

    if (exti.pr.read().pr1().bit_is_set()) {
        // Pin 1 triggered the interrupt
        // Handle pin 1 interrupt

        // Clear the interrupt pending bit
        exti.pr.write(|w| w.pr1().set_bit());
    }
}
```

### Debouncing in Interrupt Handlers

When handling button presses or other mechanical inputs, debouncing is important to avoid false triggers:

```rust
use core::sync::atomic::{AtomicU32, Ordering};
use stm32f4xx_hal::stm32::TIM2;

// Last time the button was pressed (in milliseconds)
static LAST_BUTTON_PRESS: AtomicU32 = AtomicU32::new(0);
const DEBOUNCE_MS: u32 = 50; // 50ms debounce time

#[interrupt]
fn EXTI0() {
    // Get current time (assuming TIM2 is a millisecond counter)
    let tim2 = unsafe { &(*TIM2::ptr()) };
    let current_time = tim2.cnt.read().cnt().bits();

    // Get last button press time
    let last_time = LAST_BUTTON_PRESS.load(Ordering::Relaxed);

    // Check if enough time has passed since last press
    if current_time.wrapping_sub(last_time) > DEBOUNCE_MS {
        // Handle button press
        // ...

        // Update last press time
        LAST_BUTTON_PRESS.store(current_time, Ordering::Relaxed);
    }

    // Clear the interrupt pending bit
    let exti = unsafe { &(*stm32f4xx_hal::stm32::EXTI::ptr()) };
    exti.pr.write(|w| w.pr0().set_bit());
}
```

### Interrupt Latency Considerations

Interrupt latency is the delay between an interrupt request and the execution of the interrupt handler. To minimize latency:

1. Keep interrupt handlers short and simple
2. Avoid complex operations or memory allocations in handlers
3. Be mindful of priority levels
4. Disable interrupts only when necessary and for short periods

```rust
#[interrupt]
fn CRITICAL_INTERRUPT() {
    // Do minimal work in the interrupt handler

    // Set a flag for the main loop to handle
    free(|cs| {
        let mut flag = INTERRUPT_FLAG.borrow(cs).borrow_mut();
        *flag = true;
    });
}

fn main() -> ! {
    loop {
        // Check for interrupt flag
        let handle_interrupt = free(|cs| {
            let mut flag = INTERRUPT_FLAG.borrow(cs).borrow_mut();
            let value = *flag;
            *flag = false;
            value
        });

        if handle_interrupt {
            // Handle the interrupt-triggered work
            // Complex processing can happen here, outside the interrupt handler
        }
    }
}
```

## Device Drivers

Device drivers provide the interface between software and hardware peripherals or external components. Rust's type system and trait-based design make it an excellent language for implementing safe and efficient device drivers.

### Driver Design Patterns

A well-designed device driver in Rust typically follows these patterns:

1. **Encapsulation**: Hide hardware details behind a clean API
2. **Error handling**: Use Result types to handle errors gracefully
3. **Configuration**: Allow customization through configuration structs
4. **State management**: Use the type system to enforce valid state transitions

Here's an example of a simple driver for a hypothetical temperature sensor:

```rust
use embedded_hal::blocking::i2c::{Write, WriteRead};

pub struct TemperatureSensor<I2C> {
    i2c: I2C,
    address: u8,
}

#[derive(Debug)]
pub enum Error<I2CError> {
    Communication(I2CError),
    InvalidReading,
}

impl<I2C, I2CError> TemperatureSensor<I2C>
where
    I2C: Write<Error = I2CError> + WriteRead<Error = I2CError>,
{
    pub fn new(i2c: I2C, address: u8) -> Self {
        Self { i2c, address }
    }

    pub fn read_temperature(&mut self) -> Result<f32, Error<I2CError>> {
        // Buffer to hold temperature data
        let mut buffer = [0u8; 2];

        // Send the "read temperature" command (0x01)
        self.i2c
            .write(self.address, &[0x01])
            .map_err(Error::Communication)?;

        // Read the temperature data (2 bytes)
        self.i2c
            .write_read(self.address, &[0x02], &mut buffer)
            .map_err(Error::Communication)?;

        // Convert the raw bytes to temperature in Celsius
        let raw_temp = u16::from_be_bytes(buffer);

        // Sanity check the reading
        if raw_temp > 0x3FFF {
            return Err(Error::InvalidReading);
        }

        // Convert to Celsius (example conversion for this hypothetical sensor)
        let temp_c = (raw_temp as f32) * 0.0625;

        Ok(temp_c)
    }
}
```

### Using External Sensors

Let's look at a more concrete example with a real sensor, the BME280 temperature, humidity, and pressure sensor:

```rust
use bme280::BME280;
use embedded_hal::blocking::delay::DelayMs;
use embedded_hal::blocking::i2c::{Read, Write};

fn bme280_example<I2C, E, D>(i2c: I2C, delay: &mut D) -> Result<(), E>
where
    I2C: Read<Error = E> + Write<Error = E>,
    D: DelayMs<u8>,
{
    // Create a new BME280 sensor with the default address (0x76)
    let mut bme280 = BME280::new_primary(i2c);

    // Initialize the sensor
    bme280.init(delay)?;

    // Perform a measurement
    let measurements = bme280.measure(delay)?;

    // Access individual measurements
    let temperature = measurements.temperature; // in degrees Celsius
    let pressure = measurements.pressure; // in Pascals
    let humidity = measurements.humidity; // in % relative humidity

    // Use the measurements
    // ...

    Ok(())
}
```

### Implementing Custom Drivers

For hardware without existing Rust drivers, you'll need to implement a custom driver. This typically involves:

1. Reading the device datasheet carefully
2. Implementing the communication protocol
3. Creating a state machine for device initialization and operation
4. Adding error handling and validation

Here's a simplified example of a custom driver for an LED matrix display:

```rust
use embedded_hal::digital::v2::OutputPin;

pub struct LEDMatrix<PINS> {
    pins: PINS,
    buffer: [[bool; 8]; 8], // 8x8 display buffer
}

impl<PINS> LEDMatrix<PINS>
where
    PINS: MatrixPins,
{
    pub fn new(pins: PINS) -> Self {
        Self {
            pins,
            buffer: [[false; 8]; 8],
        }
    }

    pub fn set_pixel(&mut self, x: usize, y: usize, state: bool) -> Result<(), Error> {
        if x < 8 && y < 8 {
            self.buffer[y][x] = state;
            Ok(())
        } else {
            Err(Error::OutOfBounds)
        }
    }

    pub fn update(&mut self) -> Result<(), Error> {
        // Scan through rows
        for row in 0..8 {
            // Set all column pins to low
            for col in 0..8 {
                self.pins.set_column(col, false)?;
            }

            // Set the active row
            for r in 0..8 {
                self.pins.set_row(r, r == row)?;
            }

            // Set column pins according to the buffer
            for col in 0..8 {
                self.pins.set_column(col, self.buffer[row][col])?;
            }

            // Delay for multiplexing (would use a proper delay in real code)
            for _ in 0..1000 {
                core::hint::spin_loop();
            }
        }

        Ok(())
    }
}

// Define the interface for matrix pins
pub trait MatrixPins {
    type Error;

    fn set_row(&mut self, row: usize, state: bool) -> Result<(), Self::Error>;
    fn set_column(&mut self, col: usize, state: bool) -> Result<(), Self::Error>;
}

#[derive(Debug)]
pub enum Error {
    Pin,
    OutOfBounds,
}

// Implementation for a specific pin configuration
pub struct MatrixPinsImpl<R, C> {
    row_pins: [R; 8],
    col_pins: [C; 8],
}

impl<R, C, E> MatrixPins for MatrixPinsImpl<R, C>
where
    R: OutputPin<Error = E>,
    C: OutputPin<Error = E>,
{
    type Error = Error;

    fn set_row(&mut self, row: usize, state: bool) -> Result<(), Self::Error> {
        if row < 8 {
            if state {
                self.row_pins[row].set_high().map_err(|_| Error::Pin)?;
            } else {
                self.row_pins[row].set_low().map_err(|_| Error::Pin)?;
            }
            Ok(())
        } else {
            Err(Error::OutOfBounds)
        }
    }

    fn set_column(&mut self, col: usize, state: bool) -> Result<(), Self::Error> {
        if col < 8 {
            if state {
                self.col_pins[col].set_high().map_err(|_| Error::Pin)?;
            } else {
                self.col_pins[col].set_low().map_err(|_| Error::Pin)?;
            }
            Ok(())
        } else {
            Err(Error::OutOfBounds)
        }
    }
}
```

### Driver Testing Strategies

Testing embedded drivers can be challenging since they interact with real hardware. Here are some strategies:

1. **Mocking hardware**: Create mock implementations of `embedded-hal` traits to simulate hardware behavior
2. **Parameterized tests**: Test driver logic with different input parameters
3. **Hardware-in-the-loop**: Run tests on actual hardware when possible

Here's an example of testing a driver with mocked hardware:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use embedded_hal_mock::i2c::{Mock as I2cMock, Transaction};

    #[test]
    fn test_temperature_reading() {
        // Set up expected I2C transactions
        let expectations = [
            Transaction::write(0x76, vec![0x01]),
            Transaction::write_read(0x76, vec![0x02], vec![0x12, 0x34]),
        ];

        // Create a mock I2C device
        let i2c = I2cMock::new(&expectations);

        // Create the temperature sensor with the mock I2C
        let mut sensor = TemperatureSensor::new(i2c, 0x76);

        // Read the temperature
        let temp = sensor.read_temperature().unwrap();

        // 0x1234 converted according to our formula should be 291.25°C
        assert_eq!(temp, 291.25);
    }
}
```

## IoT Connectivity

The Internet of Things (IoT) extends embedded systems by connecting them to the internet or other networks. Rust's focus on security and reliability makes it an excellent choice for IoT applications.

### Network Protocols for IoT

Several protocols are commonly used in IoT applications:

1. **MQTT**: Lightweight publish-subscribe protocol for constrained devices
2. **CoAP**: HTTP-like protocol optimized for constrained devices
3. **HTTP/HTTPS**: Standard web protocols for REST APIs
4. **WebSockets**: Full-duplex communication over TCP
5. **LoRaWAN**: Long Range Wide Area Network protocol for low-power, long-range communication

Let's implement an MQTT client using the `rumqttc` crate:

```rust
use rumqttc::{Client, MqttOptions, QoS};
use std::time::Duration;
use std::thread;

fn mqtt_example() -> Result<(), Box<dyn std::error::Error>> {
    // Set up MQTT options
    let mut mqtt_options = MqttOptions::new("rust-client", "mqtt.example.com", 1883);
    mqtt_options.set_keep_alive(Duration::from_secs(30));

    // Create client
    let (mut client, mut connection) = Client::new(mqtt_options, 10);

    // Spawn a thread to handle incoming messages
    thread::spawn(move || {
        for notification in connection.iter() {
            println!("Notification: {:?}", notification);
        }
    });

    // Subscribe to a topic
    client.subscribe("sensors/temperature", QoS::AtLeastOnce)?;

    // Publish a message
    let payload = serde_json::json!({
        "device_id": "sensor-001",
        "temperature": 23.5,
        "humidity": 45.2,
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }).to_string();

    client.publish("sensors/temperature", QoS::AtLeastOnce, false, payload.into_bytes())?;

    // Main loop
    loop {
        // Read sensor data and publish periodically
        thread::sleep(Duration::from_secs(60));

        // Publish new data
        // ...
    }
}
```

### Secure Communication

Security is critical for IoT devices. Here's how to implement secure MQTT communication using TLS:

```rust
use rumqttc::{Client, MqttOptions, QoS, Transport};
use rustls::ClientConfig;
use std::time::Duration;
use std::io::Cursor;

fn secure_mqtt_example() -> Result<(), Box<dyn std::error::Error>> {
    // Set up TLS
    let mut client_config = ClientConfig::new();

    // Load root CA certificate
    let cert_bytes = include_bytes!("../certs/ca.crt");
    let mut cursor = Cursor::new(cert_bytes);
    let certs = rustls_pemfile::certs(&mut cursor)?;
    let trusted_certs = certs.into_iter().map(rustls::Certificate).collect();
    client_config.root_store.add_server_trust_anchors(&webpki::TrustAnchors(&trusted_certs));

    // Set up MQTT options with TLS
    let mut mqtt_options = MqttOptions::new("rust-client", "mqtt.example.com", 8883);
    mqtt_options.set_keep_alive(Duration::from_secs(30));
    mqtt_options.set_transport(Transport::tls_with_config(client_config.into()));

    // Create client and proceed as before
    // ...

    Ok(())
}
```

### Edge Computing

Edge computing involves processing data close to where it's generated, reducing latency and bandwidth usage. Rust's performance makes it suitable for edge computing tasks.

Here's an example of a simple edge processing application that filters and aggregates sensor data before sending it to the cloud:

```rust
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SensorReading {
    timestamp: chrono::DateTime<chrono::Utc>,
    temperature: f32,
    humidity: f32,
}

struct EdgeProcessor {
    readings: VecDeque<SensorReading>,
    window_size: usize,
    last_upload: Instant,
    upload_interval: Duration,
}

impl EdgeProcessor {
    fn new(window_size: usize, upload_interval: Duration) -> Self {
        Self {
            readings: VecDeque::with_capacity(window_size),
            window_size,
            last_upload: Instant::now(),
            upload_interval,
        }
    }

    fn add_reading(&mut self, reading: SensorReading) {
        // Apply simple filtering (reject obviously invalid readings)
        if reading.temperature < -40.0 || reading.temperature > 85.0 {
            return;
        }

        // Add the reading to our window
        self.readings.push_back(reading);

        // Keep the window at the specified size
        if self.readings.len() > self.window_size {
            self.readings.pop_front();
        }

        // Check if it's time to process and upload
        if self.last_upload.elapsed() >= self.upload_interval {
            self.process_and_upload();
            self.last_upload = Instant::now();
        }
    }

    fn process_and_upload(&self) {
        if self.readings.is_empty() {
            return;
        }

        // Calculate aggregate values
        let count = self.readings.len();
        let avg_temp: f32 = self.readings.iter().map(|r| r.temperature).sum::<f32>() / count as f32;
        let avg_humidity: f32 = self.readings.iter().map(|r| r.humidity).sum::<f32>() / count as f32;
        let min_temp = self.readings.iter().map(|r| r.temperature).fold(f32::INFINITY, f32::min);
        let max_temp = self.readings.iter().map(|r| r.temperature).fold(f32::NEG_INFINITY, f32::max);

        // Create aggregated data object
        let aggregated_data = serde_json::json!({
            "start_time": self.readings.front().unwrap().timestamp,
            "end_time": self.readings.back().unwrap().timestamp,
            "count": count,
            "avg_temperature": avg_temp,
            "min_temperature": min_temp,
            "max_temperature": max_temp,
            "avg_humidity": avg_humidity,
        });

        // Upload to cloud (in a real application, this would use MQTT or HTTP)
        println!("Uploading: {}", aggregated_data);
    }
}
```

## Power Management

Power efficiency is critical for many embedded and IoT devices, especially battery-powered ones. Rust can help implement effective power management strategies.

### Sleep Modes

Most microcontrollers offer various sleep modes to reduce power consumption when not active:

```rust
use cortex_m::peripheral::SCB;
use stm32f4xx_hal::stm32;

enum SleepMode {
    Sleep,          // CPU clock stopped, peripherals still running
    DeepSleep,      // Most clocks and peripherals stopped
    Standby,        // Lowest power mode, only RTC and backup registers retained
}

fn enter_sleep_mode(mode: SleepMode) {
    // Configure the sleep mode
    let scb = unsafe { &(*SCB::ptr()) };
    let pwr = unsafe { &(*stm32::PWR::ptr()) };

    match mode {
        SleepMode::Sleep => {
            // Configure for Sleep mode (normal sleep)
            scb.clear_sleepdeep();
        }
        SleepMode::DeepSleep => {
            // Configure for Deep Sleep mode
            scb.set_sleepdeep();
            // Clear standby flag
            pwr.cr.modify(|_, w| w.pdds().clear_bit());
        }
        SleepMode::Standby => {
            // Configure for Standby mode (deepest sleep)
            scb.set_sleepdeep();
            // Set standby flag
            pwr.cr.modify(|_, w| w.pdds().set_bit());
        }
    }

    // Enter sleep mode
    cortex_m::asm::wfi(); // Wait For Interrupt

    // Code continues here after waking up
}
```

### Duty Cycling

Duty cycling involves periodically waking up a device from sleep to perform tasks, then returning to sleep:

```rust
use cortex_m::peripheral::{SCB, SYST};
use stm32f4xx_hal::stm32;

fn setup_duty_cycling(wake_period_ms: u32) {
    let syst = unsafe { &(*SYST::ptr()) };

    // Configure SysTick for wake-up
    syst.set_reload((wake_period_ms * 48_000) - 1); // Assuming 48 MHz clock
    syst.clear_current();
    syst.enable_interrupt();
    syst.enable_counter();

    // Main duty cycle loop
    loop {
        // Perform required tasks
        read_sensors();
        process_data();

        // Enter sleep mode until next wake-up
        enter_sleep_mode(SleepMode::DeepSleep);
    }
}

fn read_sensors() {
    // Read sensor data
}

fn process_data() {
    // Process the data
}
```

### Battery Monitoring

For battery-powered devices, monitoring battery level is important:

```rust
use stm32f4xx_hal::{adc, prelude::*};

struct BatteryMonitor<ADC, PIN> {
    adc: ADC,
    pin: PIN,
    // Battery parameters
    max_voltage: f32,
    min_voltage: f32,
}

impl<ADC, PIN> BatteryMonitor<ADC, PIN>
where
    ADC: embedded_hal::adc::OneShot<ADC, u16, PIN>,
{
    pub fn new(adc: ADC, pin: PIN, min_voltage: f32, max_voltage: f32) -> Self {
        Self {
            adc,
            pin,
            min_voltage,
            max_voltage,
        }
    }

    pub fn read_percentage(&mut self) -> Result<u8, ADC::Error> {
        // Read raw ADC value
        let raw_value = self.adc.read(&mut self.pin)?;

        // Convert to voltage (assuming 12-bit ADC with 3.3V reference)
        let voltage = (raw_value as f32 / 4095.0) * 3.3;

        // Convert to percentage
        let percentage = (voltage - self.min_voltage) / (self.max_voltage - self.min_voltage) * 100.0;

        // Clamp to 0-100 range
        let clamped = percentage.max(0.0).min(100.0);

        Ok(clamped as u8)
    }

    pub fn is_low_battery(&mut self, threshold_percent: u8) -> Result<bool, ADC::Error> {
        let percentage = self.read_percentage()?;
        Ok(percentage < threshold_percent)
    }
}
```

### Power-Efficient Programming Techniques

Beyond hardware features, software design significantly impacts power consumption:

1. **Minimize processing**: Only process data when necessary
2. **Batch operations**: Group I/O operations to reduce wake-up time
3. **Use peripherals efficiently**: Turn off unused peripherals
4. **Optimize algorithms**: Faster code execution means the CPU can sleep sooner

Here's an example of power-efficient code for a wireless sensor:

```rust
fn power_efficient_sensor_loop() -> ! {
    // Initial setup
    let mut sensor = setup_sensor();
    let mut radio = setup_radio();
    let mut measurements = [0u16; 10]; // Buffer for batching
    let mut index = 0;

    loop {
        // Wake up and take a measurement
        let measurement = sensor.read_temperature().unwrap();
        measurements[index] = measurement;
        index += 1;

        // Only transmit when buffer is full (batching)
        if index >= measurements.len() {
            // Turn on radio only when needed
            radio.power_on().unwrap();

            // Send all measurements at once
            radio.send_packet(&measurements).unwrap();

            // Turn off radio to save power
            radio.power_off().unwrap();

            // Reset index
            index = 0;
        }

        // Calculate time until next measurement
        let next_measurement_time = calculate_next_measurement_time();

        // Sleep until next measurement time
        sleep_until(next_measurement_time);
    }
}
```

## Project: Building an IoT Sensor Node

Let's bring together the concepts we've covered by building a complete IoT sensor node project. Our sensor node will:

1. Read temperature, humidity, and light sensor data
2. Process the data locally
3. Connect to an MQTT broker over Wi-Fi
4. Send the data to a cloud service
5. Implement power management for battery operation

### Project Setup

First, let's set up our project structure:

```bash
cargo new --bin iot-sensor-node
cd iot-sensor-node
```

Now, let's add our dependencies to `Cargo.toml`:

```toml
[package]
name = "iot-sensor-node"
version = "0.1.0"
edition = "2021"

[dependencies]
# Embedded HAL and board support
cortex-m = "0.7"
cortex-m-rt = "0.7"
embedded-hal = "0.2"
esp32-hal = "0.15"       # For ESP32 microcontroller

# Sensors
bme280 = "0.4"          # Temperature/humidity/pressure sensor
tsl2561 = "0.3"         # Light sensor

# Wi-Fi and MQTT
esp-wifi = "0.1"
embedded-svc = "0.25"
esp-idf-svc = { version = "0.47", features = ["mqtt"] }

# Utility
heapless = "0.7"
log = "0.4"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[profile.release]
opt-level = "s"
lto = true
codegen-units = 1
```

### Hardware Setup

For this project, we'll use an ESP32 development board with the following components:

1. BME280 temperature/humidity/pressure sensor (connected via I2C)
2. TSL2561 light sensor (connected via I2C)
3. LiPo battery for power

Here's the wiring:

```
ESP32          BME280
--------------------
3.3V    ----->  VCC
GND     ----->  GND
GPIO21  ----->  SDA
GPIO22  ----->  SCL

ESP32          TSL2561
--------------------
3.3V    ----->  VCC
GND     ----->  GND
GPIO21  ----->  SDA (shared with BME280)
GPIO22  ----->  SCL (shared with BME280)
```

### Sensor Implementation

First, let's create the sensor module (`src/sensors.rs`):

```rust
use bme280::BME280;
use embedded_hal::blocking::delay::DelayMs;
use embedded_hal::blocking::i2c::{Read, Write};
use log::info;
use tsl2561::TSL2561;

pub struct SensorData {
    pub temperature: f32,    // Celsius
    pub humidity: f32,       // Percent
    pub pressure: f32,       // Pascals
    pub light: u32,          // Lux
    pub battery_voltage: f32, // Volts
}

pub struct SensorModule<I2C, E, D>
where
    I2C: Read<Error = E> + Write<Error = E>,
    D: DelayMs<u8>,
{
    bme280: BME280<I2C, E>,
}
```

## Project: IoT Weather Station

Let's conclude with a simplified IoT weather station project that brings together many of the concepts we've covered.

### Project Overview

We'll build a weather station that:

1. Reads temperature, humidity, and pressure from a BME280 sensor
2. Connects to WiFi and sends data to an MQTT broker
3. Implements power management for battery operation

### Hardware Components

- STM32F4 microcontroller board (or similar)
- BME280 temperature/humidity/pressure sensor
- WiFi module (ESP8266 or similar)
- Battery and power management circuitry

### Basic Code Structure

Here's a simplified example of the main application structure:

```rust
#![no_std]
#![no_main]

use cortex_m_rt::entry;
use panic_halt as _;
use stm32f4xx_hal::{
    gpio::*, i2c::*, prelude::*, stm32,
};
use bme280::BME280;
use heapless::{String, Vec};
use core::fmt::Write;

// Sensor data structure
#[derive(Debug)]
struct WeatherData {
    temperature: f32,
    humidity: f32,
    pressure: f32,
}

#[entry]
fn main() -> ! {
    // Initialize peripherals
    let dp = stm32::Peripherals::take().unwrap();
    let cp = cortex_m::peripheral::Peripherals::take().unwrap();

    // Set up clocks
    let rcc = dp.RCC.constrain();
    let clocks = rcc.cfgr.freeze();

    // Set up GPIO
    let gpioa = dp.GPIOA.split();
    let gpiob = dp.GPIOB.split();

    // Configure I2C pins
    let scl = gpiob.pb8.into_alternate_open_drain();
    let sda = gpiob.pb9.into_alternate_open_drain();

    // Set up I2C interface
    let i2c = I2c::i2c1(
        dp.I2C1,
        (scl, sda),
        400.kHz(),
        clocks,
    );

    // Set up BME280 sensor
    let mut bme280 = BME280::new_primary(i2c);
    let mut delay = dp.TIM2.delay_ms(&clocks);
    let i2c = bme280.init(&mut delay).unwrap();

    // WiFi module UART pins
    let tx_pin = gpioa.pa2.into_alternate();
    let rx_pin = gpioa.pa3.into_alternate();

    // Set up UART for WiFi module
    let serial = Serial::new(
        dp.USART2,
        (tx_pin, rx_pin),
        9600.bps(),
        clocks,
    );
    let (mut tx, mut rx) = serial.split();

    // Configure WiFi module
    setup_wifi(&mut tx, &mut rx, &mut delay).unwrap();

    // Main loop
    loop {
        // Read sensor data
        let measurements = bme280.measure(&mut delay).unwrap();

        let weather_data = WeatherData {
            temperature: measurements.temperature,
            humidity: measurements.humidity,
            pressure: measurements.pressure,
        };

        // Format data as JSON
        let mut json_buffer: String<128> = String::new();
        write!(
            json_buffer,
            "{{\"temp\":{:.2},\"hum\":{:.2},\"pres\":{:.2}}}",
            weather_data.temperature,
            weather_data.humidity,
            weather_data.pressure
        ).unwrap();

        // Send data over MQTT
        send_mqtt_data(&mut tx, &mut rx, "weather/data", &json_buffer, &mut delay).unwrap();

        // Sleep for 5 minutes
        delay.delay_ms(300_000u32);
    }
}

// WiFi setup function (simplified)
fn setup_wifi<TX, RX, D>(
    tx: &mut TX,
    rx: &mut RX,
    delay: &mut D,
) -> Result<(), ()>
where
    TX: embedded_hal::serial::Write<u8>,
    RX: embedded_hal::serial::Read<u8>,
    D: embedded_hal::blocking::delay::DelayMs<u32>,
{
    // Send AT commands to configure WiFi module
    // ...
    Ok(())
}

// MQTT data sending function (simplified)
fn send_mqtt_data<TX, RX, D>(
    tx: &mut TX,
    rx: &mut RX,
    topic: &str,
    data: &str,
    delay: &mut D,
) -> Result<(), ()>
where
    TX: embedded_hal::serial::Write<u8>,
    RX: embedded_hal::serial::Read<u8>,
    D: embedded_hal::blocking::delay::DelayMs<u32>,
{
    // Send AT commands to publish MQTT data
    // ...
    Ok(())
}
```

In a complete implementation, we would:

1. Add proper error handling for all operations
2. Implement WiFi reconnection logic
3. Add battery monitoring and power management
4. Optimize for low power using sleep modes
5. Implement secure communication using TLS

This project demonstrates how Rust's safety features and abstractions help build reliable IoT applications, even on constrained hardware.

## Summary

In this chapter, we've explored embedded systems and IoT development with Rust. We've covered:

1. **Embedded programming fundamentals**: The differences between embedded and general-purpose programming
2. **Bare metal Rust**: Using Rust without an operating system
3. **Hardware abstraction**: Writing portable code for different microcontrollers
4. **Real-time programming**: Techniques for deterministic timing
5. **Memory management**: Efficient use of limited resources
6. **Interrupt handling**: Safe patterns for hardware interrupts
7. **Device drivers**: Designing and implementing peripheral drivers
8. **IoT connectivity**: Networking protocols for connected devices
9. **Power management**: Extending battery life in portable devices

Rust's combination of performance, safety, and expressiveness makes it an excellent choice for embedded systems and IoT applications. The ecosystem continues to grow, with more libraries, tools, and board support being added regularly.

## Exercises

1. Extend the weather station project to support multiple sensors.
2. Implement a more sophisticated power management strategy using sleep modes.
3. Add secure communication using TLS.
4. Create a custom device driver for a sensor not covered in this chapter.
5. Implement a mesh network protocol to allow multiple weather stations to share data.
6. Build a web dashboard to visualize the weather data received from MQTT.
7. Optimize the code for minimal power consumption and measure the improvement.
8. Add over-the-air firmware updates to the weather station.
