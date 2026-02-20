import React, { useEffect, useRef, useState } from 'react';
import { Group, Rect } from 'react-konva';
import { Html } from 'react-konva-utils';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { TerminalData } from '@/types';

interface TerminalShapeProps {
    terminal: TerminalData;
    isSelected: boolean;
    onTransformEnd: () => void;
    mode: string;
}

const TerminalShape: React.FC<TerminalShapeProps> = ({ terminal, isSelected, onTransformEnd, mode }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        console.log('TerminalShape mounted:', terminal.id);
        if (!terminalRef.current) return;

        // Initialize xterm
        const term = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#1e1e1e',
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Connect WebSocket
        const ws = new WebSocket('ws://localhost:8000/ws/terminal');
        wsRef.current = ws;

        ws.onopen = () => {
            term.write('\r\n\x1b[32mConnected to backend terminal...\x1b[0m\r\n');
            // Initial resize
            fitAddon.fit();
            const { rows, cols } = term;
            ws.send(`\x01Resize:${rows}:${cols}`);
        };

        ws.onmessage = (event) => {
            term.write(event.data);
        };

        ws.onclose = () => {
            term.write('\r\n\x1b[31mConnection closed.\x1b[0m\r\n');
        };

        term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        // Handle resize properly
        const resizeObserver = new ResizeObserver(() => {
            try {
                fitAddon.fit();
                const { rows, cols } = term;
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(`\x01Resize:${rows}:${cols}`);
                }
            } catch (e) {
                // ignore
            }
        });

        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current);
        }

        setIsLoaded(true);

        return () => {
            resizeObserver.disconnect();
            ws.close();
            term.dispose();
        };
    }, []);

    // Re-fit when size changes via props
    useEffect(() => {
        if (isLoaded && fitAddonRef.current && wsRef.current && xtermRef.current) {
            // Small delay to ensure DOM is updated
            setTimeout(() => {
                try {
                    fitAddonRef.current?.fit();
                    const { rows, cols } = xtermRef.current!;
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(`\x01Resize:${rows}:${cols}`);
                    }
                } catch (e) {
                    // ignore
                }
            }, 100);
        }
    }, [terminal.width, terminal.height, isLoaded]);

    return (
        <Group
            id={terminal.id}
            x={terminal.x}
            y={terminal.y}
            width={terminal.width}
            height={terminal.height}
            draggable={mode === 'select'}
            onDragEnd={onTransformEnd}
        >
            {/* Background Rect for selection/hit detection */}
            <Rect
                width={terminal.width}
                height={terminal.height}
                fill="#1e1e1e"
                stroke={isSelected ? '#00A3FF' : 'transparent'}
                strokeWidth={2}
            />

            {/* HTML Overlay for xterm */}
            <Html>
                <div
                    ref={terminalRef}
                    style={{
                        width: terminal.width,
                        height: terminal.height,
                        overflow: 'hidden',
                        backgroundColor: '#1e1e1e',
                        pointerEvents: mode === 'select' && !isSelected ? 'none' : 'auto', // Allow interaction only when selected or forced
                    }}
                    onMouseDown={(e) => {
                        // Prevent Konva drag when interacting with terminal
                        e.stopPropagation();
                    }}
                />
            </Html>
        </Group>
    );
};

export default TerminalShape;
