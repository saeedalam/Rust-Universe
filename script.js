/**
 * Rust Universe Book Landing Page
 * Professional, high-performance JS for book landing page
 */

document.addEventListener("DOMContentLoaded", function () {
  // Header scroll effect
  const header = document.querySelector(".site-header");

  window.addEventListener("scroll", function () {
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });

  // Mobile menu toggle
  const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", function () {
      header.classList.toggle("menu-open");
    });
  }

  // Smooth scroll for navigation links
  const navLinks = document.querySelectorAll('a[href^="#"]');

  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      const href = this.getAttribute("href");

      if (href.length > 1) {
        e.preventDefault();
        const targetElement = document.querySelector(href);

        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop - 80,
            behavior: "smooth",
          });

          // Close mobile menu if open
          if (header.classList.contains("menu-open")) {
            header.classList.remove("menu-open");
          }
        }
      }
    });
  });

  // Code syntax highlighting for sample code blocks
  const codeBlocks = document.querySelectorAll(".code-block code");

  codeBlocks.forEach((block) => {
    // Add syntax highlighting classes
    highlightRustSyntax(block);
  });

  // Simple Rust syntax highlighter function
  function highlightRustSyntax(codeElement) {
    if (!codeElement) return;

    const text = codeElement.innerHTML;

    // Keywords
    const keywords = [
      "fn",
      "let",
      "match",
      "enum",
      "struct",
      "impl",
      "pub",
      "use",
      "mod",
      "trait",
      "self",
      "mut",
      "return",
      "if",
      "else",
      "for",
      "while",
      "loop",
      "in",
      "continue",
      "break",
    ];

    // Types
    const types = [
      "i32",
      "u32",
      "i64",
      "u64",
      "f32",
      "f64",
      "bool",
      "char",
      "str",
      "String",
      "Option",
      "Result",
      "Vec",
      "Box",
      "Rc",
      "Arc",
      "HashMap",
      "BTreeMap",
    ];

    // Values
    const values = ["true", "false", "None", "Some", "Ok", "Err"];

    let highlighted = text;

    // Highlight strings
    highlighted = highlighted.replace(
      /(".*?")/g,
      '<span class="rust-string">$1</span>'
    );

    // Highlight comments
    highlighted = highlighted.replace(
      /(\/\/.*$)/gm,
      '<span class="rust-comment">$1</span>'
    );

    // Highlight keywords
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b(${keyword})\\b`, "g");
      highlighted = highlighted.replace(
        regex,
        '<span class="rust-keyword">$1</span>'
      );
    });

    // Highlight types
    types.forEach((type) => {
      const regex = new RegExp(`\\b(${type})\\b`, "g");
      highlighted = highlighted.replace(
        regex,
        '<span class="rust-type">$1</span>'
      );
    });

    // Highlight values
    values.forEach((value) => {
      const regex = new RegExp(`\\b(${value})\\b`, "g");
      highlighted = highlighted.replace(
        regex,
        '<span class="rust-value">$1</span>'
      );
    });

    // Highlight function calls
    highlighted = highlighted.replace(
      /\b([a-zA-Z_][a-zA-Z0-9_]*)\(/g,
      '<span class="rust-function">$1</span>('
    );

    // Apply the highlighted code
    codeElement.innerHTML = highlighted;

    // Add CSS styles for syntax highlighting
    const style = document.createElement("style");
    style.textContent = `
      .rust-keyword { color: #0f172a; font-weight: bold; }
      .rust-type { color: #4338ca; }
      .rust-string { color: #15803d; }
      .rust-comment { color: #64748b; font-style: italic; }
      .rust-function { color: #0284c7; }
      .rust-value { color: #9333ea; }
    `;
    document.head.appendChild(style);
  }
});
