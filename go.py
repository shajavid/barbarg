import subprocess
import sys
import webbrowser
import time

def run_processes():
    try:
        # Define the commands
        commands = [
            ["python", "run.py"],
            ["celery", "-A", "app.celery", "worker", "--pool=threads", "-l", "info", "--concurrency=100"],
            ["celery", "-A", "app.celery", "worker", "--pool=threads", "-l", "info", "--concurrency=100"],
            ["celery", "-A", "app.celery", "worker", "--pool=threads", "-l", "info", "--concurrency=100"],
            ["celery", "-A", "app.celery", "worker", "--pool=threads", "-l", "info", "--concurrency=100"],
            ["celery", "-A", "app.celery", "worker", "--pool=threads", "-l", "info", "--concurrency=100"] 
        ]

        # Start processes
        processes = [subprocess.Popen(cmd, stdout=sys.stdout, stderr=sys.stderr) for cmd in commands]

        # Wait for all processes to complete
        for process in processes:
            process.wait()

    except KeyboardInterrupt:
        # Handle graceful termination on Ctrl+C
        print("\nTerminating processes...")
        for process in processes:
            process.terminate()

if __name__ == "__main__":
    run_processes()
    
    # Wait for a few seconds to ensure the server starts
    time.sleep(5)

    # Open 127.0.0.1:5000 in the default browser
    webbrowser.open("http://127.0.0.1:5000")

   
