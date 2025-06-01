# Chapter 35: Build Systems and Tooling

## Introduction

In modern software development, the tools and systems that support the development process are just as important as the language itself. Rust excels not only as a language but also through its rich ecosystem of build tools, development aids, and continuous integration support. This chapter explores the advanced tooling that makes Rust development productive, maintainable, and reliable.

Beyond the basics of Cargo that we covered in the previous chapter, Rust offers a sophisticated suite of tools for customizing builds, ensuring code quality, debugging applications, and automating workflows. Understanding these tools is essential for scaling your Rust projects, supporting diverse platforms, and maintaining high standards of code quality.

In this chapter, we'll explore custom build scripts, cross-compilation strategies, code quality tools like rustfmt and clippy, debugging techniques, and continuous integration practices. We'll also develop a practical project to create a cross-platform build pipeline that can target multiple operating systems and architectures.

By the end of this chapter, you'll have a comprehensive understanding of Rust's tooling ecosystem and the skills to implement sophisticated build and development workflows for your Rust projects.

## Custom Build Scripts

(Custom build scripts section content goes here)

## Build Script Debugging

(Build script debugging section content goes here)

## Conditional Compilation

(Conditional compilation section content goes here)

## Rust Targets and Architectures

(Rust targets and architectures section content goes here)

## Cross-Compilation

(Cross-compilation section content goes here)

## Cargo Extensions

(Cargo extensions section content goes here)

## IDE Integration

(IDE integration section content goes here)

## Code Formatting with rustfmt

(Code formatting with rustfmt section content goes here)

## Linting with clippy

(Linting with clippy section content goes here)

## Debugging Tools

(Debugging tools section content goes here)

## Continuous Integration

(Continuous integration section content goes here)

## Project: Cross-Platform Build System

In this project, we'll develop a cross-platform build pipeline that can compile and package a Rust application for multiple operating systems and architectures. This practical exercise will demonstrate how to leverage Rust's tooling to support diverse deployment targets from a single codebase.

We'll create a small web server application and configure it to build for Linux, macOS, and Windows on different CPU architectures. The project will include automated testing, artifact creation, and release management.

### Project Requirements

Our build system will:

1. Compile the application for multiple target platforms
2. Run appropriate tests for each platform
3. Package the application with platform-specific considerations
4. Generate release artifacts with proper versioning
5. Provide a simple way to add new target platforms

### Setting Up the Project

Let's start by creating a new Rust project for our simple web server:

```bash
cargo new --bin cross-platform-server
cd cross-platform-server
```

We'll use a minimal web server based on the `axum` framework. Update `Cargo.toml`:

```toml
[package]
name = "cross-platform-server"
version = "0.1.0"
edition = "2021"
description = "A cross-platform web server example"
license = "MIT OR Apache-2.0"

[dependencies]
axum = "0.6"
tokio = { version = "1.28", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tower-http = { version = "0.4", features = ["cors"] }
tracing = "0.1"
tracing-subscriber = "0.3"

[target.'cfg(windows)'.dependencies]
winapi = { version = "0.3", features = ["winuser"] }

[target.'cfg(unix)'.dependencies]
libc = "0.2"

[dev-dependencies]
reqwest = { version = "0.11", features = ["json"] }
```

Next, let's create a basic web server in `src/main.rs`:

```rust
use axum::{
    routing::{get, post},
    Router, Json, extract::Path,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Debug, Serialize)]
struct ServerInfo {
    version: String,
    os: String,
    arch: String,
}

#[derive(Debug, Deserialize)]
struct Message {
    content: String,
}

#[tokio::main]
async fn main() {
    // Initialize tracing for logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Create a new router with our routes
    let app = Router::new()
        .route("/", get(root))
        .route("/info", get(info))
        .route("/echo/:message", get(echo))
        .route("/message", post(receive_message));

    // Set up the address to listen on
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    tracing::info!("Server listening on {}", addr);

    // Start the server
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

async fn root() -> &'static str {
    "Welcome to the cross-platform server!"
}

async fn info() -> Json<ServerInfo> {
    Json(ServerInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    })
}

async fn echo(Path(message): Path<String>) -> String {
    format!("Echo: {}", message)
}

async fn receive_message(Json(message): Json<Message>) -> String {
    format!("Received: {}", message.content)
}
```

### Creating Platform-Specific Features

Let's add some platform-specific code to demonstrate conditional compilation. Create a new file `src/platform.rs`:

```rust
// Platform-specific functionality

// Common interface
pub fn platform_name() -> &'static str {
    std::env::consts::OS
}

pub fn get_temp_directory() -> std::path::PathBuf {
    #[cfg(windows)]
    {
        // Windows-specific code
        use std::ffi::OsString;
        use std::os::windows::ffi::OsStringExt;
        use winapi::um::fileapi::GetTempPathW;
        let mut buffer = [0u16; 260]; // MAX_PATH
        unsafe {
            let len = GetTempPathW(buffer.len() as u32, buffer.as_mut_ptr());
            if len > 0 {
                let path = OsString::from_wide(&buffer[0..len as usize]);
                return std::path::PathBuf::from(path);
            }
        }
        // Fallback
        std::env::temp_dir()
    }

    #[cfg(unix)]
    {
        // Unix-specific code (Linux, macOS, etc.)
        std::env::temp_dir()
    }

    #[cfg(not(any(windows, unix)))]
    {
        // Fallback for other platforms
        std::env::temp_dir()
    }
}

pub fn platform_info() -> String {
    #[cfg(target_os = "windows")]
    let info = "Windows platform";

    #[cfg(target_os = "macos")]
    let info = "macOS platform";

    #[cfg(target_os = "linux")]
    let info = "Linux platform";

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    let info = "Unknown platform";

    format!("{} on {} architecture", info, std::env::consts::ARCH)
}
```

Update `src/main.rs` to use this module:

```rust
// Add at the top with other imports
mod platform;

// Add a new route in the router setup
.route("/platform", get(platform_info))

// Add the new handler function
async fn platform_info() -> String {
    format!(
        "Running on {} with temp directory: {:?}",
        platform::platform_info(),
        platform::get_temp_directory()
    )
}
```

### Setting Up the Build System

Now, let's create a build script that will help us customize the build process. Create a new file `build.rs` in the project root:

```rust
use std::env;
use std::fs;
use std::path::Path;
use std::process::Command;

fn main() {
    // Get build information
    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap_or_else(|_| "unknown".to_string());
    let target_arch = env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_else(|_| "unknown".to_string());

    println!("cargo:rustc-env=BUILD_TARGET_OS={}", target_os);
    println!("cargo:rustc-env=BUILD_TARGET_ARCH={}", target_arch);

    // Get Git commit hash if available
    let git_hash = Command::new("git")
        .args(&["rev-parse", "--short", "HEAD"])
        .output()
        .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
        .unwrap_or_else(|_| "unknown".to_string());

    println!("cargo:rustc-env=BUILD_GIT_HASH={}", git_hash);

    // Create a build_info.rs file with the build information
    let out_dir = env::var("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("build_info.rs");

    let build_info = format!(
        r#"
        /// Information about the build environment.
        pub struct BuildInfo {{
            /// The operating system for which the binary was built.
            pub target_os: &'static str,
            /// The architecture for which the binary was built.
            pub target_arch: &'static str,
            /// The Git commit hash at build time.
            pub git_hash: &'static str,
            /// The time when the binary was built.
            pub build_time: &'static str,
        }}

        /// Returns information about the current build.
        pub fn get_build_info() -> BuildInfo {{
            BuildInfo {{
                target_os: "{}",
                target_arch: "{}",
                git_hash: "{}",
                build_time: "{}",
            }}
        }}
        "#,
        target_os,
        target_arch,
        git_hash,
        chrono::Utc::now().to_rfc3339()
    );

    fs::write(dest_path, build_info).unwrap();

    // Enable link-time optimization in release builds
    if env::var("PROFILE").unwrap() == "release" {
        println!("cargo:rustc-cfg=release");
        // Platform-specific optimizations
        if target_os == "windows" {
            println!("cargo:rustc-link-arg=/LTCG");
        } else {
            // Common to Unix platforms
            println!("cargo:rustc-link-arg=-flto");
        }
    }

    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=Cargo.toml");
    println!("cargo:rerun-if-changed=src/");
}
```

You'll need to add the `chrono` crate to your build dependencies in `Cargo.toml`:

```toml
[build-dependencies]
chrono = "0.4"
```

Now, let's create a module to use the generated build information. Create `src/build_info.rs`:

```rust
//! Module containing build information generated during compilation.

// Include the generated build_info.rs file
include!(concat!(env!("OUT_DIR"), "/build_info.rs"));
```

Update `src/main.rs` to use this module:

```rust
// Add at the top with other imports
mod build_info;

// Add a new route in the router setup
.route("/build", get(build_info))

// Add the new handler function
async fn build_info() -> Json<build_info::BuildInfo> {
    Json(build_info::get_build_info())
}
```

### Creating a Cross-Platform Build Script

Now, let's create a shell script to build our application for multiple platforms. Create a file called `cross-build.sh` in the project root:

```bash
#!/usr/bin/env bash
set -e

# Ensure script fails on any error
set -euo pipefail

# Directory for build artifacts
ARTIFACTS_DIR="./artifacts"
mkdir -p "$ARTIFACTS_DIR"

# Version from Cargo.toml
VERSION=$(grep -m1 'version =' Cargo.toml | cut -d '"' -f2)
echo "Building version $VERSION"

# Function to build for a specific target
build_target() {
  local target=$1
  local binary_name=$2
  local target_dir="target/$target/release"

  echo "Building for $target..."

  if [[ "$target" == *"windows"* ]]; then
    binary_name="$binary_name.exe"
  fi

  # Build the binary
  cargo build --release --target "$target"

  # Create a directory for this target's artifacts
  local artifact_dir="$ARTIFACTS_DIR/$target"
  mkdir -p "$artifact_dir"

  # Copy the binary to the artifacts directory
  cp "$target_dir/$binary_name" "$artifact_dir/"

  # Create a tarball or zip file
  if [[ "$target" == *"windows"* ]]; then
    (cd "$ARTIFACTS_DIR" && zip -r "${binary_name%.exe}-$target-$VERSION.zip" "$target")
  else
    (cd "$ARTIFACTS_DIR" && tar -czf "$binary_name-$target-$VERSION.tar.gz" "$target")
  fi

  echo "Build for $target completed."
}

# Build for Linux (x86_64)
build_target "x86_64-unknown-linux-gnu" "cross-platform-server"

# Build for macOS (x86_64)
build_target "x86_64-apple-darwin" "cross-platform-server"

# Build for Windows (x86_64)
build_target "x86_64-pc-windows-gnu" "cross-platform-server"

echo "All builds completed successfully!"
echo "Artifacts available in $ARTIFACTS_DIR"
```

Make the script executable:

```bash
chmod +x cross-build.sh
```

### Setting Up GitHub Actions for CI

Let's create a GitHub Actions workflow to automate our build process. Create a directory `.github/workflows` and add a file `cross-platform-build.yml`:

```yaml
name: Cross-Platform Build

on:
  push:
    branches: [main]
    tags: ["v*"]
  pull_request:
    branches: [main]

jobs:
  build:
    name: Build for ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        include:
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            binary_extension: ""
          - os: macos-latest
            target: x86_64-apple-darwin
            binary_extension: ""
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            binary_extension: ".exe"

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: ${{ matrix.target }}
          override: true

      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            target
          key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}

      - name: Build
        uses: actions-rs/cargo@v1
        with:
          command: build
          args: --release --target ${{ matrix.target }}

      - name: Run tests
        uses: actions-rs/cargo@v1
        with:
          command: test
          args: --target ${{ matrix.target }}

      - name: Package binary
        shell: bash
        run: |
          BINARY_NAME=cross-platform-server${{ matrix.binary_extension }}
          VERSION=$(grep -m1 'version =' Cargo.toml | cut -d '"' -f2)

          # Create artifacts directory
          mkdir -p artifacts

          # Copy binary to artifacts
          cp target/${{ matrix.target }}/release/$BINARY_NAME artifacts/

          # Create archive based on OS
          cd artifacts
          if [[ "${{ matrix.os }}" == "windows-latest" ]]; then
            7z a ../cross-platform-server-${{ matrix.target }}-$VERSION.zip $BINARY_NAME
          else
            tar -czf ../cross-platform-server-${{ matrix.target }}-$VERSION.tar.gz $BINARY_NAME
          fi
          cd ..

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: cross-platform-server-${{ matrix.target }}
          path: |
            cross-platform-server-${{ matrix.target }}-*.zip
            cross-platform-server-${{ matrix.target }}-*.tar.gz

      - name: Create Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/v')
        with:
          files: |
            cross-platform-server-${{ matrix.target }}-*.zip
            cross-platform-server-${{ matrix.target }}-*.tar.gz
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Creating a Build Configuration File

To make our build system even more flexible, let's create a configuration file that defines our build targets. Create a file named `build-config.json`:

```json
{
  "app_name": "cross-platform-server",
  "version": "0.1.0",
  "targets": [
    {
      "name": "linux-x86_64",
      "target": "x86_64-unknown-linux-gnu",
      "os": "linux",
      "arch": "x86_64",
      "file_extension": "",
      "archive_format": "tar.gz"
    },
    {
      "name": "macos-x86_64",
      "target": "x86_64-apple-darwin",
      "os": "macos",
      "arch": "x86_64",
      "file_extension": "",
      "archive_format": "tar.gz"
    },
    {
      "name": "windows-x86_64",
      "target": "x86_64-pc-windows-gnu",
      "os": "windows",
      "arch": "x86_64",
      "file_extension": ".exe",
      "archive_format": "zip"
    }
  ],
  "build_options": {
    "include_debug_info": true,
    "strip_binaries": true,
    "optimize_level": 3,
    "lto": true
  },
  "package_files": [
    {
      "source": "README.md",
      "destination": "README.md"
    },
    {
      "source": "LICENSE",
      "destination": "LICENSE"
    }
  ]
}
```

Now let's update our build script to use this configuration. Create a new file `build.js` (you'll need Node.js installed):

```javascript
#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Load build configuration
const config = JSON.parse(fs.readFileSync("build-config.json", "utf8"));

// Create artifacts directory
const artifactsDir = path.join(__dirname, "artifacts");
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir);
}

// Build all targets
for (const target of config.targets) {
  console.log(`Building for ${target.name} (${target.target})...`);

  // Set up build options
  const buildOpts = [];
  buildOpts.push("--release");
  buildOpts.push("--target", target.target);

  if (config.build_options.optimize_level) {
    buildOpts.push(
      "--",
      `-C`,
      `opt-level=${config.build_options.optimize_level}`
    );
  }

  if (config.build_options.lto) {
    buildOpts.push(`-C`, `lto=true`);
  }

  // Execute the build
  try {
    execSync(`cargo build ${buildOpts.join(" ")}`, { stdio: "inherit" });
  } catch (error) {
    console.error(`Error building for ${target.name}: ${error.message}`);
    process.exit(1);
  }

  // Create target artifact directory
  const targetArtifactDir = path.join(artifactsDir, target.name);
  if (!fs.existsSync(targetArtifactDir)) {
    fs.mkdirSync(targetArtifactDir);
  }

  // Copy binary
  const binaryName = `${config.app_name}${target.file_extension}`;
  const binarySource = path.join(
    __dirname,
    "target",
    target.target,
    "release",
    binaryName
  );
  const binaryDest = path.join(targetArtifactDir, binaryName);

  fs.copyFileSync(binarySource, binaryDest);
  console.log(`Copied binary to ${binaryDest}`);

  // Copy additional files
  for (const file of config.package_files) {
    const sourcePath = path.join(__dirname, file.source);
    const destPath = path.join(targetArtifactDir, file.destination);

    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied ${file.source} to ${destPath}`);
  }

  // Create archive
  const archiveName = `${config.app_name}-${target.name}-${config.version}`;
  if (target.archive_format === "zip") {
    execSync(`cd ${artifactsDir} && zip -r ${archiveName}.zip ${target.name}`, {
      stdio: "inherit",
    });
  } else {
    execSync(
      `cd ${artifactsDir} && tar -czf ${archiveName}.tar.gz ${target.name}`,
      { stdio: "inherit" }
    );
  }

  console.log(`Created archive for ${target.name}`);
}

console.log("All builds completed successfully!");
```

Make the script executable:

```bash
chmod +x build.js
```

### Extending the Build System

To make our build system more robust, let's add support for running tests across platforms and creating a release notes file. Update the `build.js` script:

```javascript
// Add after loading the config
const version = config.version;
const releaseNotesPath = path.join(artifactsDir, `RELEASE_NOTES-${version}.md`);

// Create release notes
function generateReleaseNotes() {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  let notes = `# Release Notes for ${config.app_name} v${version}\n\n`;
  notes += `Released on ${dateStr}\n\n`;

  // Try to get Git commit information
  try {
    const gitLog = execSync(
      'git log -n 10 --pretty=format:"* %s" --no-merges'
    ).toString();
    notes += `## Recent Changes\n\n${gitLog}\n\n`;
  } catch (error) {
    notes += `## Changes\n\nNo Git history available.\n\n`;
  }

  notes += `## Supported Platforms\n\n`;
  for (const target of config.targets) {
    notes += `* ${target.os} (${target.arch})\n`;
  }

  fs.writeFileSync(releaseNotesPath, notes);
  console.log(`Generated release notes at ${releaseNotesPath}`);
}

// Add function to run tests
function runTests(target) {
  console.log(`Running tests for ${target.name}...`);
  try {
    execSync(`cargo test --target ${target.target}`, { stdio: "inherit" });
    return true;
  } catch (error) {
    console.error(`Tests failed for ${target.name}: ${error.message}`);
    return false;
  }
}

// Call these functions in the main build flow
generateReleaseNotes();

// After the for-loop for building targets, add:
let allTestsPassed = true;
if (process.argv.includes("--test")) {
  console.log("\nRunning tests for all targets...");
  for (const target of config.targets) {
    const testsPassed = runTests(target);
    if (!testsPassed) {
      allTestsPassed = false;
    }
  }

  if (!allTestsPassed) {
    console.error("Some tests failed!");
    process.exit(1);
  }

  console.log("All tests passed!");
}

// Copy release notes to each target directory
for (const target of config.targets) {
  const targetReleaseNotesPath = path.join(
    artifactsDir,
    target.name,
    "RELEASE_NOTES.md"
  );
  fs.copyFileSync(releaseNotesPath, targetReleaseNotesPath);
}
```

### Using the Build System

Now you can use your build system in various ways:

1. For local development and testing:

   ```bash
   cargo build
   cargo test
   ```

2. To build for all platforms using the shell script:

   ```bash
   ./cross-build.sh
   ```

3. To build with the Node.js script (which uses the config file):

   ```bash
   ./build.js
   ```

4. To build and run tests:

   ```bash
   ./build.js --test
   ```

5. For continuous integration, push your code to GitHub, and the GitHub Actions workflow will automatically build for all platforms.

### Conclusion

In this project, we've created a comprehensive cross-platform build system for Rust applications that:

1. Compiles for multiple target platforms using Rust's cross-compilation capabilities
2. Handles platform-specific code and dependencies
3. Runs tests across all target platforms
4. Packages the application with appropriate formats for each OS
5. Generates release artifacts with proper versioning and documentation
6. Integrates with GitHub Actions for continuous integration

This build system demonstrates many of the concepts covered in this chapter, from custom build scripts and conditional compilation to cross-compilation and continuous integration. By adopting similar approaches in your own Rust projects, you can create maintainable, portable applications that work consistently across diverse computing environments.

## Summary

In this chapter, we've explored the rich tooling ecosystem that supports Rust development. We've covered:

- **Custom build scripts**: Extending the build process with custom logic in `build.rs` files
- **Build script debugging**: Troubleshooting and optimizing your build scripts
- **Conditional compilation**: Using features and cfg attributes to adapt code for different environments
- **Rust targets and architectures**: Understanding Rust's support for diverse platforms
- **Cross-compilation**: Building Rust code for different operating systems and CPU architectures
- **Cargo extensions**: Enhancing Cargo with plugins and customizations
- **IDE integration**: Setting up effective development environments for Rust
- **Code formatting with rustfmt**: Maintaining consistent code style
- **Linting with clippy**: Catching common mistakes and improving code quality
- **Debugging tools**: Finding and fixing issues in Rust programs
- **Continuous integration**: Automating build, test, and deployment processes

We've also created a practical cross-platform build system that ties these concepts together, demonstrating how to create a robust development workflow for Rust applications targeting multiple platforms.

Rust's tooling is one of its greatest strengths as a language ecosystem. The combination of Cargo, rustfmt, clippy, and the broader collection of development tools provides a cohesive, productive environment for building reliable software. By mastering these tools, you can maximize your effectiveness as a Rust developer and create high-quality applications that work consistently across diverse computing environments.

## Exercises

1. **Custom Build Task**: Create a `build.rs` script that generates a Rust module containing system information available at compile time.

2. **Cross-Platform Library**: Design a small library crate that provides consistent file path handling across Windows, macOS, and Linux platforms.

3. **Conditional Features**: Implement a crate with at least three feature flags that enable platform-specific optimizations for different operating systems.

4. **Target-Specific Dependencies**: Create a project that uses different dependencies based on the target platform (e.g., WinAPI for Windows and libc for Unix).

5. **GitHub Actions Workflow**: Set up a GitHub Actions workflow that builds, tests, and lints a Rust project on multiple platforms.

6. **Custom Cargo Command**: Develop a Cargo extension that provides a custom subcommand for your workflow.

7. **VS Code Integration**: Configure a Rust project with VS Code tasks and launch configurations for building, testing, and debugging.

8. **Build Matrix**: Create a build matrix for a Rust application that targets at least six different platform combinations.

9. **Debug Optimization**: Set up separate debug and release profiles with different optimization settings, and benchmark the performance difference.

10. **Documentation Pipeline**: Create a workflow that automatically builds and publishes documentation for your Rust project.

## Further Reading

- [The Cargo Book](https://doc.rust-lang.org/cargo/) - Official documentation for Cargo
- [Rust Forge](https://forge.rust-lang.org/) - Information about Rust's development tools and practices
- [The rustup Book](https://rust-lang.github.io/rustup/) - Guide to Rust's toolchain manager
- [GitHub Actions for Rust](https://github.com/actions-rs) - Collection of GitHub Actions for Rust projects
- [Cross-compilation Guide](https://rust-lang.github.io/rustup/cross-compilation.html) - Official guide to cross-compiling Rust
- [Clippy Documentation](https://doc.rust-lang.org/clippy/) - Guide to Rust's linter
- [rustfmt Documentation](https://rust-lang.github.io/rustfmt/) - Guide to Rust's code formatter
- [Rust Debugging Guide](https://rustwiki.org/en/book/appendix-04-useful-development-tools.html) - Overview of Rust debugging tools
- [Rust Build Scripts Documentation](https://doc.rust-lang.org/cargo/reference/build-scripts.html) - Guide to custom build scripts

In the next chapter, we'll explore Embedded Programming in Rust, where we'll apply many of these build and tooling concepts to the constrained environment of embedded devices.
