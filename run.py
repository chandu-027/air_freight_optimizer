import subprocess
import webbrowser
import time
import sys
import os

def main():
    print("==================================================")
    print("Starting AeroPack 3D: Air Freight Space Optimizer")
    print("==================================================")
    
    # Use the current Python executable to run uvicorn
    # Bind to 0.0.0.0 to listen on all interfaces (IPv4/IPv6 localhost compatibility)
    cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
    
    # Start the server subprocess
    proc = subprocess.Popen(cmd)
    
    # Wait a moment to ensure the server process initialized
    time.sleep(1.5)
    
    url = "http://localhost:8000"
    print(f"\nLaunching your default web browser to: {url}")
    print("Press CTRL+C in this terminal window to stop the server.\n")
    
    try:
        # Automatically open the browser
        webbrowser.open(url)
        # Keep launcher running until uvicorn exits or is terminated
        proc.wait()
    except KeyboardInterrupt:
        print("\nStopping AeroPack 3D Web Server...")
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()
        print("Server stopped successfully.")

if __name__ == "__main__":
    main()
