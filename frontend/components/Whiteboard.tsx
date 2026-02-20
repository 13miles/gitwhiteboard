'use client';

import dynamic from 'next/dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Transformer, Line as KonvaLine, Arrow } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { nanoid } from 'nanoid';

import type { CircleData, LineData, RectData, TextData, ImageData, TerminalData, WhiteboardState, WhiteboardMode } from '@/types';
import {
    DEFAULT_CIRCLE_RADIUS, DEFAULT_RECT_SIZE_SM, DEFAULT_RECT_SIZE_MD,
    DEFAULT_TEXT_FONT_SIZE, TEXT_EDIT_MIN_WIDTH, TEXT_EDIT_HEIGHT,
    DEFAULT_STROKE_WIDTH, ARROW_POINTER_LENGTH, ARROW_POINTER_WIDTH,
    PASTE_OFFSET, IMAGE_INITIAL_SCALE,
} from '@/constants/shapes';
import { useHistory } from '@/hooks/useHistory';
import { usePersistence } from '@/hooks/usePersistence';

import CircleShape from './whiteboard/shapes/CircleShape';
import RectShape from './whiteboard/shapes/RectShape';
import LineShape from './whiteboard/shapes/LineShape';
import TextShape from './whiteboard/shapes/TextShape';
import ImageShape from './whiteboard/shapes/ImageShape';
const TerminalShape = dynamic(
    () => import('./whiteboard/shapes/TerminalShape'),
    { ssr: false, loading: () => null }
);
import ModeIndicator from './whiteboard/toolbar/ModeIndicator';
import SessionToolbar from './whiteboard/toolbar/SessionToolbar';

// ─────────────────────────────────────────
// Helper: 16진수 2자리 랜덤 문자열 (원 라벨용)
const getRandomHex2 = () => {
    const chars = '0123456789abcdef';
    return Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * 16)]).join('');
};

// ─────────────────────────────────────────
const Whiteboard = () => {
    // ── Shape state ──────────────────────
    const [circles, setCircles] = useState<CircleData[]>([]);
    const [lines, setLines] = useState<LineData[]>([]);
    const [rects, setRects] = useState<RectData[]>([]);
    const [texts, setTexts] = useState<TextData[]>([]);
    const [images, setImages] = useState<ImageData[]>([]);
    const [terminals, setTerminals] = useState<TerminalData[]>([]);

    // ── UI state ─────────────────────────
    const [mode, setMode] = useState<WhiteboardMode>('select');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isPanning, setIsPanning] = useState(false);
    const [tempLineStartId, setTempLineStartId] = useState<string | null>(null);
    const [drawingLine, setDrawingLine] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
    const [selection, setSelection] = useState<{ x: number; y: number; width: number; height: number; startX: number; startY: number; isSelecting: boolean } | null>(null);
    const [clipboard, setClipboard] = useState<WhiteboardState | null>(null);

    // ── Text editing ─────────────────────
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPos, setEditPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // ── Double-tap tracking ───────────────
    const [lastRPressTime, setLastRPressTime] = useState(0);
    const [lastCPressTime, setLastCPressTime] = useState(0);

    // ── Refs ──────────────────────────────
    const trRef = useRef<Konva.Transformer>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const shapeRefs = useRef<{ [key: string]: Konva.Node | null }>({});
    const dragSelectedIdsRef = useRef<Set<string>>(new Set());
    const [size, setSize] = useState({ width: 0, height: 0 });

    // ── Hooks ─────────────────────────────
    const { saveHistory, undo } = useHistory({ circles, lines, rects, texts, images, terminals });

    const applyState = useCallback((state: Partial<WhiteboardState>) => {
        if (state.circles !== undefined) setCircles(state.circles);
        if (state.lines !== undefined) setLines(state.lines);
        if (state.rects !== undefined) setRects(state.rects);
        if (state.texts !== undefined) setTexts(state.texts);
        if (state.images !== undefined) setImages(state.images);
        if (state.terminals !== undefined) setTerminals(state.terminals);
    }, []);

    const handleClear = useCallback(() => {
        saveHistory();
        setCircles([]); setLines([]); setRects([]); setTexts([]); setImages([]); setTerminals([]);
        setSelectedIds(new Set());
        localStorage.removeItem('whiteboard-data');
    }, [saveHistory]);

    const { isLoaded, fileInputRef, handleSave, handleLoad } = usePersistence({
        circles, lines, rects, texts, images, terminals,
        onApplyState: applyState,
        beforeLoad: saveHistory,
    });

    const handleUndo = useCallback(() => {
        undo((lastState) => {
            setCircles(lastState.circles);
            setLines(lastState.lines);
            setRects(lastState.rects || []);
            setTexts(lastState.texts || []);
            setImages(lastState.images || []);
            setTerminals(lastState.terminals || []);
            setSelectedIds(new Set());
            setTempLineStartId(null);
            setEditingId(null);
        });
    }, [undo]);

    // ── Window size ───────────────────────
    useEffect(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight });
        const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ── Transformer sync ──────────────────
    useEffect(() => {
        if (!trRef.current) return;
        const nodes: Konva.Node[] = [];
        selectedIds.forEach(id => {
            const node = shapeRefs.current[id];
            if (node) nodes.push(node);
        });
        trRef.current.nodes(nodes);
        trRef.current.getLayer()?.batchDraw();
    }, [selectedIds, circles, lines, rects, texts, images, terminals]);

    // ── Text textarea focus ───────────────
    useEffect(() => {
        if (editingId && textareaRef.current) {
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    const val = textareaRef.current.value;
                    textareaRef.current.setSelectionRange(val.length, val.length);
                }
            }, 0);
        }
    }, [editingId]);

    // ── Clipboard paste (images) ──────────
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const blob = item.getAsFile();
                    if (blob) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const src = event.target?.result as string;
                            const img = new Image();
                            img.src = src;
                            img.onload = () => {
                                saveHistory();
                                setImages(prev => [...prev, {
                                    id: `image-${nanoid()}`,
                                    x: 100, y: 100,
                                    width: img.width / IMAGE_INITIAL_SCALE,
                                    height: img.height / IMAGE_INITIAL_SCALE,
                                    src,
                                }]);
                            };
                        };
                        reader.readAsDataURL(blob);
                    }
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [saveHistory]);

    // ── Keyboard handler ──────────────────
    // keyboardStateRef로 stale closure 방지 (의존성 배열 최소화)
    const keyboardStateRef = useRef({
        mode, selectedIds, circles, lines, rects, texts, images, terminals,
        clipboard, isPanning, editingId, lastRPressTime, lastCPressTime,
    });
    useEffect(() => {
        keyboardStateRef.current = {
            mode, selectedIds, circles, lines, rects, texts, images, terminals,
            clipboard, isPanning, editingId, lastRPressTime, lastCPressTime,
        };
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            console.log('KeyDown:', e.key, 'Code:', e.code, 'Shift:', e.shiftKey, 'Mode:', keyboardStateRef.current.mode);
            const s = keyboardStateRef.current;

            if (s.editingId) {
                if (e.key === 'Escape') setEditingId(null);
                return;
            }
            if (e.key === ' ' && !e.repeat) { setIsPanning(true); return; }
            if (s.isPanning) return;

            // Undo
            if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
                handleUndo(); return;
            }

            // Copy
            if ((e.key === 'c' || e.key === 'C') && (e.ctrlKey || e.metaKey)) {
                if (s.selectedIds.size > 0) {
                    setClipboard({
                        circles: structuredClone(s.circles.filter(c => s.selectedIds.has(c.id))),
                        lines: structuredClone(s.lines.filter(l => s.selectedIds.has(l.id))),
                        rects: structuredClone(s.rects.filter(r => s.selectedIds.has(r.id))),
                        texts: structuredClone(s.texts.filter(t => s.selectedIds.has(t.id))),

                        images: structuredClone(s.images.filter(i => s.selectedIds.has(i.id))),
                        terminals: structuredClone(s.terminals.filter(t => s.selectedIds.has(t.id))),
                    });
                }
                return;
            }

            // Paste
            if ((e.key === 'v' || e.key === 'V') && (e.ctrlKey || e.metaKey)) {
                if (s.clipboard) {
                    saveHistory();
                    const offset = PASTE_OFFSET;
                    const newIds = new Set<string>();
                    const mk = (prefix: string) => { const id = `${prefix}-${nanoid()}`; newIds.add(id); return id; };
                    setCircles(prev => [...prev, ...s.clipboard!.circles.map(c => ({ ...c, id: mk('circle'), x: c.x + offset, y: c.y + offset }))]);
                    setLines(prev => [...prev, ...s.clipboard!.lines.map(l => ({ ...l, id: mk('line'), x: l.x + offset, y: l.y + offset }))]);
                    setRects(prev => [...prev, ...s.clipboard!.rects.map(r => ({ ...r, id: mk('rect'), x: r.x + offset, y: r.y + offset }))]);
                    setTexts(prev => [...prev, ...s.clipboard!.texts.map(t => ({ ...t, id: mk('text'), x: t.x + offset, y: t.y + offset }))]);
                    setImages(prev => [...prev, ...s.clipboard!.images.map(i => ({ ...i, id: mk('image'), x: i.x + offset, y: i.y + offset }))]);
                    setTerminals(prev => [...prev, ...s.clipboard!.terminals.map(t => ({ ...t, id: mk('terminal'), x: t.x + offset, y: t.y + offset }))]);
                    setSelectedIds(newIds);
                }
                return;
            }

            // Color shortcuts (1-6)
            if (['1', '2', '3', '4', '5', '6'].includes(e.key) && s.selectedIds.size > 0) {
                const colorMap: Record<string, { stroke: string; fill?: string; textFill?: string }> = {
                    '1': { stroke: 'black', fill: 'transparent', textFill: 'black' },
                    '2': { stroke: '#ef4444', fill: '#ef4444', textFill: 'white' }, // Red-500 (Clear)
                    '3': { stroke: '#155dfc', fill: '#155dfc', textFill: 'white' }, // Custom Blue
                    '4': { stroke: '#22c55e', fill: '#22c55e', textFill: 'white' }, // Green-500 (Load)
                    '5': { stroke: 'gray', fill: 'gray', textFill: 'white' },
                    '6': { stroke: 'white', fill: 'transparent', textFill: 'black' },
                };

                const style = colorMap[e.key];

                saveHistory();
                setCircles(prev => prev.map(c => s.selectedIds.has(c.id) ? { ...c, ...style } : c));
                setRects(prev => prev.map(r => s.selectedIds.has(r.id) ? { ...r, ...style } : r));
                setLines(prev => prev.map(l => s.selectedIds.has(l.id) ? { ...l, stroke: style.stroke } : l));
                setTexts(prev => prev.map(t => s.selectedIds.has(t.id) ? { ...t, fill: style.textFill || style.stroke } : t));
                return;
            }

            // Text only Color shortcuts (7-0)
            if (['7', '8', '9', '0'].includes(e.key) && s.selectedIds.size > 0) {
                const textColorMap: Record<string, string> = {
                    '7': 'black',
                    '8': '#ef4444', // Red
                    '9': '#155dfc', // Blue
                    '0': '#22c55e', // Green
                };

                const color = textColorMap[e.key];
                if (color) {
                    saveHistory();
                    setTexts(prev => prev.map(t => s.selectedIds.has(t.id) ? { ...t, fill: color } : t));
                    setRects(prev => prev.map(r => s.selectedIds.has(r.id) ? { ...r, textFill: color } : r));
                    setCircles(prev => prev.map(c => s.selectedIds.has(c.id) ? { ...c, textFill: color } : c));
                }
                return;
            }

            // Edit mode (E key)
            if ((e.key === 'e' || e.key === 'E') && s.selectedIds.size === 1) {
                const id = Array.from(s.selectedIds)[0];
                const stage = stageRef.current;
                const node = shapeRefs.current[id];

                if (node && stage) {
                    // Calculate position
                    const scale = stage.scaleX();
                    const pos = stage.absolutePosition();
                    const nodePos = node.absolutePosition();

                    const rect = s.rects.find(r => r.id === id);
                    const circle = s.circles.find(c => c.id === id);
                    const text = s.texts.find(t => t.id === id);

                    if (rect) {
                        setEditPos({
                            x: nodePos.x,
                            y: nodePos.y,
                            w: rect.width * node.scaleX(),
                            h: rect.height * node.scaleY()
                        });
                        setEditingId(id);
                    } else if (circle) {
                        setEditPos({
                            x: nodePos.x - (circle.radius * node.scaleX()),
                            y: nodePos.y - (circle.radius * node.scaleY()),
                            w: circle.radius * 2 * node.scaleX(),
                            h: circle.radius * 2 * node.scaleY()
                        });
                        setEditingId(id);
                    } else if (text) {
                        setEditPos({
                            x: nodePos.x,
                            y: nodePos.y,
                            w: Math.max(TEXT_EDIT_MIN_WIDTH, node.width() * node.scaleX()),
                            h: Math.max(TEXT_EDIT_HEIGHT, node.height() * node.scaleY())
                        });
                        setEditingId(id);
                    }
                }
                return;
            }

            // Mode toggles
            if (e.key === 'l' || e.key === 'L') {
                setMode(prev => prev === 'select' ? 'line' : prev === 'line' ? 'arrow' : 'select');
                setSelectedIds(new Set()); setTempLineStartId(null);
            }



            // Terminal (I key)
            if ((e.key === 'i' || e.key === 'I') && !s.editingId && !e.ctrlKey && !e.metaKey) {
                saveHistory();
                const { x, y } = getRelativePointerPosition();
                const newId = `terminal-${nanoid()}`;
                setTerminals(prev => [...prev, {
                    id: newId,
                    x: x || 100, y: y || 100,
                    width: 1508, height: 414,
                }]);
                // 생성 즉시 선택 → pointerEvents 활성화
                setSelectedIds(new Set([newId]));
            }

            if (e.code === 'KeyT' && !e.shiftKey) {
                setMode(prev => prev === 'text' ? 'select' : 'text');
                setSelectedIds(new Set()); setTempLineStartId(null);
            }
            if (e.key === 'Escape') {
                setMode('select'); setTempLineStartId(null); setDrawingLine(null);
            }

            if (s.mode === 'select') {
                // Create circle (C key)
                if (e.key === 'c' || e.key === 'C') {
                    const now = Date.now();
                    const isDoubleTap = now - s.lastCPressTime < 400;
                    setLastCPressTime(now);
                    if (isDoubleTap) {
                        setCircles(prev => {
                            if (prev.length === 0) return prev;
                            return prev.map((c, i) => i === prev.length - 1 ? { ...c, text: '' } : c);
                        });
                    } else {
                        saveHistory();
                        const { x, y } = getRelativePointerPosition();
                        setCircles(prev => [...prev, {
                            id: `circle-${nanoid()}`,
                            x: x || 100, y: y || 100,
                            radius: DEFAULT_CIRCLE_RADIUS,
                            text: getRandomHex2(),
                            stroke: 'black',
                        }]);
                    }
                }

                // Create rect (R key)
                if (e.key === 'r' || e.key === 'R') {
                    const now = Date.now();
                    const isDoubleTap = now - s.lastRPressTime < 400;
                    setLastRPressTime(now);
                    if (isDoubleTap) {
                        setRects(prev => {
                            if (prev.length === 0) return prev;
                            const last = prev[prev.length - 1];
                            if (last.width === DEFAULT_RECT_SIZE_SM && last.height === DEFAULT_RECT_SIZE_SM)
                                return prev.map((r, i) => i === prev.length - 1 ? { ...r, width: DEFAULT_RECT_SIZE_MD } : r);
                            if (last.width === DEFAULT_RECT_SIZE_MD && last.height === DEFAULT_RECT_SIZE_SM)
                                return prev.map((r, i) => i === prev.length - 1 ? { ...r, height: DEFAULT_RECT_SIZE_MD } : r);
                            return prev;
                        });
                    } else {
                        saveHistory();
                        const { x, y } = getRelativePointerPosition();
                        setRects(prev => [...prev, {
                            id: `rect-${nanoid()}`,
                            x: (x || 100) - DEFAULT_RECT_SIZE_SM / 2,
                            y: (y || 100) - DEFAULT_RECT_SIZE_SM / 2,
                            width: DEFAULT_RECT_SIZE_SM, height: DEFAULT_RECT_SIZE_SM,
                            text: '', stroke: 'black',
                        }]);
                    }
                }

                // Delete (D / Backspace / Delete)
                if (e.key === 'd' || e.key === 'D' || e.key === 'Backspace' || e.key === 'Delete') {
                    if (s.selectedIds.size > 0) {
                        saveHistory();
                        setCircles(prev => prev.filter(c => !s.selectedIds.has(c.id)));
                        setLines(prev => prev.filter(l => !s.selectedIds.has(l.id)));
                        setRects(prev => prev.filter(r => !s.selectedIds.has(r.id)));
                        setTexts(prev => prev.filter(t => !s.selectedIds.has(t.id)));
                        setImages(prev => prev.filter(i => !s.selectedIds.has(i.id)));
                        setTerminals(prev => prev.filter(t => !s.selectedIds.has(t.id)));
                        setSelectedIds(new Set());
                    }
                }

                // Align left (A key)
                if (e.key === 'a' || e.key === 'A') {
                    if (s.selectedIds.size > 1) {
                        let minX = Infinity;
                        [...s.circles, ...s.lines, ...s.rects, ...s.texts, ...s.images]
                            .forEach(item => { if (s.selectedIds.has(item.id) && item.x < minX) minX = item.x; });
                        if (minX !== Infinity) {
                            saveHistory();
                            setCircles(prev => prev.map(c => s.selectedIds.has(c.id) ? { ...c, x: minX } : c));
                            setLines(prev => prev.map(l => s.selectedIds.has(l.id) ? { ...l, x: minX } : l));
                            setRects(prev => prev.map(r => s.selectedIds.has(r.id) ? { ...r, x: minX } : r));
                            setTexts(prev => prev.map(t => s.selectedIds.has(t.id) ? { ...t, x: minX } : t));
                            setImages(prev => prev.map(i => s.selectedIds.has(i.id) ? { ...i, x: minX } : i));
                            setTerminals(prev => prev.map(t => s.selectedIds.has(t.id) ? { ...t, x: minX } : t));
                        }
                    }
                }

                // Distribute vertically (Q key)
                if (e.key === 'q' || e.key === 'Q') {
                    const selectedItems = [...s.circles, ...s.lines, ...s.rects, ...s.texts]
                        .filter(item => s.selectedIds.has(item.id))
                        .map(item => ({ id: item.id, y: item.y }));
                    if (selectedItems.length > 2) {
                        saveHistory();
                        selectedItems.sort((a, b) => a.y - b.y);
                        const min = selectedItems[0].y;
                        const interval = (selectedItems[selectedItems.length - 1].y - min) / (selectedItems.length - 1);
                        const newYMap = new Map(selectedItems.map((item, i) => [item.id, min + interval * i]));
                        setCircles(prev => prev.map(c => newYMap.has(c.id) ? { ...c, y: newYMap.get(c.id)! } : c));
                        setLines(prev => prev.map(l => newYMap.has(l.id) ? { ...l, y: newYMap.get(l.id)! } : l));
                        setRects(prev => prev.map(r => newYMap.has(r.id) ? { ...r, y: newYMap.get(r.id)! } : r));
                        setTexts(prev => prev.map(t => newYMap.has(t.id) ? { ...t, y: newYMap.get(t.id)! } : t));
                    }
                }

                // Align top (S key)
                if (e.key === 's' || e.key === 'S') {
                    if (s.selectedIds.size > 1) {
                        let minY = Infinity;
                        [...s.circles, ...s.lines, ...s.rects, ...s.texts, ...s.images]
                            .forEach(item => { if (s.selectedIds.has(item.id) && item.y < minY) minY = item.y; });
                        if (minY !== Infinity) {
                            saveHistory();
                            setCircles(prev => prev.map(c => s.selectedIds.has(c.id) ? { ...c, y: minY } : c));
                            setLines(prev => prev.map(l => s.selectedIds.has(l.id) ? { ...l, y: minY } : l));
                            setRects(prev => prev.map(r => s.selectedIds.has(r.id) ? { ...r, y: minY } : r));
                            setTexts(prev => prev.map(t => s.selectedIds.has(t.id) ? { ...t, y: minY } : t));
                            setImages(prev => prev.map(i => s.selectedIds.has(i.id) ? { ...i, y: minY } : i));
                            setTerminals(prev => prev.map(t => s.selectedIds.has(t.id) ? { ...t, y: minY } : t));
                        }
                    }
                }

                // Distribute horizontally (W key)
                if (e.key === 'w' || e.key === 'W') {
                    const selectedItems = [...s.circles, ...s.lines, ...s.rects, ...s.texts]
                        .filter(item => s.selectedIds.has(item.id))
                        .map(item => ({ id: item.id, x: item.x }));
                    if (selectedItems.length > 2) {
                        saveHistory();
                        selectedItems.sort((a, b) => a.x - b.x);
                        const min = selectedItems[0].x;
                        const interval = (selectedItems[selectedItems.length - 1].x - min) / (selectedItems.length - 1);
                        const newXMap = new Map(selectedItems.map((item, i) => [item.id, min + interval * i]));
                        setCircles(prev => prev.map(c => newXMap.has(c.id) ? { ...c, x: newXMap.get(c.id)! } : c));
                        setLines(prev => prev.map(l => newXMap.has(l.id) ? { ...l, x: newXMap.get(l.id)! } : l));
                        setRects(prev => prev.map(r => newXMap.has(r.id) ? { ...r, x: newXMap.get(r.id)! } : r));
                        setTexts(prev => prev.map(t => newXMap.has(t.id) ? { ...t, x: newXMap.get(t.id)! } : t));
                    }
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === ' ') setIsPanning(false);
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleUndo, saveHistory]); // stateRef로 접근하므로 최소 의존성

    // ── Helpers ───────────────────────────
    const getRelativePointerPosition = () => {
        const stage = stageRef.current;
        if (!stage) return { x: 0, y: 0 };
        const pointer = stage.getPointerPosition();
        if (!pointer) return { x: 0, y: 0 };
        const scale = stage.scaleX();
        const pos = stage.position();
        return { x: (pointer.x - pos.x) / scale, y: (pointer.y - pos.y) / scale };
    };

    const getSurfacePoint = (c1: CircleData, c2: CircleData) => {
        const angle = Math.atan2(c2.y - c1.y, c2.x - c1.x);
        return {
            startX: c1.x + c1.radius * Math.cos(angle),
            startY: c1.y + c1.radius * Math.sin(angle),
            endX: c2.x - c2.radius * Math.cos(angle),
            endY: c2.y - c2.radius * Math.sin(angle),
        };
    };

    // ── Transform end ─────────────────────
    const handleTransformEnd = () => {
        saveHistory();
        const nodes = trRef.current?.nodes();
        if (!nodes) return;
        nodes.forEach(node => {
            const id = Object.keys(shapeRefs.current).find(k => shapeRefs.current[k] === node);
            if (!id) return;
            const sx = node.scaleX(), sy = node.scaleY();
            node.scaleX(1); node.scaleY(1);
            if (id.startsWith('rect')) {
                setRects(prev => prev.map(r => {
                    if (r.id === id) {
                        return {
                            ...r,
                            x: node.x(),
                            y: node.y(),
                            width: Math.max(5, r.width * sx),
                            height: Math.max(5, r.height * sy)
                        };
                    }
                    return r;
                }));
            }
            else if (id.startsWith('circle'))
                setCircles(prev => prev.map(c => c.id === id ? { ...c, x: node.x(), y: node.y(), radius: Math.max(5, c.radius * Math.max(sx, sy)) } : c));
            else if (id.startsWith('text'))
                setTexts(prev => prev.map(t => t.id === id ? { ...t, x: node.x(), y: node.y(), fontSize: Math.max(12, t.fontSize * sy) } : t));
            else if (id.startsWith('image'))
                setImages(prev => prev.map(i => i.id === id ? { ...i, x: node.x(), y: node.y(), width: Math.max(5, i.width * sx), height: Math.max(5, i.height * sy) } : i));
            else if (id.startsWith('terminal'))
                setTerminals(prev => prev.map(t => t.id === id ? { ...t, x: node.x(), y: node.y(), width: Math.max(100, t.width * sx), height: Math.max(100, t.height * sy) } : t));
        });
    };

    // ── Drag handlers ─────────────────────
    const handleDragStart = (id: string, e: KonvaEventObject<DragEvent>) => {
        if (mode !== 'select' || isPanning || editingId) return;
        saveHistory();

        let newSelected = new Set(selectedIds);
        if (!newSelected.has(id)) {
            newSelected = new Set([id]);
            setSelectedIds(newSelected);
        }
        dragSelectedIdsRef.current = newSelected;

        newSelected.forEach(sid => {
            const node = shapeRefs.current[sid];
            if (node) node.setAttr('startPos', { x: node.x(), y: node.y() });
        });
    };

    const handleDragMove = (id: string, e: KonvaEventObject<DragEvent>) => {
        if (mode !== 'select' || isPanning || editingId) return;
        const draggedNode = e.target as Konva.Node;
        const startPos = draggedNode.getAttr('startPos') as { x: number; y: number } | undefined;
        if (!startPos) return;
        const dx = draggedNode.x() - startPos.x;
        const dy = draggedNode.y() - startPos.y;

        dragSelectedIdsRef.current.forEach(sid => {
            if (sid !== id) {
                const node = shapeRefs.current[sid];
                const sp = node?.getAttr('startPos') as { x: number; y: number } | undefined;
                if (node && sp) { node.x(sp.x + dx); node.y(sp.y + dy); }
            }
        });
    };

    const handleDragEnd = (id: string) => {
        if (mode !== 'select' || isPanning || editingId) return;

        // dragSelectedIdsRef is already set from start, but we can sync state just in case
        const currentSelected = dragSelectedIdsRef.current.size > 0 ? dragSelectedIdsRef.current : selectedIds;

        // Sync React state with Konva node positions
        const sync = <T extends { id: string }>(prev: T[], getId: (item: T) => string) =>
            prev.map(item => {
                if (currentSelected.has(getId(item))) {
                    const node = shapeRefs.current[getId(item)];
                    return node ? { ...item, x: node.x(), y: node.y() } : item;
                }
                return item;
            });

        setCircles(prev => sync(prev, c => c.id));
        setLines(prev => sync(prev, l => l.id));
        setRects(prev => sync(prev, r => r.id));
        setTexts(prev => sync(prev, t => t.id));
        setImages(prev => sync(prev, i => i.id));
        setTerminals(prev => sync(prev, t => t.id));

        // Clear drag ref (optional, but good for cleanup)
        dragSelectedIdsRef.current = new Set();
    };

    // ── Click handler ─────────────────────
    const handleClick = (id: string, e: KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        if (editingId) return;

        if (mode === 'line' || mode === 'arrow') {
            const circle = circles.find(c => c.id === id);
            if (!circle) return;
            if (tempLineStartId === null) {
                setTempLineStartId(id);
            } else {
                if (tempLineStartId === id) { setTempLineStartId(null); return; }
                const startCircle = circles.find(c => c.id === tempLineStartId);
                if (startCircle) {
                    saveHistory();
                    const { startX, startY, endX, endY } = getSurfacePoint(startCircle, circle);
                    setLines(prev => [...prev, {
                        id: `line-${nanoid()}`, x: 0, y: 0,
                        points: [startX, startY, endX, endY],
                        stroke: 'black', strokeWidth: DEFAULT_STROKE_WIDTH,
                        type: mode as 'line' | 'arrow',
                    }]);
                }
                setTempLineStartId(null);
            }
            return;
        }

        if (mode !== 'select') return;

        const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
        if (!metaPressed) {
            if (!selectedIds.has(id)) setSelectedIds(new Set([id]));
        } else {
            const newSelected = new Set(selectedIds);
            newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
            setSelectedIds(newSelected);
        }
    };

    // ── Canvas events ─────────────────────
    const onMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (isPanning || editingId) return;
        const clickedOnEmpty = e.target === e.target.getStage();

        // Text mode: create new text
        if (mode === 'text' && clickedOnEmpty) {
            const { x, y } = getRelativePointerPosition();
            saveHistory();
            const newTextId = `text-${nanoid()}`;
            setTexts(prev => [...prev, { id: newTextId, x, y, text: '', fontSize: DEFAULT_TEXT_FONT_SIZE, fill: 'black' }]);
            const stage = stageRef.current;
            const scale = stage?.scaleX() ?? 1;
            const pos = stage?.absolutePosition() ?? { x: 0, y: 0 };
            setEditPos({ x: x * scale + pos.x, y: y * scale + pos.y, w: TEXT_EDIT_MIN_WIDTH, h: TEXT_EDIT_HEIGHT });
            setEditingId(newTextId);
            return;
        }

        // Line/Arrow mode: start drag-draw
        if ((mode === 'line' || mode === 'arrow') && clickedOnEmpty) {
            const { x, y } = getRelativePointerPosition();
            setDrawingLine({ startX: x, startY: y, endX: x, endY: y });
            setTempLineStartId(null);
            return;
        }

        if (!clickedOnEmpty) return;

        const metaPressed = (e.evt as MouseEvent).shiftKey || (e.evt as MouseEvent).ctrlKey || (e.evt as MouseEvent).metaKey;
        if (!metaPressed) setSelectedIds(new Set());
        const { x, y } = getRelativePointerPosition();
        setSelection({ x, y, width: 0, height: 0, startX: x, startY: y, isSelecting: true });
    };

    const onMouseMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (isPanning) return;
        if (drawingLine) {
            const { x, y } = getRelativePointerPosition();
            setDrawingLine(prev => prev ? { ...prev, endX: x, endY: y } : null);
            return;
        }
        if (!selection?.isSelecting) return;
        const { x, y } = getRelativePointerPosition();
        setSelection(prev => prev ? {
            ...prev,
            x: Math.min(x, prev.startX),
            y: Math.min(y, prev.startY),
            width: Math.abs(x - prev.startX),
            height: Math.abs(y - prev.startY),
        } : null);
    };

    const onMouseUp = () => {
        if (isPanning) return;

        // Finalize drag-draw line
        if (drawingLine) {
            saveHistory();
            setLines(prev => [...prev, {
                id: `line-${nanoid()}`, x: 0, y: 0,
                points: [drawingLine.startX, drawingLine.startY, drawingLine.endX, drawingLine.endY],
                stroke: 'black', strokeWidth: DEFAULT_STROKE_WIDTH,
                type: mode as 'line' | 'arrow',
            }]);
            setDrawingLine(null);
            return;
        }

        if (!selection?.isSelecting) return;
        const selBox = { x1: selection.x, y1: selection.y, x2: selection.x + selection.width, y2: selection.y + selection.height };
        const newSelected = new Set(selectedIds);

        const hits = (bx1: number, by1: number, bx2: number, by2: number) =>
            selBox.x1 < bx2 && selBox.x2 > bx1 && selBox.y1 < by2 && selBox.y2 > by1;

        circles.forEach(c => { if (hits(c.x - c.radius, c.y - c.radius, c.x + c.radius, c.y + c.radius)) newSelected.add(c.id); });
        rects.forEach(r => { if (hits(r.x, r.y, r.x + r.width, r.y + r.height)) newSelected.add(r.id); });
        images.forEach(i => { if (hits(i.x, i.y, i.x + i.width, i.y + i.height)) newSelected.add(i.id); });
        terminals.forEach(t => { if (hits(t.x, t.y, t.x + t.width, t.y + t.height)) newSelected.add(t.id); });
        texts.forEach(t => {
            const node = shapeRefs.current[t.id];
            const w = node ? node.width() * node.scaleX() : 100;
            const h = node ? node.height() * node.scaleY() : 20;
            if (hits(t.x, t.y, t.x + w, t.y + h)) newSelected.add(t.id);
        });
        lines.forEach(line => {
            const x1 = line.points[0] + line.x, y1 = line.points[1] + line.y;
            const x2 = line.points[2] + line.x, y2 = line.points[3] + line.y;
            if (hits(Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2))) newSelected.add(line.id);
        });

        setSelectedIds(newSelected);
        setSelection(null);
    };

    const removeTerminal = (id: string) => {
        setTerminals(prev => prev.filter(t => t.id !== id));
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
        if (shapeRefs.current[id]) {
            delete shapeRefs.current[id];
        }
    };

    // ── Early return while loading ─────────
    if (size.width === 0) return <div>Loading Whiteboard...</div>;

    // ── Inline text editing values ─────────
    const currentEditingRect = rects.find(r => r.id === editingId);
    const currentEditingText = texts.find(t => t.id === editingId);
    const currentEditingCircle = circles.find(c => c.id === editingId);
    const isEditingRect = !!currentEditingRect;
    const isEditingCircle = !!currentEditingCircle;
    const editingValue = isEditingRect ? currentEditingRect.text
        : isEditingCircle ? currentEditingCircle.text
            : currentEditingText?.text;

    // ── Render ────────────────────────────
    return (
        <>
            <ModeIndicator mode={mode} isPanning={isPanning} tempLineStartId={tempLineStartId} />
            <SessionToolbar
                onSave={handleSave}
                onLoad={handleLoad}
                onClear={handleClear}
                fileInputRef={fileInputRef}
            />

            {/* Inline text editor */}
            {editingId && editPos && (currentEditingRect || currentEditingText || currentEditingCircle) && (
                <textarea
                    ref={textareaRef}
                    value={editingValue || ''}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (isEditingRect) setRects(prev => prev.map(r => r.id === editingId ? { ...r, text: val } : r));
                        else if (isEditingCircle) setCircles(prev => prev.map(c => c.id === editingId ? { ...c, text: val } : c));
                        else setTexts(prev => prev.map(t => t.id === editingId ? { ...t, text: val } : t));
                    }}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setEditingId(null); } }}
                    style={{
                        position: 'absolute', left: editPos.x, top: editPos.y,
                        width: (isEditingRect || isEditingCircle) ? editPos.w : 'auto',
                        height: (isEditingRect || isEditingCircle) ? editPos.h : 'auto',
                        minWidth: (isEditingRect || isEditingCircle) ? undefined : '200px',
                        fontSize: (isEditingRect || isEditingCircle) ? 18 : (currentEditingText?.fontSize || 20),
                        textAlign: (isEditingRect || isEditingCircle) ? 'center' : 'left',
                        border: '1px solid #3b82f6', outline: 'none', background: 'transparent',
                        resize: 'none', overflow: 'hidden', zIndex: 20, padding: 0,
                        paddingTop: (isEditingRect || isEditingCircle) ? Math.max(0, (editPos.h - (editingValue?.split('\n').length || 1) * 22) / 2) : 0,
                        lineHeight: '22px', fontFamily: 'Consolas, monospace',
                        color: (isEditingRect || isEditingCircle) ? 'black' : (currentEditingText?.fill || 'black'),
                    }}
                />
            )}

            <Stage
                width={size.width}
                height={size.height}
                ref={stageRef}
                draggable={isPanning}
                className={`bg-white touch-none ${isPanning ? 'cursor-grab active:cursor-grabbing' : (mode === 'text' ? 'cursor-text' : mode !== 'select' ? 'cursor-crosshair' : 'cursor-default')}`}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onTouchStart={onMouseDown}
                onTouchMove={onMouseMove}
                onTouchEnd={onMouseUp}
            >
                <Layer>
                    {rects.map(rect => (
                        <RectShape
                            key={rect.id}
                            rect={rect}
                            isSelected={selectedIds.has(rect.id)}
                            isEditing={editingId === rect.id}
                            mode={mode}
                            isPanning={isPanning}
                            shapeRef={node => { if (node) shapeRefs.current[rect.id] = node; else delete shapeRefs.current[rect.id]; }}
                            onClick={e => { if (!isPanning) handleClick(rect.id, e); }}
                            onDragStart={e => handleDragStart(rect.id, e)}
                            onDragMove={e => handleDragMove(rect.id, e)}
                            onDragEnd={() => handleDragEnd(rect.id)}
                            onTransformEnd={handleTransformEnd}
                        />
                    ))}

                    {texts.map(textItem => (
                        <TextShape
                            key={textItem.id}
                            textItem={textItem}
                            isSelected={selectedIds.has(textItem.id)}
                            isEditing={editingId === textItem.id}
                            mode={mode}
                            isPanning={isPanning}
                            shapeRef={node => { if (node) shapeRefs.current[textItem.id] = node; else delete shapeRefs.current[textItem.id]; }}
                            onClick={e => { if (!isPanning) handleClick(textItem.id, e); }}
                            onDragStart={e => handleDragStart(textItem.id, e)}
                            onDragMove={e => handleDragMove(textItem.id, e)}
                            onDragEnd={() => handleDragEnd(textItem.id)}
                            onTransformEnd={handleTransformEnd}
                        />
                    ))}

                    {lines.map(line => (
                        <LineShape
                            key={line.id}
                            line={line}
                            isSelected={selectedIds.has(line.id)}
                            mode={mode}
                            isPanning={isPanning}
                            shapeRef={node => { if (node) shapeRefs.current[line.id] = node; else delete shapeRefs.current[line.id]; }}
                            onClick={e => { if (mode === 'select' && !isPanning) handleClick(line.id, e); }}
                            onDragStart={e => handleDragStart(line.id, e)}
                            onDragMove={e => handleDragMove(line.id, e)}
                            onDragEnd={() => handleDragEnd(line.id)}
                        />
                    ))}

                    {/* Drawing preview */}
                    {drawingLine && (mode === 'arrow' ? (
                        <Arrow points={[drawingLine.startX, drawingLine.startY, drawingLine.endX, drawingLine.endY]}
                            stroke="black" strokeWidth={DEFAULT_STROKE_WIDTH}
                            pointerLength={ARROW_POINTER_LENGTH} pointerWidth={ARROW_POINTER_WIDTH} fill="black" />
                    ) : (
                        <KonvaLine points={[drawingLine.startX, drawingLine.startY, drawingLine.endX, drawingLine.endY]}
                            stroke="black" strokeWidth={DEFAULT_STROKE_WIDTH} />
                    ))}

                    {circles.map(circle => (
                        <CircleShape
                            key={circle.id}
                            circle={circle}
                            isSelected={selectedIds.has(circle.id)}
                            isConnectStart={circle.id === tempLineStartId}
                            mode={mode}
                            isPanning={isPanning}
                            shapeRef={node => { if (node) shapeRefs.current[circle.id] = node; else delete shapeRefs.current[circle.id]; }}
                            onClick={e => { if (!isPanning) handleClick(circle.id, e); }}
                            onDragStart={e => handleDragStart(circle.id, e)}
                            onDragMove={e => handleDragMove(circle.id, e)}
                            onDragEnd={() => handleDragEnd(circle.id)}
                            onTransformEnd={handleTransformEnd}
                        />
                    ))}

                    {images.map(image => (
                        <ImageShape
                            key={image.id}
                            image={image}
                            isSelected={selectedIds.has(image.id)}
                            mode={mode}
                            isPanning={isPanning}
                            shapeRef={node => { if (node) shapeRefs.current[image.id] = node; else delete shapeRefs.current[image.id]; }}
                            onClick={e => { if (!isPanning) handleClick(image.id, e); }}
                            onDragStart={e => handleDragStart(image.id, e)}
                            onDragMove={e => handleDragMove(image.id, e)}
                            onDragEnd={() => handleDragEnd(image.id)}
                            onTransformEnd={handleTransformEnd}
                        />
                    ))}

                    {terminals.map(term => (
                        <TerminalShape
                            key={term.id}
                            terminal={term}
                            isSelected={selectedIds.has(term.id)}
                            onTransformEnd={handleTransformEnd}
                            mode={mode}
                            isPanning={isPanning}
                            shapeRef={node => { if (node) shapeRefs.current[term.id] = node; else delete shapeRefs.current[term.id]; }}
                            onClick={e => { if (!isPanning) handleClick(term.id, e); }}
                            onDragStart={e => handleDragStart(term.id, e)}
                            onDragMove={e => handleDragMove(term.id, e)}
                            onDragEnd={() => handleDragEnd(term.id)}
                            onClose={() => removeTerminal(term.id)}
                            onToggleSelect={() => handleClick(term.id, { evt: { shiftKey: true } } as any)}
                        />
                    ))}

                    <Transformer
                        ref={trRef}
                        boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5) ? oldBox : newBox}
                        borderStroke="#eab308"
                        anchorStroke="#eab308"
                        anchorFill="#fef08a" // Yellow-200
                    />

                    {selection?.isSelecting && !isPanning && (
                        <KonvaLine
                            x={selection.x} y={selection.y}
                            points={[0, 0, selection.width, 0, selection.width, selection.height, 0, selection.height]}
                            closed fill="rgba(234, 179, 8, 0.2)" stroke="#eab308" listening={false}
                        />
                    )}
                </Layer>
            </Stage>
        </>
    );
};

export default Whiteboard;
