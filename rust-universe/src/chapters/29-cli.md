# Chapter 29: Command-Line Applications

## Introduction

Command-line applications have been a fundamental part of computing since the earliest days of software development. Despite the rise of graphical user interfaces, command-line tools remain essential for developers, system administrators, and power users due to their efficiency, scriptability, and composability. Rust's performance, reliability, and robust ecosystem make it an excellent choice for developing powerful command-line interfaces (CLIs).

In this chapter, we'll explore how to build sophisticated, user-friendly command-line applications in Rust. From parsing arguments and handling configuration to creating interactive interfaces with rich formatting, we'll cover the complete lifecycle of CLI application development. We'll also discuss how to package and distribute your applications effectively to reach your users.

Rust's ecosystem offers several high-quality libraries that make CLI development straightforward and enjoyable. We'll focus on popular crates like `clap` for argument parsing, `crossterm` for terminal interaction, and others that help you create polished, professional command-line tools. By the end of this chapter, you'll have the knowledge and skills to create CLI applications that are not only functional but also provide an excellent user experience.

Whether you're building developer tools, system utilities, or interactive applications, the principles and techniques in this chapter will help you leverage Rust's strengths to create command-line applications that are fast, reliable, and easy to use.

## CLI Application Design

Before diving into code, it's important to consider the design of your command-line application. Good CLI design focuses on user experience, just like any other software interface. Here are some key principles to guide your design process:

### Core Principles of CLI Design

1. **Follow the Unix Philosophy**:

   - Do one thing and do it well
   - Process text streams as a universal interface
   - Make composition with other tools easy
   - Value simplicity and clarity

2. **Be Predictable**:

   - Follow established conventions for flags and arguments
   - Use familiar patterns like `--help` for help text
   - Maintain backward compatibility when updating

3. **Provide Helpful Feedback**:

   - Clear error messages that explain what went wrong
   - Suggestions for how to fix problems
   - Progress indicators for long-running operations

4. **Respect the Environment**:
   - Honor configuration files and environment variables
   - Play well with pipes and redirections
   - Return appropriate exit codes

### Common CLI Patterns

Several patterns have emerged for organizing command-line applications:

#### Single-Purpose Tools

Applications that do one thing, following the Unix philosophy:

```bash
$ grep "pattern" file.txt
$ cat file.txt
$ ls -la
```

These tools tend to have simple interfaces with flags and arguments.

#### Command Suites

Applications that group related functionality under a single entry point:

```bash
$ git commit -m "Message"
$ git push origin main
$ cargo build --release
$ cargo test
```

These tools organize functionality into subcommands, each with its own set of options.

#### Interactive Applications

Applications that provide an interactive interface rather than processing arguments in a single run:

```bash
$ top
$ vim file.txt
$ htop
```

These tools often use the full terminal space and respond to keypresses.

### Designing Your CLI's Interface

When planning your command-line interface, consider these aspects:

1. **Command Structure**:

   - Will your application use subcommands or a simpler flag-based interface?
   - How will you organize related functionality?

2. **Argument and Flag Conventions**:

   - Short flags (`-v`) for common options
   - Long flags (`--verbose`) for clarity
   - Positional arguments for required inputs
   - Options that take values (`--output file.txt`)

3. **Help and Documentation**:

   - Comprehensive `--help` output
   - Man pages for more detailed documentation
   - Examples showing common use cases

4. **Error Handling**:

   - Clear error messages
   - Appropriate exit codes
   - Debug options for troubleshooting

5. **Output Formatting**:
   - How will users consume the output?
   - Will it be read by humans, parsed by scripts, or both?
   - Consider supporting multiple output formats (text, JSON, etc.)

### Example: Planning a File Search Tool

Let's illustrate these principles by planning a simple file search tool. We want our tool to:

1. Search for files matching a pattern
2. Allow filtering by file type and size
3. Support different output formats
4. Provide progress indicators for large searches

Our command structure might look like:

```
findit [OPTIONS] PATTERN [PATH]

OPTIONS:
  -t, --type TYPE      Filter by file type (file, dir, symlink)
  -s, --size RANGE     Filter by file size (e.g., +1M, -500K)
  -o, --output FORMAT  Output format (text, json, csv)
  -r, --recursive      Search directories recursively
  --progress           Show progress bar during search
  -h, --help           Print help information
  -V, --version        Print version information

ARGS:
  PATTERN              Pattern to search for
  PATH                 Directory to search [default: current directory]
```

This design follows established conventions, making it intuitive for users familiar with command-line tools. We've included both short and long options, reasonable defaults, and clear help text.

In the next section, we'll see how to implement this kind of interface using Rust's argument parsing libraries.

## Argument Parsing with clap

One of the most important aspects of a command-line application is handling user input. Rust's ecosystem offers several libraries for parsing command-line arguments, but [`clap`](https://crates.io/crates/clap) (Command Line Argument Parser) stands out for its flexibility, powerful features, and developer-friendly API.

### Getting Started with clap

Let's start by adding clap to your project's dependencies:

```toml
[dependencies]
clap = { version = "4.4", features = ["derive"] }
```

The `derive` feature enables a declarative API using Rust's attribute macros, which we'll use in our examples.

### Basic Argument Parsing

Let's implement a basic version of our file search tool using clap's derive API:

```rust
use clap::Parser;
use std::path::PathBuf;

/// A simple file finding tool
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Pattern to search for
    pattern: String,

    /// Directory to search
    #[arg(default_value = ".")]
    path: PathBuf,

    /// Filter by file type
    #[arg(short, long, value_name = "TYPE")]
    r#type: Option<String>,

    /// Search recursively
    #[arg(short, long)]
    recursive: bool,

    /// Output format
    #[arg(short, long, value_name = "FORMAT", default_value = "text")]
    output: String,

    /// Show progress bar
    #[arg(long)]
    progress: bool,
}

fn main() {
    let args = Args::parse();

    println!("Searching for: {}", args.pattern);
    println!("In directory: {}", args.path.display());

    if let Some(file_type) = args.r#type {
        println!("Filtering by type: {}", file_type);
    }

    println!("Recursive search: {}", args.recursive);
    println!("Output format: {}", args.output);
    println!("Show progress: {}", args.progress);

    // Actual search implementation would go here
}
```

This code:

1. Defines a struct `Args` that represents our command-line interface
2. Uses doc comments to generate help text
3. Configures default values, short and long flags, and more
4. Automatically handles `--help` and `--version` flags

When you run this program with `--help`, it will generate comprehensive help text:

```
A simple file finding tool

Usage: myapp [OPTIONS] <PATTERN> [PATH]

Arguments:
  <PATTERN>  Pattern to search for
  [PATH]     Directory to search [default: .]

Options:
  -t, --type <TYPE>      Filter by file type
  -r, --recursive        Search recursively
  -o, --output <FORMAT>  Output format [default: text]
      --progress         Show progress bar
  -h, --help             Print help
  -V, --version          Print version
```

### Command Validation

Clap handles basic argument parsing, but often you need to validate user input. Let's add some validation logic:

```rust
use clap::{Parser, ValueEnum};
use std::path::PathBuf;

#[derive(Copy, Clone, Debug, PartialEq, Eq, ValueEnum)]
enum FileType {
    File,
    Directory,
    Symlink,
}

#[derive(Copy, Clone, Debug, PartialEq, Eq, ValueEnum)]
enum OutputFormat {
    Text,
    Json,
    Csv,
}

/// A simple file finding tool
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Pattern to search for
    pattern: String,

    /// Directory to search
    #[arg(default_value = ".")]
    path: PathBuf,

    /// Filter by file type
    #[arg(short, long, value_enum)]
    r#type: Option<FileType>,

    /// Search recursively
    #[arg(short, long)]
    recursive: bool,

    /// Output format
    #[arg(short, long, value_enum, default_value_t = OutputFormat::Text)]
    output: OutputFormat,

    /// Show progress bar
    #[arg(long)]
    progress: bool,
}

fn main() {
    let args = Args::parse();

    // Validate that the path exists
    if !args.path.exists() {
        eprintln!("Error: Path '{}' does not exist", args.path.display());
        std::process::exit(1);
    }

    // Proceed with search
    println!("Searching for: {}", args.pattern);
    println!("In directory: {}", args.path.display());

    if let Some(file_type) = args.r#type {
        println!("Filtering by type: {:?}", file_type);
    }

    println!("Recursive search: {}", args.recursive);
    println!("Output format: {:?}", args.output);
    println!("Show progress: {}", args.progress);

    // Actual search implementation would go here
}
```

By using the `ValueEnum` derive macro, we:

1. Restrict input to a predefined set of values
2. Get automatic error messages for invalid inputs
3. Convert string arguments to typed enum values

### Implementing Subcommands

For more complex applications, you might want to implement a command suite with subcommands. Let's modify our example to use subcommands:

```rust
use clap::{Parser, Subcommand, Args as ClapArgs, ValueEnum};
use std::path::PathBuf;

#[derive(Copy, Clone, Debug, PartialEq, Eq, ValueEnum)]
enum FileType {
    File,
    Directory,
    Symlink,
}

#[derive(Copy, Clone, Debug, PartialEq, Eq, ValueEnum)]
enum OutputFormat {
    Text,
    Json,
    Csv,
}

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Find files matching a pattern
    Find(FindArgs),

    /// Count files by type
    Count(CountArgs),
}

#[derive(ClapArgs, Debug)]
struct FindArgs {
    /// Pattern to search for
    pattern: String,

    /// Directory to search
    #[arg(default_value = ".")]
    path: PathBuf,

    /// Filter by file type
    #[arg(short, long, value_enum)]
    r#type: Option<FileType>,

    /// Search recursively
    #[arg(short, long)]
    recursive: bool,

    /// Output format
    #[arg(short, long, value_enum, default_value_t = OutputFormat::Text)]
    output: OutputFormat,

    /// Show progress bar
    #[arg(long)]
    progress: bool,
}

#[derive(ClapArgs, Debug)]
struct CountArgs {
    /// Directory to analyze
    #[arg(default_value = ".")]
    path: PathBuf,

    /// Search recursively
    #[arg(short, long)]
    recursive: bool,
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Find(args) => {
            println!("Running find command");
            if !args.path.exists() {
                eprintln!("Error: Path '{}' does not exist", args.path.display());
                std::process::exit(1);
            }

            // Implement find functionality
            println!("Searching for: {}", args.pattern);
        }
        Commands::Count(args) => {
            println!("Running count command");
            if !args.path.exists() {
                eprintln!("Error: Path '{}' does not exist", args.path.display());
                std::process::exit(1);
            }

            // Implement count functionality
            println!("Analyzing directory: {}", args.path.display());
        }
    }
}
```

This code:

1. Defines a top-level `Cli` struct that contains subcommands
2. Defines an enum `Commands` for the different subcommands
3. Defines separate argument structs for each subcommand
4. Matches on the subcommand to execute the appropriate code

The help output will now include information about subcommands:

```
A simple file finding tool

Usage: myapp <COMMAND>

Commands:
  find   Find files matching a pattern
  count  Count files by type
  help   Print this message or the help of the given subcommand(s)

Options:
  -h, --help     Print help
  -V, --version  Print version
```

### Advanced clap Features

Clap offers many advanced features for complex CLI applications:

#### Groups and Mutually Exclusive Options

You can group options and make them mutually exclusive:

```rust
#[derive(Parser, Debug)]
struct Args {
    // These options can't be used together
    #[arg(short, long, group = "mode")]
    interactive: bool,

    #[arg(short, long, group = "mode")]
    batch: bool,

    // Other arguments...
}
```

#### Custom Validation

You can implement custom validation logic:

```rust
#[derive(Parser, Debug)]
struct Args {
    #[arg(short, long, value_parser = validate_size_range)]
    size: Option<String>,

    // Other arguments...
}

fn validate_size_range(s: &str) -> Result<String, String> {
    if s.starts_with('+') || s.starts_with('-') {
        if s[1..].ends_with('K') || s[1..].ends_with('M') || s[1..].ends_with('G') {
            return Ok(s.to_string());
        }
    }
    Err(format!("Invalid size range: {}. Expected format: +1M, -500K, etc.", s))
}
```

#### Shell Completions

Clap can generate shell completion scripts for various shells:

```rust
use clap::{Command, CommandFactory, Parser};
use clap_complete::{generate, shells::Bash};
use std::io;

#[derive(Parser, Debug)]
struct Args {
    // ... your arguments ...

    /// Generate shell completions
    #[arg(long = "generate-completions", value_name = "SHELL")]
    generate_completions: Option<String>,
}

fn main() {
    let args = Args::parse();

    if let Some(shell) = args.generate_completions {
        if shell == "bash" {
            let mut cmd = Args::command();
            generate(Bash, &mut cmd, "myapp", &mut io::stdout());
            return;
        }
        // Handle other shells...
    }

    // Normal application logic...
}
```

### Best Practices for Argument Parsing

When using clap (or any argument parsing library), follow these best practices:

1. **Be descriptive**: Use clear names for arguments and options
2. **Provide helpful documentation**: Use doc comments to explain what each option does
3. **Use sensible defaults**: Make common operations easy by choosing good defaults
4. **Validate early**: Check user input as soon as possible
5. **Follow conventions**: Use standard flag names (`-v` for verbose, `-h` for help)
6. **Consider ergonomics**: Balance power and simplicity in your interface

### Putting It All Together

Let's create a more complete implementation of our file search tool that incorporates these best practices:

```rust
use clap::{Parser, ValueEnum};
use std::path::PathBuf;
use std::process;

#[derive(Copy, Clone, Debug, PartialEq, Eq, ValueEnum)]
enum FileType {
    File,
    Directory,
    Symlink,
    Any,
}

#[derive(Copy, Clone, Debug, PartialEq, Eq, ValueEnum)]
enum OutputFormat {
    Text,
    Json,
    Csv,
}

/// A tool for finding files in a directory
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Pattern to search for (supports glob patterns)
    pattern: String,

    /// Directory to search
    #[arg(default_value = ".")]
    path: PathBuf,

    /// Filter by file type
    #[arg(short, long, value_enum, default_value_t = FileType::Any)]
    r#type: FileType,

    /// Filter by file size (format: +1M, -500K, etc.)
    #[arg(short, long, value_parser = validate_size_range)]
    size: Option<String>,

    /// Search recursively
    #[arg(short, long)]
    recursive: bool,

    /// Maximum depth for recursive search
    #[arg(long, default_value = "100")]
    max_depth: usize,

    /// Output format
    #[arg(short, long, value_enum, default_value_t = OutputFormat::Text)]
    output: OutputFormat,

    /// Show progress bar
    #[arg(long)]
    progress: bool,

    /// Verbose output
    #[arg(short, long)]
    verbose: bool,
}

fn validate_size_range(s: &str) -> Result<String, String> {
    if s.is_empty() {
        return Err("Size range cannot be empty".to_string());
    }

    if !s.starts_with('+') && !s.starts_with('-') {
        return Err("Size range must start with + or -".to_string());
    }

    let size_str = &s[1..];
    let (number, unit) = size_str.split_at(
        size_str.find(|c: char| !c.is_ascii_digit())
            .unwrap_or(size_str.len())
    );

    if number.is_empty() {
        return Err("Size range must include a number".to_string());
    }

    if !number.parse::<u64>().is_ok() {
        return Err(format!("Invalid number in size range: {}", number));
    }

    match unit {
        "" | "B" | "K" | "KB" | "M" | "MB" | "G" | "GB" => Ok(s.to_string()),
        _ => Err(format!("Invalid unit in size range: {}. Expected B, K, M, or G.", unit)),
    }
}

fn main() {
    let args = Args::parse();

    // Validate path
    if !args.path.exists() {
        eprintln!("Error: Path '{}' does not exist", args.path.display());
        process::exit(1);
    }

    if args.verbose {
        println!("Search configuration:");
        println!("  Pattern: {}", args.pattern);
        println!("  Path: {}", args.path.display());
        println!("  Type: {:?}", args.r#type);
        if let Some(size) = &args.size {
            println!("  Size: {}", size);
        }
        println!("  Recursive: {}", args.recursive);
        println!("  Max depth: {}", args.max_depth);
        println!("  Output format: {:?}", args.output);
        println!("  Show progress: {}", args.progress);
    }

    // The actual file search implementation would go here
    println!("Searching for files matching '{}'...", args.pattern);

    // For demonstration purposes, let's simulate finding some files
    let results = vec![
        args.path.join("file1.txt"),
        args.path.join("subdir").join("file2.txt"),
    ];

    match args.output {
        OutputFormat::Text => {
            for file in results {
                println!("{}", file.display());
            }
        }
        OutputFormat::Json => {
            println!("[");
            for (i, file) in results.iter().enumerate() {
                if i > 0 {
                    print!(",");
                }
                println!("  \"{}\"", file.display());
            }
            println!("]");
        }
        OutputFormat::Csv => {
            println!("path");
            for file in results {
                println!("\"{}\"", file.display());
            }
        }
    }

    println!("Found {} matching files", results.len());
}
```

This implementation:

1. Uses strongly typed enums for file types and output formats
2. Provides custom validation for the size range
3. Includes verbose mode for debugging
4. Handles different output formats
5. Provides helpful error messages

With clap, you can build sophisticated command-line interfaces that are both powerful and user-friendly. In the next section, we'll explore how to make your CLI applications interactive using terminal libraries.

## Terminal Interaction with crossterm

While argument parsing is crucial for non-interactive command-line applications, many CLI tools benefit from interactive features. These can range from simple progress indicators to full-screen terminal user interfaces (TUIs). In this section, we'll explore how to create interactive CLI applications using the `crossterm` crate.

### Introduction to Terminal Libraries

Rust offers several libraries for terminal interaction:

- **`crossterm`**: A cross-platform terminal manipulation library
- **`termion`**: A pure Rust terminal manipulation library (Unix-only)
- **`termios`**: Low-level terminal control (Unix-only)
- **`console`**: High-level terminal utilities
- **`dialoguer`**: User dialog prompts

We'll focus on `crossterm` because it works across platforms (Windows, macOS, and Linux) and provides a good balance of functionality and ease of use.

### Getting Started with crossterm

First, add crossterm to your dependencies:

```toml
[dependencies]
crossterm = "0.27"
```

Let's create a simple example that demonstrates some basic terminal operations:

```rust
use crossterm::{
    cursor,
    style::{self, Color, Stylize},
    terminal::{self, Clear, ClearType},
    ExecutableCommand,
    Result,
};
use std::io::{stdout, Write};

fn main() -> Result<()> {
    // Get terminal size
    let (cols, rows) = terminal::size()?;
    println!("Terminal size: {}x{}", cols, rows);

    // Clear the screen
    stdout().execute(Clear(ClearType::All))?;

    // Move cursor and print colored text
    stdout()
        .execute(cursor::MoveTo(10, 5))?
        .execute(style::SetForegroundColor(Color::Green))?;

    println!("Hello from crossterm!");

    // Reset styles
    stdout().execute(style::ResetColor)?;

    // Move cursor to bottom
    stdout().execute(cursor::MoveTo(0, rows - 1))?;

    Ok(())
}
```

This example:

1. Gets the terminal size
2. Clears the screen
3. Moves the cursor to a specific position
4. Changes the text color
5. Prints a message
6. Resets the color
7. Moves the cursor to the bottom of the screen

### Key Crossterm Features

Let's explore the main features of crossterm that you'll use in CLI applications:

#### Cursor Manipulation

You can control the cursor's position and visibility:

```rust
use crossterm::{cursor, ExecutableCommand};
use std::io::stdout;

fn cursor_example() -> crossterm::Result<()> {
    // Hide the cursor
    stdout().execute(cursor::Hide)?;

    // Move the cursor
    stdout().execute(cursor::MoveTo(10, 5))?;
    println!("Text at position (10, 5)");

    // Move cursor relatively
    stdout().execute(cursor::MoveUp(1))?;
    stdout().execute(cursor::MoveRight(5))?;
    println!("Text moved up 1 and right 5");

    // Save and restore cursor position
    stdout().execute(cursor::SavePosition)?;
    stdout().execute(cursor::MoveTo(0, 0))?;
    println!("At top-left corner");
    stdout().execute(cursor::RestorePosition)?;
    println!("Back to saved position");

    // Show the cursor again
    stdout().execute(cursor::Show)?;

    Ok(())
}
```

#### Text Styling

You can style text with colors and attributes:

```rust
use crossterm::{
    style::{self, Attribute, Color, Stylize},
    ExecutableCommand,
};
use std::io::stdout;

fn styling_example() -> crossterm::Result<()> {
    // Set foreground and background colors
    stdout()
        .execute(style::SetForegroundColor(Color::Red))?
        .execute(style::SetBackgroundColor(Color::Blue))?;

    println!("Red text on blue background");

    // Reset colors
    stdout().execute(style::ResetColor)?;

    // Using the Stylize trait
    println!("{}", "Bold green text".green().bold());
    println!("{}", "Underlined blue text".blue().underlined());
    println!("{}", "Yellow on magenta".yellow().on_magenta());

    // Attributes
    stdout().execute(style::SetAttribute(Attribute::Bold))?;
    println!("Bold text");
    stdout().execute(style::SetAttribute(Attribute::Reset))?;

    Ok(())
}
```

#### Terminal Control

You can control terminal properties and behavior:

```rust
use crossterm::{
    terminal::{self, Clear, ClearType, EnterAlternateScreen, LeaveAlternateScreen},
    ExecutableCommand,
};
use std::io::stdout;
use std::thread::sleep;
use std::time::Duration;

fn terminal_example() -> crossterm::Result<()> {
    // Get terminal size
    let (cols, rows) = terminal::size()?;
    println!("Terminal size: {}x{}", cols, rows);

    // Clear the screen
    stdout().execute(Clear(ClearType::All))?;

    // Enter raw mode (disables line buffering)
    terminal::enable_raw_mode()?;

    // Enter alternate screen (doesn't disturb the main terminal content)
    stdout().execute(EnterAlternateScreen)?;

    // Do something in the alternate screen
    for i in 0..5 {
        stdout().execute(Clear(ClearType::All))?;
        println!("In alternate screen: {}", i);
        sleep(Duration::from_millis(500));
    }

    // Leave alternate screen
    stdout().execute(LeaveAlternateScreen)?;

    // Disable raw mode
    terminal::disable_raw_mode()?;

    println!("Back to normal terminal");

    Ok(())
}
```

#### Event Handling

You can read keyboard, mouse, and terminal resize events:

```rust
use crossterm::{
    event::{self, Event, KeyCode, KeyEventKind},
    terminal::{disable_raw_mode, enable_raw_mode},
    Result,
};

fn event_example() -> Result<()> {
    println!("Press keys (press 'q' to quit)");

    // Enable raw mode to read single keypresses
    enable_raw_mode()?;

    loop {
        // Wait for an event
        if event::poll(std::time::Duration::from_millis(100))? {
            // Read the event
            if let Event::Key(key_event) = event::read()? {
                if key_event.kind == KeyEventKind::Press {
                    match key_event.code {
                        KeyCode::Char('q') => break,
                        KeyCode::Char(c) => println!("You pressed: {}", c),
                        KeyCode::Up => println!("Up arrow"),
                        KeyCode::Down => println!("Down arrow"),
                        KeyCode::Left => println!("Left arrow"),
                        KeyCode::Right => println!("Right arrow"),
                        KeyCode::Enter => println!("Enter"),
                        KeyCode::Esc => println!("Escape"),
                        _ => println!("Other key: {:?}", key_event.code),
                    }
                }
            }
        }

        // Do some work while waiting for input
        // ...
    }

    // Disable raw mode
    disable_raw_mode()?;

    Ok(())
}
```

### Building Interactive Elements

Now let's build some common interactive elements for CLI applications:

#### Progress Bars

A simple progress bar can improve the user experience for long-running operations:

```rust
use crossterm::{
    cursor, style::{self, Color}, terminal, ExecutableCommand, Result,
};
use std::io::{stdout, Write};
use std::thread::sleep;
use std::time::Duration;

fn progress_bar(total: usize) -> Result<()> {
    let width = 40; // Width of the progress bar

    // Hide cursor during progress
    stdout().execute(cursor::Hide)?;

    for i in 0..=total {
        let percentage = (i as f64 / total as f64) * 100.0;
        let filled = ((i as f64 / total as f64) * width as f64) as usize;
        let empty = width - filled;

        // Move to beginning of line and clear it
        stdout()
            .execute(cursor::MoveToColumn(0))?
            .execute(terminal::Clear(terminal::ClearType::CurrentLine))?;

        // Print progress bar
        print!("[");
        stdout().execute(style::SetForegroundColor(Color::Green))?;
        for _ in 0..filled {
            print!("█");
        }
        stdout().execute(style::SetForegroundColor(Color::DarkGrey))?;
        for _ in 0..empty {
            print!("█");
        }
        stdout().execute(style::ResetColor)?;
        print!("] {:.1}% ({}/{})", percentage, i, total);

        stdout().flush()?;

        // Simulate work
        sleep(Duration::from_millis(50));
    }

    println!();

    // Show cursor again
    stdout().execute(cursor::Show)?;

    Ok(())
}

fn main() -> Result<()> {
    println!("Processing files...");
    progress_bar(100)?;
    println!("Done!");

    Ok(())
}
```

#### Spinners

For operations where the exact progress can't be determined, a spinner can indicate ongoing activity:

```rust
use crossterm::{
    cursor, terminal, ExecutableCommand, Result,
};
use std::io::{stdout, Write};
use std::thread::sleep;
use std::time::Duration;

fn spinner(duration_secs: u64) -> Result<()> {
    let spinner_chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let message = "Working...";
    let interval = Duration::from_millis(100);
    let end_time = std::time::Instant::now() + Duration::from_secs(duration_secs);

    // Hide cursor during spinner
    stdout().execute(cursor::Hide)?;

    while std::time::Instant::now() < end_time {
        for &spinner_char in &spinner_chars {
            // Move to beginning of line and clear it
            stdout()
                .execute(cursor::MoveToColumn(0))?
                .execute(terminal::Clear(terminal::ClearType::CurrentLine))?;

            // Print spinner and message
            print!("{} {}", spinner_char, message);
            stdout().flush()?;

            sleep(interval);
        }
    }

    // Clear the line after completion
    stdout()
        .execute(cursor::MoveToColumn(0))?
        .execute(terminal::Clear(terminal::ClearType::CurrentLine))?;

    println!("✓ Done!");

    // Show cursor again
    stdout().execute(cursor::Show)?;

    Ok(())
}

fn main() -> Result<()> {
    println!("Starting task...");
    spinner(5)?;
    println!("Task completed.");

    Ok(())
}
```

#### Simple Menu

A menu allows users to select from a list of options:

```rust
use crossterm::{
    cursor, event::{self, Event, KeyCode, KeyEventKind},
    style::{self, Color}, terminal, ExecutableCommand, Result,
};
use std::io::{stdout, Write};

fn show_menu(options: &[&str]) -> Result<usize> {
    let mut selected = 0;

    // Hide cursor and enter raw mode
    stdout().execute(cursor::Hide)?;
    terminal::enable_raw_mode()?;

    loop {
        // Clear screen and render menu
        stdout()
            .execute(terminal::Clear(terminal::ClearType::All))?
            .execute(cursor::MoveTo(0, 0))?;

        println!("Select an option:\n");

        for (i, option) in options.iter().enumerate() {
            if i == selected {
                stdout()
                    .execute(style::SetBackgroundColor(Color::Blue))?
                    .execute(style::SetForegroundColor(Color::White))?;
                println!(" > {} ", option);
                stdout()
                    .execute(style::ResetColor)?;
            } else {
                println!("   {} ", option);
            }
        }

        stdout().flush()?;

        // Handle keyboard input
        if let Event::Key(key_event) = event::read()? {
            if key_event.kind == KeyEventKind::Press {
                match key_event.code {
                    KeyCode::Up => {
                        if selected > 0 {
                            selected -= 1;
                        }
                    }
                    KeyCode::Down => {
                        if selected < options.len() - 1 {
                            selected += 1;
                        }
                    }
                    KeyCode::Enter => break,
                    KeyCode::Esc => {
                        selected = options.len(); // Return a value outside of range to indicate cancel
                        break;
                    }
                    _ => {}
                }
            }
        }
    }

    // Restore terminal state
    terminal::disable_raw_mode()?;
    stdout().execute(cursor::Show)?;

    Ok(selected)
}

fn main() -> Result<()> {
    let options = ["Option 1", "Option 2", "Option 3", "Exit"];

    let selected = show_menu(&options)?;

    if selected < options.len() {
        println!("You selected: {}", options[selected]);
    } else {
        println!("Selection cancelled");
    }

    Ok(())
}
```

### Advanced Terminal Applications

For more complex interactive applications, you might want to use a higher-level TUI (Text User Interface) library built on top of crossterm, like:

- **`tui`** (or its successor **`ratatui`**): For creating complex terminal layouts with widgets
- **`cursive`**: For creating interactive TUI applications

Here's a brief example using ratatui:

```rust
use crossterm::{
    event::{self, Event, KeyCode},
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
    ExecutableCommand,
};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout},
    style::{Color, Style},
    text::{Span, Spans},
    widgets::{Block, Borders, List, ListItem, Paragraph},
    Terminal,
};
use std::io::{stdout, Result};

fn main() -> Result<()> {
    // Setup terminal
    enable_raw_mode()?;
    stdout().execute(EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout());
    let mut terminal = Terminal::new(backend)?;

    // App state
    let mut current_selection = 0;
    let items = vec!["Item 1", "Item 2", "Item 3", "Item 4"];

    // Main loop
    loop {
        // Draw UI
        terminal.draw(|f| {
            // Create layout
            let chunks = Layout::default()
                .direction(Direction::Vertical)
                .margin(1)
                .constraints([
                    Constraint::Length(3),
                    Constraint::Min(0),
                    Constraint::Length(3),
                ].as_ref())
                .split(f.size());

            // Title
            let title = Paragraph::new("My TUI Application")
                .block(Block::default().borders(Borders::ALL));
            f.render_widget(title, chunks[0]);

            // List
            let list_items: Vec<ListItem> = items
                .iter()
                .enumerate()
                .map(|(i, &item)| {
                    let style = if i == current_selection {
                        Style::default().fg(Color::Yellow)
                    } else {
                        Style::default()
                    };
                    ListItem::new(Spans::from(vec![
                        Span::styled(format!("{}", item), style)
                    ]))
                })
                .collect();

            let list = List::new(list_items)
                .block(Block::default().title("Items").borders(Borders::ALL));

            f.render_widget(list, chunks[1]);

            // Footer
            let footer = Paragraph::new("Press q to quit, up/down to navigate")
                .block(Block::default().borders(Borders::ALL));
            f.render_widget(footer, chunks[2]);
        })?;

        // Handle input
        if event::poll(std::time::Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                match key.code {
                    KeyCode::Char('q') => break,
                    KeyCode::Up => {
                        if current_selection > 0 {
                            current_selection -= 1;
                        }
                    }
                    KeyCode::Down => {
                        if current_selection < items.len() - 1 {
                            current_selection += 1;
                        }
                    }
                    KeyCode::Enter => {
                        // Do something with the selected item
                    }
                    _ => {}
                }
            }
        }
    }

    // Restore terminal
    disable_raw_mode()?;
    stdout().execute(LeaveAlternateScreen)?;

    Ok(())
}
```

This example creates a simple TUI application with a title, a selectable list, and a footer.

### Best Practices for Terminal Interaction

When building interactive terminal applications, follow these best practices:

1. **Graceful Degradation**: Check terminal capabilities and fall back gracefully if advanced features aren't available.

2. **Clean Up After Yourself**: Always restore the terminal state when your application exits, even if it crashes:

```rust
fn run_app() -> Result<()> {
    // Set up terminal
    enable_raw_mode()?;
    stdout().execute(EnterAlternateScreen)?;

    // Run your application...

    // Clean up
    disable_raw_mode()?;
    stdout().execute(LeaveAlternateScreen)?;

    Ok(())
}

fn main() {
    // Use a closure with a finally-like pattern
    let result = (|| -> Result<()> {
        run_app()
    })();

    // Always restore terminal state
    let _ = disable_raw_mode();
    let _ = stdout().execute(LeaveAlternateScreen);

    // Report any errors
    if let Err(err) = result {
        eprintln!("Error: {:?}", err);
    }
}
```

3. **Responsive Design**: Adapt your UI based on the terminal size.

4. **Keyboard Navigation**: Provide intuitive keyboard shortcuts and navigation.

5. **Accessibility**: Consider users who may be using screen readers or other assistive technologies.

In the next section, we'll explore how to build fully interactive command-line interfaces that respond to user input in real-time.

## Progress Indicators and Spinners

Long-running operations are common in CLI applications, whether you're processing files, making network requests, or performing complex calculations. Without proper feedback, users might wonder if your application has frozen or crashed. Progress indicators help keep users informed and engaged during these operations.

### Types of Progress Indicators

There are several types of progress indicators, each suited to different scenarios:

1. **Progress Bars**: Show completion percentage for operations with known total work
2. **Spinners**: Indicate activity for operations with unknown duration
3. **Counters**: Display the number of completed items out of a total
4. **ETA Displays**: Estimate time remaining to completion
5. **Throughput Indicators**: Show processing speed (items/second, bytes/second)

### Using the indicatif Crate

While we could build progress indicators from scratch using crossterm (as shown in the previous section), the [`indicatif`](https://crates.io/crates/indicatif) crate provides a more comprehensive and polished solution. Let's add it to our dependencies:

```toml
[dependencies]
indicatif = "0.17"
```

#### Basic Progress Bar

Here's a simple progress bar example:

```rust
use indicatif::{ProgressBar, ProgressStyle};
use std::thread::sleep;
use std::time::Duration;

fn main() {
    let total = 100;
    let pb = ProgressBar::new(total);

    pb.set_style(
        ProgressStyle::default_bar()
            .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} ({eta})")
            .unwrap()
            .progress_chars("#>-")
    );

    for i in 0..total {
        pb.inc(1);

        // Simulate some work
        sleep(Duration::from_millis(50));
    }

    pb.finish_with_message("Done!");
}
```

This creates a progress bar with:

- A spinner
- Elapsed time
- A colored bar showing progress
- Current position and total
- Estimated time remaining

#### Multi-Progress Bars

For more complex operations, you might need multiple progress bars:

```rust
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use std::thread;
use std::time::Duration;

fn main() {
    let m = MultiProgress::new();

    let style = ProgressStyle::default_bar()
        .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} {msg}")
        .unwrap()
        .progress_chars("#>-");

    let pb1 = m.add(ProgressBar::new(100));
    pb1.set_style(style.clone());
    pb1.set_message("Processing files");

    let pb2 = m.add(ProgressBar::new(50));
    pb2.set_style(style.clone());
    pb2.set_message("Uploading data");

    let pb3 = m.add(ProgressBar::new(75));
    pb3.set_style(style);
    pb3.set_message("Analyzing results");

    let handle1 = thread::spawn(move || {
        for i in 0..100 {
            pb1.inc(1);
            thread::sleep(Duration::from_millis(25));
        }
        pb1.finish_with_message("Files processed");
    });

    let handle2 = thread::spawn(move || {
        for i in 0..50 {
            pb2.inc(1);
            thread::sleep(Duration::from_millis(100));
        }
        pb2.finish_with_message("Data uploaded");
    });

    let handle3 = thread::spawn(move || {
        for i in 0..75 {
            pb3.inc(1);
            thread::sleep(Duration::from_millis(50));
        }
        pb3.finish_with_message("Analysis complete");
    });

    // Wait for all progress bars to finish
    let _ = handle1.join();
    let _ = handle2.join();
    let _ = handle3.join();
}
```

This example shows three concurrent progress bars, each running in its own thread.

#### Spinners

For operations where you can't measure progress, use a spinner:

```rust
use indicatif::{ProgressBar, ProgressStyle};
use std::thread::sleep;
use std::time::Duration;

fn main() {
    let spinner = ProgressBar::new_spinner();

    spinner.set_style(
        ProgressStyle::default_spinner()
            .template("{spinner:.green} {msg}")
            .unwrap()
            .tick_strings(&[
                "⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"
            ])
    );

    spinner.set_message("Processing...");

    for i in 0..50 {
        spinner.tick();
        sleep(Duration::from_millis(100));
    }

    spinner.finish_with_message("Done!");
}
```

#### Progress Bars with Iterators

One of the most convenient features of indicatif is its ability to wrap iterators:

```rust
use indicatif::{ProgressBar, ProgressStyle};
use std::thread::sleep;
use std::time::Duration;

fn main() {
    let data = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    let pb = ProgressBar::new(data.len() as u64);
    pb.set_style(
        ProgressStyle::default_bar()
            .template("{bar:40.cyan/blue} {pos:>7}/{len:7} {msg}")
            .unwrap()
            .progress_chars("##-")
    );

    // Process the data with a progress bar
    let result: Vec<_> = pb
        .wrap_iter(data.iter())
        .map(|item| {
            // Simulate processing
            sleep(Duration::from_millis(200));
            item * 2
        })
        .collect();

    pb.finish_with_message("Processing complete");

    println!("Result: {:?}", result);
}
```

This wraps an iterator with a progress bar, automatically incrementing it for each item processed.

#### Progress Bars for File Operations

A common use case is showing progress for file operations:

```rust
use indicatif::{ProgressBar, ProgressStyle, ByteUnit};
use std::fs::File;
use std::io::{Read, BufReader, BufRead};
use std::path::Path;

fn process_large_file(path: &Path) -> std::io::Result<()> {
    let file = File::open(path)?;
    let file_size = file.metadata()?.len();

    let pb = ProgressBar::new(file_size);
    pb.set_style(
        ProgressStyle::default_bar()
            .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {bytes}/{total_bytes} ({eta})")
            .unwrap()
            .progress_chars("#>-")
    );

    let mut reader = BufReader::new(file);
    let mut buffer = [0; 8192]; // 8KB buffer
    let mut bytes_read = 0;

    while let Ok(n) = reader.read(&mut buffer) {
        if n == 0 {
            break; // End of file
        }

        bytes_read += n as u64;
        pb.set_position(bytes_read);

        // Process the data...

        // Simulate some work
        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    pb.finish_with_message("File processed");

    Ok(())
}

fn main() -> std::io::Result<()> {
    let path = Path::new("path/to/large/file.dat");
    process_large_file(path)?;
    Ok(())
}
```

This example shows a progress bar for processing a large file, displaying:

- The number of bytes processed
- The total file size
- Elapsed time
- Estimated time remaining

### Custom Progress Reporting

Sometimes you need more control over how progress is reported. Let's create a custom progress reporter:

```rust
use indicatif::{ProgressBar, ProgressStyle, HumanDuration};
use std::time::{Duration, Instant};

struct ProgressReporter {
    progress_bar: ProgressBar,
    start_time: Instant,
    last_update: Instant,
    update_interval: Duration,
    items_processed: u64,
    bytes_processed: u64,
}

impl ProgressReporter {
    fn new(total: u64) -> Self {
        let pb = ProgressBar::new(total);
        pb.set_style(
            ProgressStyle::default_bar()
                .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} | {msg}")
                .unwrap()
                .progress_chars("#>-")
        );

        let now = Instant::now();

        ProgressReporter {
            progress_bar: pb,
            start_time: now,
            last_update: now,
            update_interval: Duration::from_millis(100),
            items_processed: 0,
            bytes_processed: 0,
        }
    }

    fn update(&mut self, items: u64, bytes: u64, message: Option<String>) {
        self.items_processed += items;
        self.bytes_processed += bytes;

        let now = Instant::now();
        if now.duration_since(self.last_update) >= self.update_interval {
            self.last_update = now;

            let elapsed = now.duration_since(self.start_time);
            let items_per_sec = if elapsed.as_secs_f64() > 0.0 {
                self.items_processed as f64 / elapsed.as_secs_f64()
            } else {
                0.0
            };

            let bytes_per_sec = if elapsed.as_secs_f64() > 0.0 {
                self.bytes_processed as f64 / elapsed.as_secs_f64()
            } else {
                0.0
            };

            let msg = message.unwrap_or_else(|| {
                format!(
                    "{:.2} items/s | {}/s",
                    items_per_sec,
                    indicatif::HumanBytes(bytes_per_sec as u64)
                )
            });

            self.progress_bar.set_message(msg);
            self.progress_bar.set_position(self.items_processed);
        }
    }

    fn finish(&self) {
        let elapsed = self.start_time.elapsed();
        self.progress_bar.finish_with_message(format!(
            "Done in {}. Processed {} items ({}).",
            HumanDuration(elapsed),
            self.items_processed,
            indicatif::HumanBytes(self.bytes_processed)
        ));
    }
}

fn main() {
    let total_items = 1000;
    let mut reporter = ProgressReporter::new(total_items);

    for i in 0..total_items {
        // Simulate processing an item
        std::thread::sleep(std::time::Duration::from_millis(5));

        // Update progress (1 item, random number of bytes)
        let bytes = (i % 10 + 1) * 1024; // Between 1KB and 10KB
        reporter.update(1, bytes, None);
    }

    reporter.finish();
}
```

This custom reporter provides:

- Items processed per second
- Bytes processed per second
- Customizable messages
- A summary at completion

### Progress Indicators in Real-World Applications

Let's look at a more realistic example: downloading files with progress reporting:

```rust
use indicatif::{ProgressBar, ProgressStyle, MultiProgress};
use std::cmp::min;
use std::fs::File;
use std::io::Write;
use std::path::Path;
use std::thread;

struct Download {
    url: String,
    destination: String,
    size: u64,
}

fn download_file(download: &Download, progress_bar: ProgressBar) -> std::io::Result<()> {
    let path = Path::new(&download.destination);
    let mut file = File::create(path)?;

    // In a real application, this would use reqwest or another HTTP client
    // Here we simulate the download
    let mut downloaded = 0;
    let chunk_size = 16384; // 16KB chunks

    while downloaded < download.size {
        // Simulate network delay
        thread::sleep(std::time::Duration::from_millis(
            50 + (rand::random::<u64>() % 50)
        ));

        // Calculate how much to download in this chunk
        let to_download = min(chunk_size, download.size - downloaded);

        // Simulate writing data
        let data = vec![0u8; to_download as usize];
        file.write_all(&data)?;

        downloaded += to_download;
        progress_bar.set_position(downloaded);
    }

    progress_bar.finish_with_message("Downloaded");
    Ok(())
}

fn main() -> std::io::Result<()> {
    let downloads = vec![
        Download {
            url: "https://example.com/file1.zip".to_string(),
            destination: "file1.zip".to_string(),
            size: 5_000_000, // 5MB
        },
        Download {
            url: "https://example.com/file2.iso".to_string(),
            destination: "file2.iso".to_string(),
            size: 20_000_000, // 20MB
        },
        Download {
            url: "https://example.com/file3.tar.gz".to_string(),
            destination: "file3.tar.gz".to_string(),
            size: 10_000_000, // 10MB
        },
    ];

    let multi_progress = MultiProgress::new();

    let style = ProgressStyle::default_bar()
        .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {bytes}/{total_bytes} ({eta}) {msg}")
        .unwrap()
        .progress_chars("#>-");

    // Create a progress bar for the overall download
    let total_size: u64 = downloads.iter().map(|d| d.size).sum();
    let overall_pb = multi_progress.add(ProgressBar::new(total_size));
    overall_pb.set_style(style.clone());
    overall_pb.set_message("Total progress");

    // Create a progress bar for each individual download
    let mut handles = Vec::new();
    for download in &downloads {
        let pb = multi_progress.add(ProgressBar::new(download.size));
        pb.set_style(style.clone());
        pb.set_message(format!("Downloading {}", download.destination));

        let download_clone = download.clone();
        let overall_pb_clone = overall_pb.clone();

        let handle = thread::spawn(move || {
            download_file(&download_clone, pb).unwrap();
            overall_pb_clone.inc(download_clone.size);
        });

        handles.push(handle);
    }

    // Wait for all downloads to complete
    for handle in handles {
        handle.join().unwrap();
    }

    overall_pb.finish_with_message("All downloads complete");

    Ok(())
}
```

### Best Practices for Progress Indicators

When using progress indicators, follow these best practices:

1. **Be Accurate**: Ensure your progress reflects the actual state of the operation.

2. **Be Responsive**: Update progress frequently enough to feel smooth but not so often that it impacts performance.

3. **Show Useful Information**: Include:

   - Percentage or fraction complete
   - Elapsed time
   - Estimated time remaining
   - Processing rate (items/second, bytes/second)

4. **Handle Edge Cases**:

   - Very fast operations (consider skipping the progress bar)
   - Very slow operations (provide more detailed feedback)
   - Operations that might fail midway

5. **Test on Different Terminals**: Ensure your progress indicators work correctly on various terminal types and sizes.

6. **Consider Non-Interactive Environments**: Detect when your program is not connected to a TTY and adjust output accordingly:

```rust
use indicatif::{ProgressBar, ProgressStyle};

fn main() {
    let total = 100;

    // Create a progress bar that shows nothing if not connected to a TTY
    let pb = if atty::is(atty::Stream::Stdout) {
        ProgressBar::new(total)
    } else {
        ProgressBar::hidden()
    };

    pb.set_style(
        ProgressStyle::default_bar()
            .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} ({eta})")
            .unwrap()
    );

    for i in 0..total {
        pb.inc(1);

        // Simulate work
        std::thread::sleep(std::time::Duration::from_millis(50));
    }

    pb.finish_with_message("Done!");
}
```

In the next section, we'll explore how to build fully interactive command-line interfaces that respond to user input in real-time.

## Building Interactive CLIs

So far, we've explored command-line applications that process arguments, provide feedback with progress indicators, and execute operations. Now, let's take a step further and build fully interactive CLI applications that engage users in a dialog.

Interactive CLIs can range from simple prompts that ask for input to sophisticated applications with menus, wizards, and rich interfaces. These interfaces can make your tools more approachable, especially for users who aren't comfortable with complex command-line arguments.

### The dialoguer Crate

The [`dialoguer`](https://crates.io/crates/dialoguer) crate provides a high-level API for creating interactive command-line prompts. It's developed by the same team behind indicatif and builds on similar principles.

Let's add it to our dependencies:

```toml
[dependencies]
dialoguer = "0.10"
```

#### Basic Input Prompts

Let's start with basic input prompts:

```rust
use dialoguer::{Input, Password, Confirm};

fn main() {
    // Simple text input
    let name: String = Input::new()
        .with_prompt("What is your name?")
        .default("User".into())
        .interact_text()
        .unwrap();

    println!("Hello, {}!", name);

    // Password input (hidden)
    let password: String = Password::new()
        .with_prompt("Enter your password")
        .with_confirmation("Confirm password", "Passwords don't match")
        .interact()
        .unwrap();

    println!("Password entered successfully");

    // Confirmation (yes/no)
    let confirmed = Confirm::new()
        .with_prompt("Do you want to continue?")
        .default(true)
        .interact()
        .unwrap();

    if confirmed {
        println!("Continuing...");
    } else {
        println!("Operation cancelled");
    }
}
```

This example shows:

- A text input with a default value
- A password input with confirmation
- A yes/no confirmation prompt

#### Selection Menus

Selection menus allow users to choose from a list of options:

```rust
use dialoguer::{Select, MultiSelect, FuzzySelect, theme::ColorfulTheme};

fn main() {
    // Set up a colorful theme
    let theme = ColorfulTheme::default();

    // Single selection
    let options = vec!["Option 1", "Option 2", "Option 3"];
    let selection = Select::with_theme(&theme)
        .with_prompt("Select an option")
        .default(0)
        .items(&options)
        .interact()
        .unwrap();

    println!("You selected: {}", options[selection]);

    // Multiple selection
    let selections = MultiSelect::with_theme(&theme)
        .with_prompt("Select one or more options")
        .items(&options)
        .interact()
        .unwrap();

    println!("You selected:");
    for selection in selections {
        println!("  - {}", options[selection]);
    }

    // Fuzzy selection (with search)
    let items = vec![
        "apple", "banana", "cherry", "date", "elderberry",
        "fig", "grape", "honeydew", "kiwi", "lemon",
    ];

    let selection = FuzzySelect::with_theme(&theme)
        .with_prompt("Select a fruit (type to search)")
        .default(0)
        .items(&items)
        .interact()
        .unwrap();

    println!("You selected: {}", items[selection]);
}
```

This example demonstrates:

- Single-item selection
- Multiple-item selection
- Fuzzy selection with search functionality

#### Progress for Complex Operations

We can combine dialoguer with indicatif to create interactive workflows with progress reporting:

```rust
use dialoguer::{Input, Select, theme::ColorfulTheme};
use indicatif::{ProgressBar, ProgressStyle};
use std::thread::sleep;
use std::time::Duration;

fn main() {
    let theme = ColorfulTheme::default();

    // Get input from the user
    let filename: String = Input::with_theme(&theme)
        .with_prompt("Enter filename to process")
        .default("data.txt".into())
        .interact_text()
        .unwrap();

    // Choose an operation
    let operations = vec!["Analyze", "Convert", "Compress"];
    let operation = Select::with_theme(&theme)
        .with_prompt("What operation would you like to perform?")
        .default(0)
        .items(&operations)
        .interact()
        .unwrap();

    println!("Processing '{}' with operation: {}", filename, operations[operation]);

    // Show progress for the selected operation
    let pb = ProgressBar::new(100);
    pb.set_style(
        ProgressStyle::default_bar()
            .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}% ({eta})")
            .unwrap()
            .progress_chars("#>-")
    );

    for i in 0..100 {
        pb.inc(1);

        // Simulate work based on the selected operation
        let delay = match operation {
            0 => 20,  // Analyze is fast
            1 => 50,  // Convert is medium
            2 => 100, // Compress is slow
            _ => 50,
        };

        sleep(Duration::from_millis(delay));
    }

    pb.finish_with_message(format!("{} completed successfully", operations[operation]));
}
```

This example creates a simple workflow where the user:

1. Enters a filename
2. Selects an operation
3. Sees progress as the operation executes

### Form-Based Input

For collecting multiple fields of data, we can create a form-like interface:

```rust
use dialoguer::{Input, theme::ColorfulTheme};
use std::path::PathBuf;

#[derive(Debug)]
struct UserConfig {
    name: String,
    email: String,
    backup_dir: PathBuf,
    auto_save: bool,
}

fn main() {
    let theme = ColorfulTheme::default();

    println!("User Configuration");
    println!("=================");

    // Collect multiple fields
    let name: String = Input::with_theme(&theme)
        .with_prompt("Name")
        .interact_text()
        .unwrap();

    let email: String = Input::with_theme(&theme)
        .with_prompt("Email")
        .validate_with(|input: &String| -> Result<(), &str> {
            if input.contains('@') {
                Ok(())
            } else {
                Err("Email must contain an @ symbol")
            }
        })
        .interact_text()
        .unwrap();

    let backup_dir: String = Input::with_theme(&theme)
        .with_prompt("Backup directory")
        .default("./backup".into())
        .interact_text()
        .unwrap();

    let auto_save: bool = dialoguer::Confirm::with_theme(&theme)
        .with_prompt("Enable auto-save?")
        .default(true)
        .interact()
        .unwrap();

    // Create a config object
    let config = UserConfig {
        name,
        email,
        backup_dir: PathBuf::from(backup_dir),
        auto_save,
    };

    println!("\nConfiguration complete:");
    println!("  Name: {}", config.name);
    println!("  Email: {}", config.email);
    println!("  Backup directory: {}", config.backup_dir.display());
    println!("  Auto-save: {}", if config.auto_save { "Enabled" } else { "Disabled" });

    // In a real application, you would save this config to a file
}
```

This example:

- Collects multiple fields in a form-like interface
- Validates the email input
- Creates a configuration object with the collected data

### Wizard-Style Interfaces

For complex setups, a wizard-style interface can guide users through multiple steps:

```rust
use dialoguer::{theme::ColorfulTheme, Confirm, Input, Select};
use std::path::PathBuf;

#[derive(Debug)]
struct ProjectConfig {
    name: String,
    language: String,
    path: PathBuf,
    create_git_repo: bool,
    initialize_dependencies: bool,
}

fn main() {
    let theme = ColorfulTheme::default();

    println!("Project Setup Wizard");
    println!("===================");

    // Step 1: Project Name
    let name: String = Input::with_theme(&theme)
        .with_prompt("Project name")
        .interact_text()
        .unwrap();

    // Step 2: Programming Language
    let languages = vec!["Rust", "JavaScript", "Python", "Go", "Java"];
    let language_idx = Select::with_theme(&theme)
        .with_prompt("Select programming language")
        .default(0)
        .items(&languages)
        .interact()
        .unwrap();
    let language = languages[language_idx].to_string();

    // Step 3: Project Location
    let default_path = format!("./{}", name.to_lowercase().replace(' ', "_"));
    let path_str: String = Input::with_theme(&theme)
        .with_prompt("Project location")
        .default(default_path)
        .interact_text()
        .unwrap();
    let path = PathBuf::from(path_str);

    // Step 4: Git Repository
    let create_git_repo = Confirm::with_theme(&theme)
        .with_prompt("Initialize Git repository?")
        .default(true)
        .interact()
        .unwrap();

    // Step 5: Dependencies (conditional based on language)
    let initialize_dependencies = match language.as_str() {
        "Rust" => {
            Confirm::with_theme(&theme)
                .with_prompt("Run 'cargo init'?")
                .default(true)
                .interact()
                .unwrap()
        }
        "JavaScript" => {
            Confirm::with_theme(&theme)
                .with_prompt("Run 'npm init'?")
                .default(true)
                .interact()
                .unwrap()
        }
        "Python" => {
            Confirm::with_theme(&theme)
                .with_prompt("Create virtual environment?")
                .default(true)
                .interact()
                .unwrap()
        }
        _ => {
            Confirm::with_theme(&theme)
                .with_prompt("Initialize default project structure?")
                .default(true)
                .interact()
                .unwrap()
        }
    };

    // Summary
    let config = ProjectConfig {
        name,
        language,
        path,
        create_git_repo,
        initialize_dependencies,
    };

    println!("\nProject Configuration:");
    println!("  Name: {}", config.name);
    println!("  Language: {}", config.language);
    println!("  Path: {}", config.path.display());
    println!("  Git: {}", if config.create_git_repo { "Yes" } else { "No" });
    println!("  Initialize Dependencies: {}", if config.initialize_dependencies { "Yes" } else { "No" });

    // Confirmation before proceeding
    let proceed = Confirm::with_theme(&theme)
        .with_prompt("Proceed with project creation?")
        .default(true)
        .interact()
        .unwrap();

    if proceed {
        println!("Creating project...");
        // In a real application, you would create the project here
    } else {
        println!("Project creation cancelled.");
    }
}
```

This wizard:

1. Collects basic project information
2. Adapts questions based on previous answers
3. Shows a summary before proceeding
4. Gets final confirmation

### Advanced Interactive Features

For more advanced interactive features, you might want to combine dialoguer with other crates:

#### Interactive Editor

For editing longer text:

```rust
use dialoguer::{Editor, theme::ColorfulTheme};

fn main() {
    let theme = ColorfulTheme::default();

    // Launch the user's default editor
    let content = Editor::new()
        .with_theme(&theme)
        .extension(".md")  // Use Markdown extension
        .require_save(true)
        .trim_newlines(true)
        .edit("# Initial content\n\nEdit this text and save the file.")
        .unwrap();

    if let Some(content) = content {
        println!("You entered:\n{}", content);
    } else {
        println!("Editor was cancelled or no changes were made.");
    }
}
```

This launches the user's default editor (determined by the `EDITOR` environment variable) with some initial content.

#### Interactive File Selection

You can create an interactive file browser:

```rust
use dialoguer::{theme::ColorfulTheme, Select};
use std::fs;
use std::path::{Path, PathBuf};

fn browse_directory(path: &Path) -> Option<PathBuf> {
    let theme = ColorfulTheme::default();

    // Read directory contents
    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(e) => {
            eprintln!("Error reading directory: {}", e);
            return None;
        }
    };

    // Collect directory entries
    let mut paths = vec![PathBuf::from("..")]; // Add parent directory
    for entry in entries {
        if let Ok(entry) = entry {
            paths.push(entry.path());
        }
    }

    // Sort: directories first, then files
    paths.sort_by(|a, b| {
        let a_is_dir = a.is_dir();
        let b_is_dir = b.is_dir();

        if a_is_dir && !b_is_dir {
            std::cmp::Ordering::Less
        } else if !a_is_dir && b_is_dir {
            std::cmp::Ordering::Greater
        } else {
            a.file_name().cmp(&b.file_name())
        }
    });

    // Create display names
    let display_names: Vec<String> = paths
        .iter()
        .map(|p| {
            let name = if p == &PathBuf::from("..") {
                "[Parent Directory]".to_string()
            } else {
                p.file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string()
            };

            if p.is_dir() {
                format!("📁 {}/", name)
            } else {
                format!("📄 {}", name)
            }
        })
        .collect();

    // Show selection menu
    let selection = Select::with_theme(&theme)
        .with_prompt(format!("Browse: {}", path.display()))
        .default(0)
        .items(&display_names)
        .interact()
        .unwrap();

    let selected_path = path.join(&paths[selection]);

    // If directory, browse recursively
    if selected_path.is_dir() {
        browse_directory(&selected_path)
    } else {
        Some(selected_path)
    }
}

fn main() {
    let current_dir = std::env::current_dir().unwrap();

    println!("File Browser");
    println!("============");

    if let Some(selected_file) = browse_directory(&current_dir) {
        println!("You selected: {}", selected_file.display());
    } else {
        println!("No file selected.");
    }
}
```

This example creates a simple file browser that:

- Lists files and directories
- Allows navigation through directories
- Returns the selected file

### Best Practices for Interactive CLIs

When building interactive CLI applications, follow these best practices:

1. **Progressive Disclosure**: Start simple and gradually reveal complexity as needed.

2. **Sensible Defaults**: Provide smart defaults to reduce the effort required from users.

3. **Error Tolerance**: Handle input errors gracefully and provide clear feedback.

4. **Visual Hierarchy**: Use spacing, colors, and formatting to organize information.

5. **Keyboard Navigation**: Ensure your interface works well with keyboard input.

6. **Escape Hatches**: Allow users to cancel operations or go back to previous steps.

7. **Respect Terminal Settings**: Honor the user's terminal preferences (colors, width, etc.).

8. **Test on Different Terminals**: Ensure your interface works across different terminal emulators.

9. **Performance**: Keep the interface responsive, especially during long-running operations.

10. **Accessibility**: Consider users with different abilities and needs.

In the next section, we'll explore configuration management in CLI applications, which complements interactive interfaces by providing a way to persist user preferences and settings.

## Configuration Management

Command-line applications often need to persist settings and preferences across runs. While simple tools might use command-line arguments for all configuration, more complex applications benefit from dedicated configuration management. This allows users to set defaults, store credentials, and customize behavior without specifying the same options each time.

### Configuration Sources

Most CLI applications use a combination of these configuration sources, in order of precedence:

1. **Command-line arguments**: Highest precedence, overrides all other sources
2. **Environment variables**: For system-wide or session-specific settings
3. **Configuration files**: For user-specific or project-specific settings
4. **Default values**: Hardcoded in the application

This hierarchy allows users to customize behavior at different levels of permanence.

### Configuration File Formats

Common configuration file formats include:

- **TOML**: Human-readable, well-structured, and the default for Rust projects (Cargo.toml)
- **YAML**: Human-readable with good support for complex data structures
- **JSON**: Widely supported but less human-friendly
- **INI**: Simple key-value format, often used for basic settings

Let's focus on TOML, which has become the standard for Rust applications.

### Using the config Crate

The [`config`](https://crates.io/crates/config) crate provides a flexible, layered approach to configuration management. Let's add it to our dependencies:

```toml
[dependencies]
config = "0.13"
serde = { version = "1.0", features = ["derive"] }
toml = "0.7"
```

We also include `serde` for serialization/deserialization and `toml` for TOML support.

#### Basic Configuration Setup

Let's create a basic configuration setup for our file search tool:

```rust
use config::{Config, ConfigError, File};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
struct SearchSettings {
    recursive: bool,
    max_depth: Option<usize>,
    follow_symlinks: bool,
    #[serde(default)]
    ignored_patterns: Vec<String>,
    output_format: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct AppConfig {
    search: SearchSettings,
    #[serde(default)]
    ui: UISettings,
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct UISettings {
    show_progress: bool,
    color_output: bool,
    verbose: bool,
}

fn load_config() -> Result<AppConfig, ConfigError> {
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("findit");

    let config_path = config_dir.join("config.toml");

    // Start with default config
    let mut builder = Config::builder()
        // Set defaults
        .set_default("search.recursive", false)?
        .set_default("search.follow_symlinks", false)?
        .set_default("search.output_format", "text")?
        .set_default("ui.show_progress", true)?
        .set_default("ui.color_output", true)?
        .set_default("ui.verbose", false)?;

    // Layer user config if it exists
    if config_path.exists() {
        builder = builder.add_source(File::from(config_path));
    }

    // Build and deserialize
    let config = builder.build()?;
    let app_config: AppConfig = config.try_deserialize()?;

    Ok(app_config)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = load_config()?;

    println!("Configuration loaded:");
    println!("  Recursive search: {}", config.search.recursive);
    println!("  Follow symlinks: {}", config.search.follow_symlinks);
    println!("  Output format: {}", config.search.output_format);

    if let Some(max_depth) = config.search.max_depth {
        println!("  Max depth: {}", max_depth);
    }

    println!("  Ignored patterns: {:?}", config.search.ignored_patterns);
    println!("  Show progress: {}", config.ui.show_progress);
    println!("  Color output: {}", config.ui.color_output);
    println!("  Verbose: {}", config.ui.verbose);

    Ok(())
}
```

This example:

1. Defines configuration structures with Serde for serialization/deserialization
2. Sets up default values for all settings
3. Loads the configuration file if it exists
4. Merges the default and user configurations

A sample `config.toml` file might look like:

```toml
[search]
recursive = true
max_depth = 10
follow_symlinks = false
ignored_patterns = [".git", "node_modules", "target"]
output_format = "json"

[ui]
show_progress = true
color_output = true
verbose = false
```

#### Adding Environment Variables

Let's enhance our configuration to include environment variables:

```rust
use config::{Config, ConfigError, Environment, File};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// Configuration structs same as before...

fn load_config() -> Result<AppConfig, ConfigError> {
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("findit");

    let config_path = config_dir.join("config.toml");

    // Start with default config
    let mut builder = Config::builder()
        // Set defaults (same as before)...
        .set_default("search.recursive", false)?
        .set_default("search.follow_symlinks", false)?
        .set_default("search.output_format", "text")?
        .set_default("ui.show_progress", true)?
        .set_default("ui.color_output", true)?
        .set_default("ui.verbose", false)?;

    // Layer user config if it exists
    if config_path.exists() {
        builder = builder.add_source(File::from(config_path));
    }

    // Add environment variables with prefix FINDIT_
    builder = builder.add_source(
        Environment::with_prefix("FINDIT")
            .separator("_")
            .try_parsing(true)
    );

    // Build and deserialize
    let config = builder.build()?;
    let app_config: AppConfig = config.try_deserialize()?;

    Ok(app_config)
}
```

With this change, users can override configuration using environment variables:

```bash
# Override the output format
export FINDIT_SEARCH_OUTPUT_FORMAT=csv

# Disable progress bar
export FINDIT_UI_SHOW_PROGRESS=false
```

#### Combining with Command-Line Arguments

Now let's integrate our configuration with clap command-line arguments:

```rust
use clap::Parser;
use config::{Config, ConfigError, Environment, File};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
struct SearchSettings {
    recursive: bool,
    max_depth: Option<usize>,
    follow_symlinks: bool,
    #[serde(default)]
    ignored_patterns: Vec<String>,
    output_format: String,
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct UISettings {
    show_progress: bool,
    color_output: bool,
    verbose: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct AppConfig {
    search: SearchSettings,
    #[serde(default)]
    ui: UISettings,
}

#[derive(Parser, Debug)]
struct Args {
    /// Pattern to search for
    pattern: String,

    /// Directory to search
    #[arg(default_value = ".")]
    path: PathBuf,

    /// Search recursively
    #[arg(short, long)]
    recursive: Option<bool>,

    /// Maximum depth for recursive search
    #[arg(long)]
    max_depth: Option<usize>,

    /// Follow symbolic links
    #[arg(long)]
    follow_symlinks: Option<bool>,

    /// Output format (text, json, csv)
    #[arg(short, long)]
    output: Option<String>,

    /// Show progress bar
    #[arg(long)]
    progress: Option<bool>,

    /// Disable colored output
    #[arg(long)]
    no_color: bool,

    /// Verbose output
    #[arg(short, long)]
    verbose: bool,
}

fn load_config() -> Result<AppConfig, ConfigError> {
    // Same as before...
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("findit");

    let config_path = config_dir.join("config.toml");

    let mut builder = Config::builder()
        .set_default("search.recursive", false)?
        .set_default("search.follow_symlinks", false)?
        .set_default("search.output_format", "text")?
        .set_default("ui.show_progress", true)?
        .set_default("ui.color_output", true)?
        .set_default("ui.verbose", false)?;

    if config_path.exists() {
        builder = builder.add_source(File::from(config_path));
    }

    builder = builder.add_source(
        Environment::with_prefix("FINDIT")
            .separator("_")
            .try_parsing(true)
    );

    let config = builder.build()?;
    let app_config: AppConfig = config.try_deserialize()?;

    Ok(app_config)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Parse command-line arguments
    let args = Args::parse();

    // Load configuration
    let mut config = load_config()?;

    // Override config with command-line arguments
    if let Some(recursive) = args.recursive {
        config.search.recursive = recursive;
    }

    if let Some(max_depth) = args.max_depth {
        config.search.max_depth = Some(max_depth);
    }

    if let Some(follow_symlinks) = args.follow_symlinks {
        config.search.follow_symlinks = follow_symlinks;
    }

    if let Some(output) = args.output {
        config.search.output_format = output;
    }

    if let Some(progress) = args.progress {
        config.ui.show_progress = progress;
    }

    if args.no_color {
        config.ui.color_output = false;
    }

    config.ui.verbose = args.verbose;

    // Now use the final configuration for the application
    if config.ui.verbose {
        println!("Search pattern: {}", args.pattern);
        println!("Search path: {}", args.path.display());
        println!("Configuration:");
        println!("  Recursive: {}", config.search.recursive);
        println!("  Max depth: {}", config.search.max_depth);
        println!("  Follow symlinks: {}", config.search.follow_symlinks);
        println!("  Output format: {}", config.search.output_format);
        println!("  Show progress: {}", config.ui.show_progress);
    }

    // Actual search implementation would go here

    Ok(())
}
```

This implementation follows the precedence hierarchy:

1. Command-line arguments override everything
2. Environment variables override the configuration file
3. Configuration file overrides defaults
4. Defaults are used when no other source provides a value

### Creating and Managing Configuration Files

Let's add functionality to create or update the configuration file:

```rust
use config::{Config, ConfigError, Environment, File};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;

// Configuration structs same as before...

fn get_config_path() -> PathBuf {
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("findit");

    config_dir.join("config.toml")
}

fn load_config() -> Result<AppConfig, ConfigError> {
    let config_path = get_config_path();

    // Same as before...
    let mut builder = Config::builder()
        .set_default("search.recursive", false)?
        .set_default("search.follow_symlinks", false)?
        .set_default("search.output_format", "text")?
        .set_default("ui.show_progress", true)?
        .set_default("ui.color_output", true)?
        .set_default("ui.verbose", false)?;

    if config_path.exists() {
        builder = builder.add_source(File::from(config_path));
    }

    builder = builder.add_source(
        Environment::with_prefix("FINDIT")
            .separator("_")
            .try_parsing(true)
    );

    let config = builder.build()?;
    let app_config: AppConfig = config.try_deserialize()?;

    Ok(app_config)
}

fn save_config(config: &AppConfig) -> Result<(), Box<dyn std::error::Error>> {
    let config_path = get_config_path();

    // Create config directory if it doesn't exist
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)?;
    }

    // Serialize config to TOML
    let toml_string = toml::to_string_pretty(config)?;

    // Write to file
    let mut file = fs::File::create(config_path)?;
    file.write_all(toml_string.as_bytes())?;

    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Add a new subcommand to handle configuration
    let app = clap::Command::new("findit")
        .about("A file finding tool")
        .subcommand_required(true)
        .subcommand(
            clap::Command::new("search")
                .about("Search for files")
                .arg(clap::Arg::new("pattern").required(true))
                .arg(clap::Arg::new("path").default_value("."))
                .arg(clap::Arg::new("recursive").long("recursive").short('r'))
                // Other search args...
        )
        .subcommand(
            clap::Command::new("config")
                .about("Manage configuration")
                .subcommand(
                    clap::Command::new("init")
                        .about("Create default configuration file")
                )
                .subcommand(
                    clap::Command::new("set")
                        .about("Set a configuration value")
                        .arg(clap::Arg::new("key").required(true))
                        .arg(clap::Arg::new("value").required(true))
                )
                .subcommand(
                    clap::Command::new("get")
                        .about("Get a configuration value")
                        .arg(clap::Arg::new("key").required(true))
                )
                .subcommand(
                    clap::Command::new("list")
                        .about("List all configuration values")
                )
        );

    let matches = app.get_matches();

    match matches.subcommand() {
        Some(("search", search_matches)) => {
            // Handle search command (similar to previous example)
            // ...
        }
        Some(("config", config_matches)) => {
            match config_matches.subcommand() {
                Some(("init", _)) => {
                    // Create default config
                    let default_config = AppConfig {
                        search: SearchSettings {
                            recursive: false,
                            max_depth: Some(100),
                            follow_symlinks: false,
                            ignored_patterns: vec![".git".to_string(), "node_modules".to_string()],
                            output_format: "text".to_string(),
                        },
                        ui: UISettings {
                            show_progress: true,
                            color_output: true,
                            verbose: false,
                        },
                    };

                    save_config(&default_config)?;
                    println!("Created default configuration at {}", get_config_path().display());
                }
                Some(("set", set_matches)) => {
                    let key = set_matches.get_one::<String>("key").unwrap();
                    let value = set_matches.get_one::<String>("value").unwrap();

                    // Load current config
                    let mut config = load_config()?;

                    // Update config based on key
                    match key.as_str() {
                        "search.recursive" => {
                            config.search.recursive = value.parse().map_err(|_| "Invalid boolean value")?;
                        }
                        "search.max_depth" => {
                            config.search.max_depth = Some(value.parse().map_err(|_| "Invalid number")?);
                        }
                        "search.follow_symlinks" => {
                            config.search.follow_symlinks = value.parse().map_err(|_| "Invalid boolean value")?;
                        }
                        "search.output_format" => {
                            config.search.output_format = value.to_string();
                        }
                        "ui.show_progress" => {
                            config.ui.show_progress = value.parse().map_err(|_| "Invalid boolean value")?;
                        }
                        "ui.color_output" => {
                            config.ui.color_output = value.parse().map_err(|_| "Invalid boolean value")?;
                        }
                        "ui.verbose" => {
                            config.ui.verbose = value.parse().map_err(|_| "Invalid boolean value")?;
                        }
                        _ => {
                            return Err(format!("Unknown configuration key: {}", key).into());
                        }
                    }

                    // Save updated config
                    save_config(&config)?;
                    println!("Updated configuration: {} = {}", key, value);
                }
                Some(("get", get_matches)) => {
                    let key = get_matches.get_one::<String>("key").unwrap();
                    let config = load_config()?;

                    // Get config value based on key
                    let value = match key.as_str() {
                        "search.recursive" => config.search.recursive.to_string(),
                        "search.max_depth" => config.search.max_depth.map_or("None".to_string(), |d| d.to_string()),
                        "search.follow_symlinks" => config.search.follow_symlinks.to_string(),
                        "search.output_format" => config.search.output_format,
                        "ui.show_progress" => config.ui.show_progress.to_string(),
                        "ui.color_output" => config.ui.color_output.to_string(),
                        "ui.verbose" => config.ui.verbose.to_string(),
                        _ => return Err(format!("Unknown configuration key: {}", key).into()),
                    };

                    println!("{} = {}", key, value);
                }
                Some(("list", _)) => {
                    let config = load_config()?;

                    println!("Current configuration:");
                    println!("[search]");
                    println!("recursive = {}", config.search.recursive);
                    println!("max_depth = {:?}", config.search.max_depth);
                    println!("follow_symlinks = {}", config.search.follow_symlinks);
                    println!("ignored_patterns = {:?}", config.search.ignored_patterns);
                    println!("output_format = {}", config.search.output_format);
                    println!();
                    println!("[ui]");
                    println!("show_progress = {}", config.ui.show_progress);
                    println!("color_output = {}", config.ui.color_output);
                    println!("verbose = {}", config.ui.verbose);
                }
                _ => unreachable!(),
            }
        }
        _ => unreachable!(),
    }

    Ok(())
}
```

This enhanced version adds commands to:

- Initialize a default configuration file
- Set specific configuration values
- Get specific configuration values
- List all configuration values

### Project-Specific Configuration

For tools that operate within a project context (like build tools or linters), it's common to support project-specific configuration files:

```rust
fn load_config(working_dir: &Path) -> Result<AppConfig, ConfigError> {
    // Start with default config
    let mut builder = Config::builder()
        // Default settings...
        .set_default("search.recursive", false)?;

    // Load global user config
    let user_config_path = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("findit")
        .join("config.toml");

    if user_config_path.exists() {
        builder = builder.add_source(File::from(user_config_path));
    }

    // Look for project config in current directory and parent directories
    let mut current_dir = working_dir.to_path_buf();

    while current_dir.exists() {
        let project_config_path = current_dir.join(".findit.toml");

        if project_config_path.exists() {
            builder = builder.add_source(File::from(project_config_path));
            break; // Stop at the first project config found
        }

        // Move to parent directory
        if !current_dir.pop() {
            break; // We've reached the root
        }
    }

    // Add environment variables
    builder = builder.add_source(
        Environment::with_prefix("FINDIT")
            .separator("_")
            .try_parsing(true)
    );

    // Build and deserialize
    let config = builder.build()?;
    let app_config: AppConfig = config.try_deserialize()?;

    Ok(app_config)
}
```

This approach:

1. Starts with default values
2. Loads the global user configuration
3. Searches for a project-specific configuration file in the current directory and its parents
4. Applies environment variables

### Best Practices for Configuration Management

When implementing configuration management in your CLI applications:

1. **Follow the Principle of Least Surprise**:

   - Use standard file locations
   - Follow conventional naming patterns
   - Maintain consistent precedence rules

2. **Document Configuration Options**:

   - Include examples in documentation
   - Provide comments in default configuration files
   - Make configuration self-discoverable

3. **Validate Configuration**:

   - Check for invalid or incompatible settings
   - Provide helpful error messages
   - Fall back gracefully when possible

4. **Make Configuration Accessible**:

   - Include commands to view and modify configuration
   - Allow exporting configuration to different formats
   - Support showing the effective configuration with all layers applied

5. **Handle Migration**:

   - Provide upgrade paths for configuration files
   - Support deprecated options with warnings
   - Document breaking changes

6. **Consider Security**:
   - Store sensitive values like API keys in a secure manner
   - Support integration with credential managers
   - Be cautious about permissions on configuration files

In the next section, we'll explore logging and tracing in CLI applications, which complements configuration management by providing visibility into application behavior.

## Logging and Tracing

As CLI applications grow in complexity, proper logging becomes essential for diagnosing issues and understanding application behavior. Logging serves several purposes:

1. **Debugging**: Recording detailed information about what the application is doing
2. **Monitoring**: Tracking application health and performance
3. **Auditing**: Maintaining a record of important actions for security or compliance
4. **User Feedback**: Providing appropriate information to users based on verbosity level

Rust has several mature logging frameworks that make it easy to add comprehensive logging to your applications.

### The log Crate

The foundation of Rust's logging ecosystem is the [`log`](https://crates.io/crates/log) crate, which provides a facade for logging that separates the logging API from the implementation. Let's add it to our dependencies:

```toml
[dependencies]
log = "0.4"
```

#### Basic Logging Macros

The `log` crate provides several macros for different log levels:

```rust
use log::{debug, error, info, trace, warn};

fn main() {
    trace!("This is a trace message");  // Most verbose
    debug!("This is a debug message");
    info!("This is an info message");   // Default level
    warn!("This is a warning message");
    error!("This is an error message"); // Least verbose
}
```

These macros are similar to `println!` but include:

- A log level indicating severity
- Optional formatting with arguments
- Additional context like file and line number

#### Log Implementations

The `log` crate only provides the API; you need to add a logging implementation to actually process and output the log messages. Common implementations include:

- [`env_logger`](https://crates.io/crates/env_logger): Simple logger controlled by environment variables
- [`simple_logger`](https://crates.io/crates/simple_logger): Easy-to-configure stdout logger
- [`fern`](https://crates.io/crates/fern): Configurable multi-output logger
- [`slog`](https://crates.io/crates/slog): Structured, composable logging

Let's use `env_logger` for our examples:

```toml
[dependencies]
log = "0.4"
env_logger = "0.10"
```

```rust
use log::{debug, error, info, trace, warn};

fn main() {
    // Initialize the logger
    env_logger::init();

    trace!("This is a trace message");
    debug!("This is a debug message");
    info!("This is an info message");
    warn!("This is a warning message");
    error!("This is an error message");

    // Log with variables
    let name = "Alice";
    let count = 42;
    info!("User {} performed {} operations", name, count);
}
```

By default, `env_logger` only shows messages at the `error`, `warn`, and `info` levels. To see `debug` and `trace` messages, set the `RUST_LOG` environment variable:

```bash
# Show all log levels
export RUST_LOG=trace

# Show only warnings and errors
export RUST_LOG=warn

# Show debug level and above for your crate, info for others
export RUST_LOG=myapp=debug,info
```

### Structured Logging with slog

For more complex applications, structured logging provides better organization and filtering capabilities. The [`slog`](https://crates.io/crates/slog) crate is a popular choice:

```toml
[dependencies]
slog = "2.7"
slog-term = "2.9"
slog-async = "2.7"
```

```rust
use slog::{debug, error, info, o, trace, warn, Drain, Logger};
use std::sync::Mutex;

fn main() {
    // Create a logger
    let decorator = slog_term::TermDecorator::new().build();
    let drain = slog_term::FullFormat::new(decorator).build().fuse();
    let drain = slog_async::Async::new(drain).build().fuse();

    let root_logger = slog::Logger::root(drain, o!("version" => env!("CARGO_PKG_VERSION")));

    // Create a scoped logger
    let module_logger = root_logger.new(o!("module" => "example"));

    // Log some messages
    trace!(module_logger, "This is a trace message");
    debug!(module_logger, "This is a debug message");
    info!(module_logger, "This is an info message");
    warn!(module_logger, "This is a warning message");
    error!(module_logger, "This is an error message");

    // Structured logging with additional context
    let user_id = 12345;
    info!(
        module_logger,
        "User logged in";
        "user_id" => user_id,
        "ip_address" => "192.168.1.1",
        "login_time" => chrono::Utc::now().to_rfc3339(),
    );
}
```

The key advantages of `slog` include:

- Hierarchical loggers with inherited context
- Structured key-value pairs for better filtering and analysis
- Composable "drains" (log backends) for flexible output
- High performance through async logging

### Integrating Logging with CLI Arguments

Let's integrate logging with our command-line arguments to control verbosity:

```rust
use clap::Parser;
use env_logger::{Builder, Env};
use log::{debug, error, info, trace, warn};

#[derive(Parser, Debug)]
struct Args {
    // ... other arguments ...

    /// Verbose mode (-v, -vv, -vvv)
    #[arg(short, long, action = clap::ArgAction::Count)]
    verbose: u8,

    /// Quiet mode (less output)
    #[arg(short, long)]
    quiet: bool,
}

fn setup_logger(verbosity: u8, quiet: bool) {
    let env = Env::default();

    let mut builder = Builder::from_env(env);

    let log_level = if quiet {
        "error"
    } else {
        match verbosity {
            0 => "warn",   // Default: warnings and errors
            1 => "info",   // -v: info and above
            2 => "debug",  // -vv: debug and above
            _ => "trace",  // -vvv: trace and above
        }
    };

    builder.filter_level(log_level.parse().unwrap());
    builder.init();
}

fn main() {
    let args = Args::parse();

    // Set up logging based on command-line arguments
    setup_logger(args.verbose, args.quiet);

    trace!("Trace message");
    debug!("Debug message");
    info!("Info message");
    warn!("Warning message");
    error!("Error message");

    // Rest of application...
}
```

This example:

1. Adds a count argument for verbosity (each `-v` increases verbosity)
2. Adds a quiet flag to reduce output
3. Configures the logger based on these arguments

### Logging to Multiple Destinations

For more complex applications, you might want to log to multiple destinations:

- Console for immediate feedback
- File for persistent logs
- System log for integration with logging infrastructure
- Network service for centralized logging

The `fern` crate makes this easy:

```toml
[dependencies]
log = "0.4"
fern = { version = "0.6", features = ["colored"] }
chrono = "0.4"
```

```rust
use log::{debug, error, info, trace, warn};
use std::path::PathBuf;

fn setup_logger(log_file: Option<PathBuf>, verbose: bool) -> Result<(), fern::InitError> {
    let log_level = if verbose {
        log::LevelFilter::Debug
    } else {
        log::LevelFilter::Info
    };

    // Base configuration
    let mut config = fern::Dispatch::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "{} [{}] [{}] {}",
                chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
                record.level(),
                record.target(),
                message
            ))
        })
        .level(log_level);

    // Console logger with colors
    let console_config = fern::Dispatch::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "{} [{}] {}",
                chrono::Local::now().format("%H:%M:%S"),
                match record.level() {
                    log::Level::Error => "ERROR".bright_red(),
                    log::Level::Warn => "WARN ".bright_yellow(),
                    log::Level::Info => "INFO ".bright_green(),
                    log::Level::Debug => "DEBUG".bright_blue(),
                    log::Level::Trace => "TRACE".bright_magenta(),
                },
                message
            ))
        })
        .chain(std::io::stdout());

    // Add console logger
    config = config.chain(console_config);

    // Add file logger if requested
    if let Some(log_file) = log_file {
        // Create directory if it doesn't exist
        if let Some(parent) = log_file.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let file_config = fern::Dispatch::new()
            .chain(fern::log_file(log_file)?);

        config = config.chain(file_config);
    }

    // Apply configuration
    config.apply()?;

    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Set up logging based on command-line arguments
    let log_file = Some(PathBuf::from("logs/app.log"));
    let verbose = true;

    setup_logger(log_file, verbose)?;

    trace!("Trace message");
    debug!("Debug message");
    info!("Info message");
    warn!("Warning message");
    error!("Error message");

    Ok(())
}
```

This example:

1. Creates a base logger configuration
2. Adds a colored console logger
3. Optionally adds a file logger
4. Applies the configuration to both destinations

### Tracing with the tracing Crate

While logging is useful for recording events, tracing provides a more structured approach for following the flow of execution through your application. The [`tracing`](https://crates.io/crates/tracing) crate extends the logging concepts with spans (representing periods of time) and structured data:

```toml
[dependencies]
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
```

```rust
use tracing::{debug, error, info, instrument, span, trace, warn, Level};
use tracing_subscriber::{EnvFilter, FmtSubscriber};

#[instrument]
fn process_item(id: u64, name: &str) {
    debug!("Processing item");

    // Create a span for a sub-operation
    let span = span!(Level::TRACE, "validate", item_id = id);
    let _enter = span.enter();

    trace!("Validating item name");

    if name.len() < 3 {
        warn!("Item name too short");
    }

    info!("Item processed successfully");
}

fn main() {
    // Set up the subscriber with filtering
    let subscriber = FmtSubscriber::builder()
        .with_env_filter(EnvFilter::from_default_env())
        .finish();

    tracing::subscriber::set_global_default(subscriber)
        .expect("Failed to set tracing subscriber");

    info!("Application starting");

    process_item(42, "test");

    error!("Something went wrong");

    info!("Application finished");
}
```

Key features of `tracing`:

1. **Spans**: Track operations over time with enter/exit events
2. **Hierarchical Context**: Spans can be nested to show parent-child relationships
3. **Structured Data**: Attach key-value pairs to spans and events
4. **Instrumentation**: Automatically create spans for functions
5. **Compatibility**: Works with existing `log` macros

The `#[instrument]` attribute automatically creates a span for the function, including function name and parameters.

### Best Practices for Logging

When implementing logging in your CLI applications:

1. **Use Appropriate Log Levels**:

   - `ERROR`: Serious failures that prevent normal operation
   - `WARN`: Concerning but non-fatal issues
   - `INFO`: Important events in normal operation
   - `DEBUG`: Detailed information for troubleshooting
   - `TRACE`: Very detailed diagnostic information

2. **Include Contextual Information**:

   - Timestamps for when events occurred
   - Component/module names for where events occurred
   - Relevant data values for understanding the event
   - User or request IDs to correlate related events

3. **Consider Performance**:

   - Use async logging for high-volume applications
   - Use conditional compilation for trace-level logging
   - Avoid expensive operations in log statements
   - Be mindful of string formatting overhead

4. **Log for Different Audiences**:

   - Users need clear, actionable information
   - Developers need detailed diagnostic data
   - Operators need performance and health metrics

5. **Secure Sensitive Information**:

   - Avoid logging passwords, API keys, or personal data
   - Implement redaction for sensitive fields
   - Be aware of logging destination security

6. **Make Logs Useful**:
   - Include enough context to understand the event
   - Use consistent formatting for easier parsing
   - Consider machine readability for automated analysis
   - Include error codes or references to documentation

### Integrating Logging with Signal Handling

For CLI applications that run for extended periods, it's common to use signals to control behavior, including logging:

```rust
use log::{debug, error, info, trace, warn, LevelFilter};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

static VERBOSE_LOGGING: AtomicBool = AtomicBool::new(false);

fn toggle_verbose_logging() {
    let current = VERBOSE_LOGGING.load(Ordering::Relaxed);
    VERBOSE_LOGGING.store(!current, Ordering::Relaxed);

    let new_level = if VERBOSE_LOGGING.load(Ordering::Relaxed) {
        LevelFilter::Debug
    } else {
        LevelFilter::Info
    };

    log::set_max_level(new_level);

    info!("Logging level changed to {}", new_level);
}

fn setup_signal_handlers() {
    #[cfg(unix)]
    {
        use signal_hook::{consts::SIGUSR1, iterator::Signals};
        use std::thread;

        let mut signals = Signals::new(&[SIGUSR1]).unwrap();

        thread::spawn(move || {
            for sig in signals.forever() {
                match sig {
                    SIGUSR1 => {
                        // Toggle verbose logging on SIGUSR1
                        toggle_verbose_logging();
                    }
                    _ => unreachable!(),
                }
            }
        });
    }
}

fn main() {
    // Initialize logger with default level
    env_logger::Builder::new()
        .filter_level(LevelFilter::Info)
        .init();

    // Set up signal handlers
    setup_signal_handlers();

    info!("Application started");

    // Main application loop
    loop {
        // Do some work

        // Log at different levels
        trace!("Trace message");
        debug!("Debug message");
        info!("Info message");

        // Sleep for a bit
        std::thread::sleep(std::time::Duration::from_secs(1));
    }
}
```

This example:

1. Sets up a signal handler for SIGUSR1 (on Unix systems)
2. Toggles between normal and verbose logging when the signal is received
3. Continues logging at the new level

To toggle logging level in a running application:

```bash
# Find the process ID
ps aux | grep myapp

# Send SIGUSR1 to toggle verbose logging
kill -SIGUSR1 <pid>
```

### Putting It All Together

Let's integrate advanced logging into our file search tool:

```rust
use clap::Parser;
use log::{debug, error, info, trace, warn};
use std::path::PathBuf;

#[derive(Parser, Debug)]
struct Args {
    /// Pattern to search for
    pattern: String,

    /// Directory to search
    #[arg(default_value = ".")]
    path: PathBuf,

    /// Search recursively
    #[arg(short, long)]
    recursive: bool,

    /// Verbose mode (-v, -vv, -vvv)
    #[arg(short, long, action = clap::ArgAction::Count)]
    verbose: u8,

    /// Log to file
    #[arg(long)]
    log_file: Option<PathBuf>,
}

fn setup_logger(verbosity: u8, log_file: Option<PathBuf>) -> Result<(), fern::InitError> {
    let log_level = match verbosity {
        0 => log::LevelFilter::Warn,
        1 => log::LevelFilter::Info,
        2 => log::LevelFilter::Debug,
        _ => log::LevelFilter::Trace,
    };

    // Base configuration
    let mut config = fern::Dispatch::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "{} [{}] [{}] {}",
                chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
                record.level(),
                record.target(),
                message
            ))
        })
        .level(log_level);

    // Console logger (stdout for info and below, stderr for warn and above)
    let stdout_config = fern::Dispatch::new()
        .level(log::LevelFilter::Info)
        .level_for("findit", log_level)
        .chain(std::io::stdout());

    let stderr_config = fern::Dispatch::new()
        .level(log::LevelFilter::Warn)
        .chain(std::io::stderr());

    config = config.chain(stdout_config).chain(stderr_config);

    // Add file logger if requested
    if let Some(log_file) = log_file {
        // Create directory if it doesn't exist
        if let Some(parent) = log_file.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let file_config = fern::Dispatch::new()
            .level(log_level)
            .chain(fern::log_file(log_file)?);

        config = config.chain(file_config);
    }

    // Apply configuration
    config.apply()?;

    Ok(())
}

fn search_files(pattern: &str, path: &PathBuf, recursive: bool) -> Vec<PathBuf> {
    debug!("Searching for '{}' in {}", pattern, path.display());
    trace!("Search parameters: recursive={}", recursive);

    // Simulate file search
    let mut results = Vec::new();

    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.filter_map(Result::ok) {
            let entry_path = entry.path();

            if entry_path.is_file() {
                if let Some(filename) = entry_path.file_name() {
                    let filename_str = filename.to_string_lossy();

                    if filename_str.contains(pattern) {
                        info!("Found matching file: {}", entry_path.display());
                        results.push(entry_path.clone());
                    } else {
                        trace!("File did not match: {}", entry_path.display());
                    }
                }
            } else if entry_path.is_dir() && recursive {
                debug!("Recursing into directory: {}", entry_path.display());
                let subdirectory_results = search_files(pattern, &entry_path, recursive);
                results.extend(subdirectory_results);
            }
        }
    } else {
        error!("Failed to read directory: {}", path.display());
    }

    debug!("Found {} matching files in {}", results.len(), path.display());
    results
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    // Set up logging
    setup_logger(args.verbose, args.log_file.clone())?;

    info!("Starting file search for pattern '{}'", args.pattern);
    debug!("Search path: {}", args.path.display());
    debug!("Recursive search: {}", args.recursive);

    let start_time = std::time::Instant::now();

    let results = search_files(&args.pattern, &args.path, args.recursive);

    let elapsed = start_time.elapsed();
    info!("Search completed in {:.2} seconds", elapsed.as_secs_f64());

    println!("Found {} matching files:", results.len());
    for file in &results {
        println!("  {}", file.display());
    }

    Ok(())
}
```

This implementation:

1. Configures logging based on verbosity level
2. Logs to both console and optionally to a file
3. Uses appropriate log levels for different types of information
4. Includes context like filenames and timing information
5. Separates user output (via `println!`) from diagnostic information (via logging)

In the next section, we'll explore signal handling in more depth, allowing our CLI applications to respond gracefully to external events.

## Signal Handling

CLI applications often need to respond to external signals, such as user interrupts (Ctrl+C), termination requests, or custom signals for operations like reloading configuration. Proper signal handling makes your application more robust and user-friendly, especially for long-running processes.

### Understanding Signals

Signals are software interrupts sent to a process to notify it of important events. Common signals include:

- **SIGINT**: Interrupt from keyboard (Ctrl+C)
- **SIGTERM**: Termination request
- **SIGHUP**: Terminal disconnect or daemon reconfiguration
- **SIGUSR1/SIGUSR2**: User-defined signals
- **SIGWINCH**: Terminal window size change

On Unix-like systems, signals are part of the standard process model. Windows has a more limited signal concept, but some common signals like SIGINT are emulated.

### Basic Signal Handling in Rust

Let's explore how to handle signals in Rust using the `signal_hook` crate:

```toml
[dependencies]
signal_hook = "0.3"
```

#### Handling Ctrl+C (SIGINT)

The simplest signal to handle is SIGINT (Ctrl+C), which users send to interrupt a program:

```rust
use signal_hook::{consts::SIGINT, iterator::Signals};
use std::error::Error;
use std::thread;
use std::time::Duration;

fn main() -> Result<(), Box<dyn Error>> {
    // Set up signal handling
    let mut signals = Signals::new(&[SIGINT])?;

    // Handle signals in a separate thread
    let handle = thread::spawn(move || {
        for sig in signals.forever() {
            println!("\nReceived signal: {:?}", sig);
            println!("Cleaning up and exiting...");

            // Perform cleanup here

            std::process::exit(0);
        }
    });

    // Main program loop
    println!("Running... Press Ctrl+C to exit");
    loop {
        // Do some work
        println!("Working...");
        thread::sleep(Duration::from_secs(1));
    }

    // This is never reached in this example
    handle.join().unwrap();
    Ok(())
}
```

This example:

1. Registers a handler for SIGINT
2. Runs the handler in a separate thread
3. Performs cleanup operations before exiting

#### Handling Multiple Signals

Most applications need to handle multiple signals:

```rust
use signal_hook::{consts::{SIGINT, SIGTERM, SIGHUP}, iterator::Signals};
use std::error::Error;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

fn main() -> Result<(), Box<dyn Error>> {
    // Shared flags for signal handling
    let term = Arc::new(AtomicBool::new(false));
    let reload = Arc::new(AtomicBool::new(false));

    // Set up signal handling
    let mut signals = Signals::new(&[SIGINT, SIGTERM, SIGHUP])?;
    let term_clone = term.clone();
    let reload_clone = reload.clone();

    // Handle signals in a separate thread
    let handle = thread::spawn(move || {
        for sig in signals.forever() {
            match sig {
                SIGINT | SIGTERM => {
                    println!("\nReceived termination signal");
                    term_clone.store(true, Ordering::Relaxed);
                }
                SIGHUP => {
                    println!("\nReceived reload signal");
                    reload_clone.store(true, Ordering::Relaxed);
                }
                _ => unreachable!(),
            }
        }
    });

    // Main program loop
    println!("Running... Press Ctrl+C to exit");
    while !term.load(Ordering::Relaxed) {
        // Check if we need to reload
        if reload.load(Ordering::Relaxed) {
            println!("Reloading configuration...");
            // Reload configuration here
            reload.store(false, Ordering::Relaxed);
        }

        // Do some work
        println!("Working...");
        thread::sleep(Duration::from_secs(1));
    }

    println!("Cleaning up and exiting...");
    // Perform cleanup here

    // Clean up signal handling
    drop(handle);

    Ok(())
}
```

This example:

1. Registers handlers for termination (SIGINT, SIGTERM) and reload (SIGHUP) signals
2. Uses atomic flags to communicate between the signal handler and main thread
3. Performs different actions based on the signal received

#### Graceful Shutdown

For long-running applications, graceful shutdown is important to ensure proper cleanup:

```rust
use signal_hook::{consts::{SIGINT, SIGTERM}, iterator::Signals};
use std::error::Error;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

struct AppState {
    // Application state here
    running: Arc<AtomicBool>,
    // Other state...
}

impl AppState {
    fn new() -> Self {
        AppState {
            running: Arc::new(AtomicBool::new(true)),
            // Initialize other state...
        }
    }

    fn shutdown(&self) {
        println!("Shutting down gracefully...");

        // Set running flag to false
        self.running.store(false, Ordering::Relaxed);

        // Give in-progress operations time to complete
        println!("Waiting for operations to complete...");
        thread::sleep(Duration::from_millis(500));

        // Close resources
        println!("Closing resources...");
        // Close database connections, file handles, etc.

        println!("Shutdown complete");
    }
}

fn setup_signal_handling(state: Arc<AppState>) -> Result<(), Box<dyn Error>> {
    let mut signals = Signals::new(&[SIGINT, SIGTERM])?;
    let state_clone = state.clone();

    thread::spawn(move || {
        for sig in signals.forever() {
            println!("\nReceived signal: {:?}", sig);
            state_clone.shutdown();
            std::process::exit(0);
        }
    });

    Ok(())
}

fn main() -> Result<(), Box<dyn Error>> {
    let state = Arc::new(AppState::new());

    // Set up signal handling
    setup_signal_handling(state.clone())?;

    println!("Application started. Press Ctrl+C to exit.");

    // Main application loop
    while state.running.load(Ordering::Relaxed) {
        // Do some work
        println!("Working...");
        thread::sleep(Duration::from_secs(1));
    }

    Ok(())
}
```

This example:

1. Encapsulates application state in a struct
2. Implements a graceful shutdown method
3. Uses a shared flag to communicate shutdown intent
4. Performs cleanup operations in a controlled manner

### Signal Handling in CLI Applications

Let's integrate signal handling into our file search tool to support graceful interruption:

```rust
use clap::Parser;
use signal_hook::{consts::SIGINT, iterator::Signals};
use std::error::Error;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;

#[derive(Parser, Debug)]
struct Args {
    /// Pattern to search for
    pattern: String,

    /// Directory to search
    #[arg(default_value = ".")]
    path: PathBuf,

    /// Search recursively
    #[arg(short, long)]
    recursive: bool,
}

struct SearchState {
    interrupted: Arc<AtomicBool>,
    files_processed: Arc<AtomicUsize>,
    matches_found: Arc<AtomicUsize>,
}

impl SearchState {
    fn new() -> Self {
        SearchState {
            interrupted: Arc::new(AtomicBool::new(false)),
            files_processed: Arc::new(AtomicUsize::new(0)),
            matches_found: Arc::new(AtomicUsize::new(0)),
        }
    }

    fn setup_signal_handling(&self) -> Result<(), Box<dyn Error>> {
        let mut signals = Signals::new(&[SIGINT])?;
        let interrupted = self.interrupted.clone();

        thread::spawn(move || {
            for _ in signals.forever() {
                eprintln!("\nSearch interrupted. Finishing current operation...");
                interrupted.store(true, Ordering::Relaxed);
            }
        });

        Ok(())
    }
}

fn search_files(pattern: &str, path: &PathBuf, recursive: bool, state: &SearchState) -> Vec<PathBuf> {
    let mut results = Vec::new();

    // Check if we've been interrupted
    if state.interrupted.load(Ordering::Relaxed) {
        return results;
    }

    // Process the current directory
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.filter_map(Result::ok) {
            // Check for interruption frequently
            if state.interrupted.load(Ordering::Relaxed) {
                break;
            }

            let entry_path = entry.path();

            if entry_path.is_file() {
                state.files_processed.fetch_add(1, Ordering::Relaxed);

                if let Some(filename) = entry_path.file_name() {
                    let filename_str = filename.to_string_lossy();

                    if filename_str.contains(pattern) {
                        state.matches_found.fetch_add(1, Ordering::Relaxed);
                        results.push(entry_path.clone());
                    }
                }
            } else if entry_path.is_dir() && recursive {
                let subdirectory_results = search_files(pattern, &entry_path, recursive, state);
                results.extend(subdirectory_results);
            }
        }
    }

    results
}

fn main() -> Result<(), Box<dyn Error>> {
    let args = Args::parse();
    let state = SearchState::new();

    // Set up signal handling
    state.setup_signal_handling()?;

    println!("Searching for '{}' in {}{}...",
        args.pattern,
        args.path.display(),
        if args.recursive { " (recursively)" } else { "" }
    );

    let start_time = std::time::Instant::now();

    // Start a progress reporting thread
    let files_processed = state.files_processed.clone();
    let matches_found = state.matches_found.clone();
    let interrupted = state.interrupted.clone();

    let progress_handle = thread::spawn(move || {
        while !interrupted.load(Ordering::Relaxed) {
            let processed = files_processed.load(Ordering::Relaxed);
            let matches = matches_found.load(Ordering::Relaxed);

            eprint!("\rProcessed {} files, found {} matches", processed, matches);

            thread::sleep(std::time::Duration::from_millis(100));
        }
    });

    // Perform the search
    let results = search_files(&args.pattern, &args.path, args.recursive, &state);

    // Signal the progress thread to stop
    state.interrupted.store(true, Ordering::Relaxed);
    let _ = progress_handle.join();

    let elapsed = start_time.elapsed();

    // Clear the progress line
    eprint!("\r                                            \r");

    if state.interrupted.load(Ordering::Relaxed) {
        println!("Search interrupted after {:.2} seconds.", elapsed.as_secs_f64());
        println!("Processed {} files, found {} matches (partial results):",
            state.files_processed.load(Ordering::Relaxed),
            results.len()
        );
    } else {
        println!("Search completed in {:.2} seconds.", elapsed.as_secs_f64());
        println!("Processed {} files, found {} matches:",
            state.files_processed.load(Ordering::Relaxed),
            results.len()
        );
    }

    // Print results
    for file in &results {
        println!("  {}", file.display());
    }

    Ok(())
}
```

This implementation:

1. Creates a shared state to track search progress
2. Sets up signal handling for SIGINT (Ctrl+C)
3. Gracefully handles interruptions during the search
4. Provides real-time progress updates
5. Reports partial results if interrupted

### Cross-Platform Signal Handling

Signal handling is primarily a Unix concept, but we can create cross-platform solutions:

```rust
use std::error::Error;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

#[cfg(unix)]
use signal_hook::{consts::SIGINT, iterator::Signals};

struct Application {
    running: Arc<AtomicBool>,
}

impl Application {
    fn new() -> Self {
        Application {
            running: Arc::new(AtomicBool::new(true)),
        }
    }

    fn setup_signal_handling(&self) -> Result<(), Box<dyn Error>> {
        #[cfg(unix)]
        {
            let mut signals = Signals::new(&[SIGINT])?;
            let running = self.running.clone();

            thread::spawn(move || {
                for _ in signals.forever() {
                    println!("\nReceived interrupt signal");
                    running.store(false, Ordering::Relaxed);
                }
            });
        }

        #[cfg(windows)]
        {
            // On Windows, use ctrlc crate
            let running = self.running.clone();
            ctrlc::set_handler(move || {
                println!("\nReceived interrupt signal");
                running.store(false, Ordering::Relaxed);
            })?;
        }

        Ok(())
    }

    fn run(&self) {
        println!("Application running. Press Ctrl+C to exit.");

        while self.running.load(Ordering::Relaxed) {
            // Do work
            println!("Working...");
            thread::sleep(Duration::from_secs(1));
        }

        println!("Application shutting down...");
    }
}

fn main() -> Result<(), Box<dyn Error>> {
    let app = Application::new();
    app.setup_signal_handling()?;
    app.run();

    Ok(())
}
```

For Windows support, add the `ctrlc` crate:

```toml
[dependencies]
signal_hook = "0.3"
ctrlc = "3.2"
```

### Best Practices for Signal Handling

When implementing signal handling in your CLI applications:

1. **Respond to Common Signals**:

   - SIGINT (Ctrl+C) for user interruption
   - SIGTERM for graceful shutdown
   - SIGHUP for configuration reload (for daemons)

2. **Handle Signals Safely**:

   - Avoid complex operations in signal handlers
   - Use atomic flags to communicate between threads
   - Be aware of async signal safety concerns

3. **Implement Graceful Shutdown**:

   - Clean up resources properly
   - Save state if appropriate
   - Report progress/status before exiting

4. **Be Responsive**:

   - Check interrupt flags frequently in long operations
   - Provide feedback when shutting down
   - Don't block in signal handlers

5. **Consider Cross-Platform Behavior**:
   - Use appropriate libraries for different platforms
   - Fall back gracefully if signals aren't available
   - Test on all target platforms

In the next section, we'll explore output formatting and colors, which help make your CLI applications more user-friendly and informative.

## Summary

Command-line applications remain vital tools in a developer's arsenal, offering efficiency, scriptability, and automation capabilities. Throughout this chapter, we've explored how to build sophisticated CLI applications in Rust that are both powerful and user-friendly.

We began with the fundamentals of CLI application design, discussing the principles of good command-line interfaces and the Rust ecosystem for CLI development. We then explored argument parsing with the `clap` crate, learning how to define, parse, and validate command-line arguments.

For applications that require user interaction, we examined terminal manipulation with the `crossterm` crate, showing how to control the terminal, handle keyboard input, and create interactive interfaces. We also explored progress indicators and spinners with the `indicatif` crate, providing visual feedback during long-running operations.

Building on these foundations, we developed interactive CLI applications using the `dialoguer` crate, implementing prompts, menus, and form-based input. We also addressed configuration management, exploring how to manage settings across different sources with the `config` crate.

For robustness, we implemented logging and tracing with the `log` and `tracing` crates, enabling detailed visibility into application behavior. We also added signal handling, allowing our applications to respond gracefully to interruptions and termination requests.

Rust's combination of performance, safety, and expressive abstractions makes it an excellent choice for CLI applications. The rich ecosystem of crates we've explored provides high-level abstractions while still allowing fine-grained control when needed.

## Exercises

### Exercise 1: File Utility

Build a file utility that can perform operations like copying, moving, and deleting files. Implement:

- Command-line arguments with `clap`
- Progress bars for large file operations
- Graceful handling of interruptions
- Logging with different verbosity levels

### Exercise 2: Interactive Todo Application

Create a simple todo list manager with:

- Add, complete, and delete tasks
- Interactive menu navigation
- Persistent storage using a configuration file
- Color-coded output for different task states

### Exercise 3: System Monitor

Develop a system monitoring tool that displays:

- CPU and memory usage
- Disk space and I/O statistics
- Network activity
- Implement live updating with `crossterm`
- Allow the user to sort and filter the information

### Exercise 4: Configuration Manager

Build a tool to manage configuration files across multiple applications:

- List all configuration files in standard locations
- Edit configuration values interactively
- Validate configuration formats
- Create backups before modifications

### Exercise 5: Log Analyzer

Create a log file analysis tool that:

- Parses log files in common formats
- Filters logs by level, timestamp, or content
- Highlights errors and warnings
- Generates statistics about log entries
- Implements signal handling for interruption during processing of large files

By completing these exercises, you'll gain practical experience with the techniques and libraries covered in this chapter, reinforcing your understanding of CLI application development in Rust.
