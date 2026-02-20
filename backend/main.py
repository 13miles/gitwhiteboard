import os
import pty
import select
import struct
import fcntl
import termios
import subprocess
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.websocket("/ws/terminal")
async def websocket_terminal(websocket: WebSocket):
    await websocket.accept()
    
    # Create PTY
    master_fd, slave_fd = pty.openpty()
    
    # Start shell process
    shell = os.environ.get("SHELL", "bash")
    p = subprocess.Popen(
        [shell],
        stdin=slave_fd,
        stdout=slave_fd,
        stderr=slave_fd,
        close_fds=True,
        cwd=os.getcwd(), # Start in current directory
        env=os.environ.copy() # Inherit environment
    )
    
    os.close(slave_fd)
    
    # Async helper to read from PTY
    async def read_from_pty():
        loop = asyncio.get_event_loop()
        while True:
            try:
                # Read from PTY non-blocking
                data = await loop.run_in_executor(None, lambda: os.read(master_fd, 1024))
                if not data:
                    break
                try:
                    await websocket.send_text(data.decode())
                except Exception:
                    # WebSocket might be closed
                    break
            except OSError:
                break

    # Async helper to read from WebSocket
    async def read_from_ws():
        try:
            while True:
                data = await websocket.receive_text()
                
                # Check for resize command
                if data.startswith("\x01Resize:"):
                    try:
                        _, rows, cols = data.split(":")
                        # Set terminal size
                        winsize = struct.pack("HHHH", int(rows), int(cols), 0, 0)
                        fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
                    except Exception:
                        pass
                    continue
                
                os.write(master_fd, data.encode())
        except WebSocketDisconnect:
            pass
        except Exception:
            pass

    # Run both tasks
    try:
        read_task = asyncio.create_task(read_from_pty())
        write_task = asyncio.create_task(read_from_ws())
        await asyncio.wait([read_task, write_task], return_when=asyncio.FIRST_COMPLETED)
    finally:
        # Cleanup
        try:
            read_task.cancel()
            write_task.cancel()
        except:
            pass
        
        os.close(master_fd)
        if p.poll() is None:
            p.terminate()
            p.wait()
