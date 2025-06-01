#!/bin/bash

# Remove chapter files from the root directory
echo "Removing original chapter files..."
rm -f Chapter-*.md

# Remove appendices files from the root directory
echo "Removing original appendices files..."
rm -f Appendices*.md

# Remove unused scripts
echo "Removing temporary scripts..."
rm -f copy-chapters.sh
rm -f copy-appendices.sh
rm -f fix-chapter-names.sh
rm -f create-appendices.sh
rm -f fix-quarto-syntax.sh
rm -f fix-fenced-divs.sh
rm -f copy-chapters-fixed.sh

# Remove other unnecessary files
echo "Removing other unnecessary files..."
rm -f book-outline-backup.md
rm -f README-enhanced.md
rm -f README-landingpage.md

echo "Cleanup completed!" 