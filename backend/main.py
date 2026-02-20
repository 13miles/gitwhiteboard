import os
import pty
import struct
import fcntl
import termios
import subprocess
import asyncio
import json
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
    shell = os.environ.get("SHELL", "/bin/bash")
    p = subprocess.Popen(
        [shell],
        stdin=slave_fd,
        stdout=slave_fd,
        stderr=slave_fd,
        close_fds=True,
        cwd=os.path.expanduser("~"),  # 홈 디렉토리에서 시작
        env=os.environ.copy()
    )

    os.close(slave_fd)

    # PTY → WebSocket: bytes로 전송
    async def read_from_pty():
        loop = asyncio.get_event_loop()
        while True:
            try:
                data = await loop.run_in_executor(None, lambda: os.read(master_fd, 4096))
                if not data:
                    break
                # bytes를 그대로 전송 (latin-1로 안전하게 디코딩)
                await websocket.send_text(data.decode("utf-8", errors="replace"))
            except OSError:
                break
            except Exception:
                break

    # WebSocket → PTY
    async def read_from_ws():
        try:
            while True:
                data = await websocket.receive_text()

                # Resize 명령: \x01Resize:rows:cols
                if data.startswith("\x01Resize:"):
                    try:
                        _, rows, cols = data.split(":")
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

    read_task = None
    write_task = None
    try:
        read_task = asyncio.create_task(read_from_pty())
        write_task = asyncio.create_task(read_from_ws())
        await asyncio.wait([read_task, write_task], return_when=asyncio.FIRST_COMPLETED)
    finally:
        if read_task: read_task.cancel()
        if write_task: write_task.cancel()
        try:
            os.close(master_fd)
        except OSError:
            pass
        if p.poll() is None:
            p.terminate()
            p.wait()
