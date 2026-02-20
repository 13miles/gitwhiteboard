import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Group, Rect } from 'react-konva';
import { Html } from 'react-konva-utils';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';
import { TerminalData } from '@/types';

interface TerminalShapeProps {
    terminal: TerminalData;
    isSelected: boolean;
    onTransformEnd: () => void;
    mode: string;
    shapeRef?: (node: Konva.Group | null) => void;
    onClick?: (e: KonvaEventObject<MouseEvent>) => void;
}

const TerminalShape: React.FC<TerminalShapeProps> = ({ terminal, isSelected, onTransformEnd, mode, shapeRef, onClick }) => {
    // div가 실제로 DOM에 붙었을 때 state로 추적
    const [terminalEl, setTerminalEl] = useState<HTMLDivElement | null>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // ref callback: div가 DOM에 mount/unmount 될 때마다 호출됨
    const refCallback = useCallback((node: HTMLDivElement | null) => {
        setTerminalEl(node);
    }, []);

    // terminalEl이 준비됐을 때 xterm + WebSocket 초기화
    // terminalEl이 준비됐을 때 xterm + WebSocket 초기화
    useEffect(() => {
        if (!terminalEl) return;
        if (xtermRef.current) return; // 이미 초기화됨

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

        term.open(terminalEl);
        console.log('[TerminalShape] xterm opened');

        // open 직후 바로 fit하면 싸이즈가 0일 수 있으므로 requestAnimationFrame 이후에 fit
        requestAnimationFrame(() => {
            try {
                fitAddon.fit();
                console.log('[TerminalShape] fitAddon.fit() called');
            } catch (e) {
                console.error('[TerminalShape] fitAddon.fit() failed:', e);
            }
        });

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Connect WebSocket
        // Revert to direct connection (Next.js proxy didn't work for WS with Turbopack)
        const wsUrl = `ws://${window.location.hostname}:8000/ws/terminal`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            term.write('\r\n\x1b[32mConnected to backend terminal...\x1b[0m\r\n');
            // Initial resize
            try {
                fitAddon.fit();
                const { rows, cols } = term;
                if (rows > 0 && cols > 0) {
                    ws.send(`\x01Resize:${rows}:${cols}`);
                }
            } catch (_) { }
        };

        ws.onmessage = (event) => {
            term.write(event.data);
        };

        ws.onclose = () => {
            term.write('\r\n\x1b[31mConnection closed.\x1b[0m\r\n');
        };

        ws.onerror = (err) => {
            console.error('[TerminalShape] WebSocket onerror:', err);
            term.write('\r\n\x1b[31mWebSocket error. Is backend running?\x1b[0m\r\n');
        };

        term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            // Safety check: only fit if terminal element is attached and has size
            if (!terminalEl || terminalEl.clientWidth === 0 || terminalEl.clientHeight === 0) return;

            // Debounce or requestAnimationFrame to avoid "ResizeObserver loop limit exceeded"
            window.requestAnimationFrame(() => {
                try {
                    fitAddon.fit();
                    const { rows, cols } = term;
                    if (ws.readyState === WebSocket.OPEN && rows > 0 && cols > 0) {
                        ws.send(`\x01Resize:${rows}:${cols}`);
                    }
                } catch (_) { }
            });
        });

        resizeObserver.observe(terminalEl);
        setIsLoaded(true);

        return () => {
            resizeObserver.disconnect();
            ws.close();
            term.dispose();
            xtermRef.current = null;
        };
    }, [terminalEl]);

    // 선택 시 xterm 포커스
    useEffect(() => {
        if (isSelected && xtermRef.current) {
            setTimeout(() => xtermRef.current?.focus(), 50);
        }
    }, [isSelected]);

    // Re-fit when size changes via props
    useEffect(() => {
        if (isLoaded && fitAddonRef.current && wsRef.current && xtermRef.current) {
            // Small delay to ensure DOM is updated
            setTimeout(() => {
                try {
                    fitAddonRef.current?.fit();
                    const rows = xtermRef.current?.rows ?? 0;
                    const cols = xtermRef.current?.cols ?? 0;
                    if (wsRef.current?.readyState === WebSocket.OPEN && rows > 0 && cols > 0) {
                        wsRef.current?.send(`\x01Resize:${rows}:${cols}`);
                    }
                } catch (_) { }
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
            ref={shapeRef}
            onClick={onClick}
        >
            {/* Background Rect for selection/hit detection */}
            <Rect
                width={terminal.width}
                height={terminal.height}
                fill="#1e1e1e"
                stroke={isSelected ? '#eab308' : '#555'}
                strokeWidth={isSelected ? 2 : 1}
                cornerRadius={4}
            />
            <Html
                divProps={{
                    style: {
                        width: `${terminal.width}px`,
                        height: `${terminal.height}px`,
                        overflow: 'hidden',
                        borderRadius: '4px',
                        // 선택됐거나 select 모드가 아닐 때 pointerEvents 활성화
                        pointerEvents: mode === 'select' && !isSelected ? 'none' : 'auto',
                    },
                }}
            >
                <div
                    ref={refCallback}
                    style={{
                        width: '100%',
                        height: '100%',
                        background: '#1e1e1e',
                    }}
                />
            </Html>
        </Group>
    );
};

export default TerminalShape;
