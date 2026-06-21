#!/usr/bin/env python3
"""
Thesis File Watcher
Automatically rebuilds PDF when files change
"""

import sys
import time
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import subprocess

# Directories
ROOT_DIR = Path(__file__).parent.parent.parent
CONTENT_DIR = ROOT_DIR / "content"
BUILD_SCRIPT = Path(__file__).parent / "build.py"
BUILD_DIR = Path("/tmp/thesis-build")

# Colors
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

class ThesisWatcher(FileSystemEventHandler):
    """Watch for file changes and trigger rebuild"""

    def __init__(self):
        self.last_build = 0
        self.debounce_seconds = 2  # Wait 2 seconds before rebuilding

    def log(self, message, color=Colors.BLUE):
        timestamp = time.strftime("%H:%M:%S")
        print(f"{color}{Colors.BOLD}[{timestamp}]{Colors.END} {message}")

    def should_rebuild(self, path):
        """Check if file change should trigger rebuild"""
        # Watch .md, .tex, .bib, and .yaml files
        extensions = {'.md', '.tex', '.bib', '.yaml', '.yml'}
        if Path(path).suffix not in extensions:
            return False

        # Ignore build directory
        if '/tmp/thesis-build' in str(path):
            return False

        # Debounce: don't rebuild too frequently
        now = time.time()
        if now - self.last_build < self.debounce_seconds:
            return False

        return True

    def trigger_build(self):
        """Trigger a rebuild"""
        self.log("=" * 60, Colors.YELLOW)
        self.log("File changed, rebuilding...", Colors.YELLOW)
        self.log("=" * 60, Colors.YELLOW)

        try:
            result = subprocess.run(
                [sys.executable, str(BUILD_SCRIPT)],
                capture_output=False,
                text=True
            )

            if result.returncode == 0:
                self.log("✓ Rebuild successful! 🎉", Colors.GREEN)
            else:
                self.log("✗ Rebuild failed", Colors.RED)

        except Exception as e:
            self.log(f"Error during rebuild: {e}", Colors.RED)

        self.last_build = time.time()

    def on_modified(self, event):
        """Called when a file is modified"""
        if event.is_directory:
            return

        if self.should_rebuild(event.src_path):
            file_name = Path(event.src_path).name
            self.log(f"📝 {file_name} changed", Colors.BLUE)
            self.trigger_build()

    def on_created(self, event):
        """Called when a file is created"""
        if event.is_directory:
            return

        if self.should_rebuild(event.src_path):
            file_name = Path(event.src_path).name
            self.log(f"📝 {file_name} created", Colors.BLUE)
            self.trigger_build()

def main():
    """Main watch function"""
    print(f"\n{Colors.BOLD}{Colors.GREEN}{'=' * 60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.GREEN}Thesis Watcher Started 👀{Colors.END}")
    print(f"{Colors.BOLD}{Colors.GREEN}{'=' * 60}{Colors.END}\n")
    print(f"Watching: {Colors.YELLOW}{CONTENT_DIR}{Colors.END}")
    print(f"Press {Colors.RED}Ctrl+C{Colors.END} to stop\n")

    # Initial build
    watcher = ThesisWatcher()
    watcher.log("Running initial build...", Colors.BLUE)
    watcher.trigger_build()

    # Start watching
    event_handler = watcher
    observer = Observer()
    observer.schedule(event_handler, str(CONTENT_DIR), recursive=True)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Stopping watcher...{Colors.END}")
        observer.stop()

    observer.join()
    print(f"{Colors.GREEN}Goodbye! 👋{Colors.END}\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
