# Git LeC - Collaborative Whiteboard

Git LeC is a simple yet powerful collaborative whiteboard application built with Next.js (Frontend) and FastAPI (Backend).

## Features

- **Drawing**: Rectangles, Circles, Lines, Arrows
- **Text**: Add and edit text on the canvas
- **Images**: Paste images from clipboard (`Ctrl+V`), move, and resize them
- **Manipulation**: Select, move, resize (using Transformer), and delete objects
- **History**: Undo/Redo support (`Ctrl+Z`, `Ctrl+Y` or `Ctrl+Shift+Z`)
- **Persistence**: Save/Load canvas state to/from JSON files
- **Shortcuts**: Keyboard shortcuts for efficient workflow (`R` for Rect, `C` for Circle, `T` for Text, `L` for Line, `A` for Arrow)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python (v3.11 or higher)
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/13miles/gitwhiteboard.git
   cd gitwhiteboard
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

## Development

To run the application in development mode, you need two terminals.

### 1. Run Backend Server
```bash
# In project root
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```
The backend API will be available at `http://localhost:8000`.

### 2. Run Frontend Server
```bash
# In project root (open a new terminal)
cd frontend
npm run dev
```
The application will be available at `http://localhost:3000`.

## Tech Stack

- **Frontend**: Next.js 14, React, Konva (react-konva), TailwindCSS
- **Backend**: FastAPI, Python
- **State Management**: React State & Refs
