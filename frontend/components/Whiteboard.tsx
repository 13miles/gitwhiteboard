'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Circle, Group, Text, Rect, Line, Arrow, Image as KonvaImage, Transformer } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';

interface CircleData {
    id: string;
    x: number;
    y: number;
    radius: number;
    text: string;
    stroke?: string;
}

interface RectData {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text?: string;
    stroke?: string;
}

interface ImageData {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    src: string;
}

interface LineData {
    id: string;
    x: number;
    y: number;
    points: number[];
    stroke: string;
    strokeWidth: number;
    type: 'line' | 'arrow';
}

interface TextData {
    id: string;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fill: string;
}

const URLImage = ({ image }: { image: ImageData }) => {
    const [img] = useImage(image.src);
    return (
        <KonvaImage
            image={img}
            x={0}
            y={0}
            width={image.width}
            height={image.height}
        />
    );
};


const Whiteboard = () => {
    const [circles, setCircles] = useState<CircleData[]>([]);
    const [lines, setLines] = useState<LineData[]>([]);
    const [rects, setRects] = useState<RectData[]>([]);
    const [texts, setTexts] = useState<TextData[]>([]);
    const [images, setImages] = useState<ImageData[]>([]);

    // Transformer Ref
    const trRef = useRef<Konva.Transformer>(null);

    const [history, setHistory] = useState<{ circles: CircleData[], lines: LineData[], rects: RectData[], texts: TextData[], images: ImageData[] }[]>([]);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Selection Transformer Effect
    useEffect(() => {
        if (trRef.current) {
            const nodes: Konva.Node[] = [];
            selectedIds.forEach(id => {
                const node = shapeRefs.current[id];
                if (node) nodes.push(node);
            });
            trRef.current.nodes(nodes);
            trRef.current.getLayer()?.batchDraw();
        }
    }, [selectedIds, circles, lines, rects, texts, images]);

    // Handle Transform End
    const handleTransformEnd = () => {
        saveHistory();
        const nodes = trRef.current?.nodes();
        if (!nodes) return;

        nodes.forEach(node => {
            const id = Object.keys(shapeRefs.current).find(key => shapeRefs.current[key] === node);
            if (!id) return;

            const scaleX = node.scaleX();
            const scaleY = node.scaleY();

            // Reset scale to 1 and update width/height for better handling
            node.scaleX(1);
            node.scaleY(1);

            if (id.startsWith('rect')) {
                setRects(prev => prev.map(r => r.id === id ? {
                    ...r,
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(5, node.width() * scaleX),
                    height: Math.max(5, node.height() * scaleY),
                } : r));
            } else if (id.startsWith('circle')) {
                setCircles(prev => prev.map(c => c.id === id ? {
                    ...c,
                    x: node.x(),
                    y: node.y(),
                    radius: Math.max(5, c.radius * Math.max(scaleX, scaleY))
                } : c));
            } else if (id.startsWith('text')) {
                setTexts(prev => prev.map(t => t.id === id ? {
                    ...t,
                    x: node.x(),
                    y: node.y(),
                    fontSize: Math.max(12, t.fontSize * scaleY)
                } : t));
            } else if (id.startsWith('image')) {
                setImages(prev => prev.map(i => i.id === id ? {
                    ...i,
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(5, i.width * scaleX),
                    height: Math.max(5, i.height * scaleY),
                } : i));
            }
        });
    };

    const [mode, setMode] = useState<'select' | 'line' | 'arrow' | 'text'>('select');

    const [tempLineStartId, setTempLineStartId] = useState<string | null>(null);

    const [isPanning, setIsPanning] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const [lastRPressTime, setLastRPressTime] = useState(0);
    const [lastCPressTime, setLastCPressTime] = useState(0);

    // Clipboard
    const [clipboard, setClipboard] = useState<{ circles: CircleData[], lines: LineData[], rects: RectData[], texts: TextData[] } | null>(null);

    // Text Editing
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPos, setEditPos] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Drag Drawing Line
    const [drawingLine, setDrawingLine] = useState<{ startX: number, startY: number, endX: number, endY: number } | null>(null);

    const [selection, setSelection] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
        startX: number;
        startY: number;
        isSelecting: boolean;
    } | null>(null);

    const stageRef = useRef<Konva.Stage>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const shapeRefs = useRef<{ [key: string]: Konva.Node | null }>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Paste Handler
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
                                const newImage: ImageData = {
                                    id: `image-${Date.now()}`,
                                    x: 100,
                                    y: 100,
                                    width: img.width / 2, // Initial scale down
                                    height: img.height / 2,
                                    src
                                };
                                setImages(prev => [...prev, newImage]);
                            };
                        };
                        reader.readAsDataURL(blob);
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [images]); // Depend on images for state update consistency if needed, though setState callback handles it.

    // Load from localStorage on mount
    useEffect(() => {
        const savedData = localStorage.getItem('whiteboard-data');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.circles) setCircles(parsed.circles);
                if (parsed.lines) setLines(parsed.lines);
                if (parsed.rects) setRects(parsed.rects);
                if (parsed.texts) setTexts(parsed.texts);
                if (parsed.images) setImages(parsed.images);
            } catch (e) {
                console.error("Failed to load data", e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        if (!isLoaded) return;
        const data = { circles, lines, rects, texts, images };
        localStorage.setItem('whiteboard-data', JSON.stringify(data));
    }, [circles, lines, rects, texts, images, isLoaded]);

    useEffect(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight });

        const handleResize = () => {
            setSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSave = () => {
        const data = { circles, lines, rects, texts, images };
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `whiteboard-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                const parsed = JSON.parse(json);
                // Basic validation
                if (parsed && typeof parsed === 'object') {
                    saveHistory(); // Save current state before loading
                    setCircles(parsed.circles || []);
                    setLines(parsed.lines || []);
                    setRects(parsed.rects || []);
                    setTexts(parsed.texts || []);
                    setImages(parsed.images || []);
                    // Clear selection and mode
                    setSelectedIds(new Set());
                    setMode('select');
                }
            } catch (err) {
                alert("Failed to load file: Invalid JSON");
            }
        };
        reader.readAsText(file);
        // Reset input value so same file can be selected again
        e.target.value = '';
    };

    const handleClear = () => {
        saveHistory();
        setCircles([]);
        setLines([]);
        setRects([]);
        setTexts([]);
        setImages([]);
        setSelectedIds(new Set());
        localStorage.removeItem('whiteboard-data');
    };

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

    const getRandomHex2 = () => {
        const chars = '0123456789abcdef';
        let result = '';
        for (let i = 0; i < 2; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const saveHistory = () => {
        setHistory(prev => [...prev.slice(-19), {
            circles: structuredClone(circles),
            lines: structuredClone(lines),
            rects: structuredClone(rects),
            texts: structuredClone(texts)
        }]);
    };

    const undo = () => {
        setHistory(prev => {
            if (prev.length === 0) return prev;
            const lastState = prev[prev.length - 1];
            const newHistory = prev.slice(0, prev.length - 1);

            setCircles(lastState.circles);
            setLines(lastState.lines);
            setRects(lastState.rects || []);
            setTexts(lastState.texts || []);
            setSelectedIds(new Set());
            setTempLineStartId(null);
            setEditingId(null);

            return newHistory;
        });
    };

    const getRelativePointerPosition = () => {
        const stage = stageRef.current;
        if (!stage) return { x: 0, y: 0 };
        const pointer = stage.getPointerPosition();
        if (!pointer) return { x: 0, y: 0 };
        const scale = stage.scaleX();
        const stagePos = stage.position();

        return {
            x: (pointer.x - stagePos.x) / scale,
            y: (pointer.y - stagePos.y) / scale
        };
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (editingId) {
                if (e.key === 'Escape') {
                    setEditingId(null);
                }
                return;
            }

            if (e.key === ' ' && !e.repeat) {
                setIsPanning(true);
                return;
            }

            if (isPanning) return;

            const metaPressed = e.shiftKey || e.ctrlKey || e.metaKey;

            // Undo
            if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
                undo();
                return;
            }

            // Copy (Ctrl+C)
            if ((e.key === 'c' || e.key === 'C') && (e.ctrlKey || e.metaKey)) {
                if (selectedIds.size > 0) {
                    const selectedCircles = circles.filter(c => selectedIds.has(c.id));
                    const selectedLines = lines.filter(l => selectedIds.has(l.id));
                    const selectedRects = rects.filter(r => selectedIds.has(r.id));
                    const selectedTexts = texts.filter(t => selectedIds.has(t.id));

                    setClipboard({
                        circles: structuredClone(selectedCircles),
                        lines: structuredClone(selectedLines),
                        rects: structuredClone(selectedRects),
                        texts: structuredClone(selectedTexts)
                    });
                }
                return;
            }

            // Paste (Ctrl+V)
            if ((e.key === 'v' || e.key === 'V') && (e.ctrlKey || e.metaKey)) {
                if (clipboard) {
                    saveHistory();
                    const offset = 20;
                    const newIds = new Set<string>();

                    const newCircles = clipboard.circles.map(c => {
                        const newId = `circle-${Date.now()}-${Math.random()}`;
                        newIds.add(newId);
                        return { ...c, id: newId, x: c.x + offset, y: c.y + offset };
                    });

                    const newLines = clipboard.lines.map(l => {
                        const newId = `line-${Date.now()}-${Math.random()}`;
                        newIds.add(newId);
                        return { ...l, id: newId, x: l.x + offset, y: l.y + offset };
                    });

                    const newRects = clipboard.rects.map(r => {
                        const newId = `rect-${Date.now()}-${Math.random()}`;
                        newIds.add(newId);
                        return { ...r, id: newId, x: r.x + offset, y: r.y + offset };
                    });

                    const newTexts = clipboard.texts.map(t => {
                        const newId = `text-${Date.now()}-${Math.random()}`;
                        newIds.add(newId);
                        return { ...t, id: newId, x: t.x + offset, y: t.y + offset };
                    });

                    setCircles(prev => [...prev, ...newCircles]);
                    setLines(prev => [...prev, ...newLines]);
                    setRects(prev => [...prev, ...newRects]);
                    setTexts(prev => [...prev, ...newTexts]);
                    setSelectedIds(newIds);
                }
                return;
            }

            if (['1', '2', '3', '4', '5', '6'].includes(e.key) && selectedIds.size > 0) {
                const colorMap: { [key: string]: string } = {
                    '1': 'black',
                    '2': 'red',
                    '3': '#1d4ed8',
                    '4': '#15803d',
                    '5': 'gray',
                    '6': 'white'
                };
                const newColor = colorMap[e.key];

                saveHistory();
                setCircles(prev => prev.map(c => selectedIds.has(c.id) ? { ...c, stroke: newColor } : c));
                setRects(prev => prev.map(r => selectedIds.has(r.id) ? { ...r, stroke: newColor } : r));
                setLines(prev => prev.map(l => selectedIds.has(l.id) ? { ...l, stroke: newColor } : l));
                setTexts(prev => prev.map(t => selectedIds.has(t.id) ? { ...t, fill: newColor } : t));
                return;
            }

            if (e.key === 'l' || e.key === 'L') {
                setMode(prev => {
                    if (prev === 'select') return 'line';
                    if (prev === 'line') return 'arrow';
                    return 'select';
                });
                setSelectedIds(new Set());
                setTempLineStartId(null);
            }
            if (e.key === 't' || e.key === 'T') {
                setMode(prev => prev === 'text' ? 'select' : 'text');
                setSelectedIds(new Set());
                setTempLineStartId(null);
            }

            if (e.key === 'Escape') {
                setMode('select');
                setTempLineStartId(null);
                setDrawingLine(null);
            }

            if (mode === 'select') {
                if (e.key === 'c' || e.key === 'C') {
                    const now = Date.now();
                    const isDoubleTap = now - lastCPressTime < 400;
                    setLastCPressTime(now);

                    // Creation Mode
                    if (isDoubleTap) {
                        setCircles(prev => {
                            if (prev.length === 0) return prev;
                            const lastCircle = prev[prev.length - 1];
                            const newCircles = [...prev];
                            newCircles[newCircles.length - 1] = {
                                ...lastCircle,
                                text: '' // Clear text on double tap
                            };
                            return newCircles;
                        });
                    } else {
                        saveHistory();
                        const { x, y } = getRelativePointerPosition();

                        const newCircle: CircleData = {
                            id: `circle-${Date.now()}`,
                            x: x || 100,
                            y: y || 100,
                            radius: 37.5,
                            text: getRandomHex2(),
                            stroke: 'black'
                        };
                        setCircles((prev) => [...prev, newCircle]);
                    }
                }

                if (e.key === 'r' || e.key === 'R') {
                    const now = Date.now();
                    const isDoubleTap = now - lastRPressTime < 400;
                    setLastRPressTime(now);

                    if (isDoubleTap) {
                        setRects(prev => {
                            if (prev.length === 0) return prev;
                            const lastRect = prev[prev.length - 1];
                            const newRects = [...prev];

                            if (lastRect.width === 75 && lastRect.height === 75) {
                                newRects[newRects.length - 1] = {
                                    ...lastRect,
                                    width: 150,
                                };
                            } else if (lastRect.width === 150 && lastRect.height === 75) {
                                newRects[newRects.length - 1] = {
                                    ...lastRect,
                                    height: 150
                                };
                            }
                            return newRects;
                        });
                    } else {
                        saveHistory();
                        const { x, y } = getRelativePointerPosition();
                        const width = 75;
                        const height = 75;

                        const newRect: RectData = {
                            id: `rect-${Date.now()}`,
                            x: (x || 100) - width / 2,
                            y: (y || 100) - height / 2,
                            width,
                            height,
                            text: '',
                            stroke: 'black'
                        };
                        setRects(prev => [...prev, newRect]);
                    }
                }

                if (e.key === 'd' || e.key === 'D' || e.key === 'Backspace' || e.key === 'Delete') {
                    if (selectedIds.size > 0) {
                        saveHistory();
                        setCircles((prev) => prev.filter((c) => !selectedIds.has(c.id)));
                        setLines((prev) => prev.filter((l) => !selectedIds.has(l.id)));
                        setRects((prev) => prev.filter((r) => !selectedIds.has(r.id)));
                        setTexts((prev) => prev.filter((t) => !selectedIds.has(t.id)));
                        setImages((prev) => prev.filter((i) => !selectedIds.has(i.id)));
                        setSelectedIds(new Set());
                    }
                }

                if (e.key === 'a' || e.key === 'A') {
                    if (selectedIds.size > 1) {
                        let minX = Infinity;
                        circles.forEach(c => { if (selectedIds.has(c.id) && c.x < minX) minX = c.x; });
                        lines.forEach(l => { if (selectedIds.has(l.id) && l.x < minX) minX = l.x; });
                        rects.forEach(r => { if (selectedIds.has(r.id) && r.x < minX) minX = r.x; });
                        texts.forEach(t => { if (selectedIds.has(t.id) && t.x < minX) minX = t.x; });
                        images.forEach(i => { if (selectedIds.has(i.id) && i.x < minX) minX = i.x; });

                        if (minX !== Infinity) {
                            saveHistory();
                            setCircles(prev => prev.map(c => selectedIds.has(c.id) ? { ...c, x: minX } : c));
                            setLines(prev => prev.map(l => selectedIds.has(l.id) ? { ...l, x: minX } : l));
                            setRects(prev => prev.map(r => selectedIds.has(r.id) ? { ...r, x: minX } : r));
                            setTexts(prev => prev.map(t => selectedIds.has(t.id) ? { ...t, x: minX } : t));
                            setImages(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, x: minX } : i));
                        }
                    }
                }

                if (e.key === 'q' || e.key === 'Q') {
                    const selectedItems: { id: string, y: number }[] = [];
                    circles.forEach(c => { if (selectedIds.has(c.id)) selectedItems.push({ id: c.id, y: c.y }); });
                    lines.forEach(l => { if (selectedIds.has(l.id)) selectedItems.push({ id: l.id, y: l.y }); });
                    rects.forEach(r => { if (selectedIds.has(r.id)) selectedItems.push({ id: r.id, y: r.y }); });
                    texts.forEach(t => { if (selectedIds.has(t.id)) selectedItems.push({ id: t.id, y: t.y }); });

                    if (selectedItems.length > 2) {
                        saveHistory();
                        selectedItems.sort((a, b) => a.y - b.y);
                        const minY = selectedItems[0].y;
                        const maxY = selectedItems[selectedItems.length - 1].y;
                        const interval = (maxY - minY) / (selectedItems.length - 1);

                        const newYMap = new Map<string, number>();
                        selectedItems.forEach((item, idx) => {
                            newYMap.set(item.id, minY + interval * idx);
                        });

                        setCircles(prev => prev.map(c => newYMap.has(c.id) ? { ...c, y: newYMap.get(c.id)! } : c));
                        setLines(prev => prev.map(l => newYMap.has(l.id) ? { ...l, y: newYMap.get(l.id)! } : l));
                        setRects(prev => prev.map(r => newYMap.has(r.id) ? { ...r, y: newYMap.get(r.id)! } : r));
                        setTexts(prev => prev.map(t => newYMap.has(t.id) ? { ...t, y: newYMap.get(t.id)! } : t));
                    }
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === ' ') {
                setIsPanning(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [selectedIds, size, circles, lines, rects, texts, mode, history, isPanning, lastRPressTime, editingId]);

    const onMouseDown = (e: any) => {
        if (isPanning) return;
        if (editingId) return;

        const clickedOnEmpty = e.target === e.target.getStage();

        if (mode === 'text' && clickedOnEmpty) {
            const { x, y } = getRelativePointerPosition();
            saveHistory();
            const newTextId = `text-${Date.now()}`;
            const newText: TextData = {
                id: newTextId,
                x: x,
                y: y,
                text: '',
                fontSize: 20,
                fill: 'black'
            };
            setTexts(prev => [...prev, newText]);

            // Calculate absolute position efficiently
            const stage = stageRef.current;
            const scale = stage ? stage.scaleX() : 1;
            const stagePos = stage ? stage.absolutePosition() : { x: 0, y: 0 };

            // Convert logic: absolute = (relative * scale) + stagePos
            // We use the recently calculated relative x, y
            const absX = x * scale + stagePos.x;
            const absY = y * scale + stagePos.y;

            setEditPos({
                x: absX,
                y: absY,
                w: 200,
                h: 30
            });
            setEditingId(newTextId);
            return;
        }

        if (mode === 'line' || mode === 'arrow') {
            if (clickedOnEmpty) {
                const { x, y } = getRelativePointerPosition();
                setDrawingLine({ startX: x, startY: y, endX: x, endY: y });
                setTempLineStartId(null);
            }
            return;
        }

        if (!clickedOnEmpty) return;

        const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
        if (!metaPressed) {
            setSelectedIds(new Set());
        }

        const { x, y } = getRelativePointerPosition();
        setSelection({
            x,
            y,
            width: 0,
            height: 0,
            startX: x,
            startY: y,
            isSelecting: true,
        });
    };

    const onMouseMove = (e: any) => {
        if (isPanning) return;

        if (drawingLine) {
            const { x, y } = getRelativePointerPosition();
            setDrawingLine(prev => prev ? { ...prev, endX: x, endY: y } : null);
            return;
        }

        if (!selection || !selection.isSelecting) return;

        const { x, y } = getRelativePointerPosition();
        const boxX = Math.min(x, selection.startX);
        const boxY = Math.min(y, selection.startY);
        const width = Math.abs(x - selection.startX);
        const height = Math.abs(y - selection.startY);

        setSelection({
            ...selection,
            x: boxX,
            y: boxY,
            width,
            height,
        });
    };

    const onMouseUp = (e: any) => {
        if (isPanning) return;

        if (drawingLine) {
            saveHistory();
            const newLine: LineData = {
                id: `line-${Date.now()}`,
                x: 0,
                y: 0,
                points: [drawingLine.startX, drawingLine.startY, drawingLine.endX, drawingLine.endY],
                stroke: 'black',
                strokeWidth: 2,
                type: mode as 'line' | 'arrow'
            };
            setLines(prev => [...prev, newLine]);
            setDrawingLine(null);
            return;
        }

        if (!selection || !selection.isSelecting) return;

        const selBox = {
            x1: selection.x,
            y1: selection.y,
            x2: selection.x + selection.width,
            y2: selection.y + selection.height,
        };

        const newSelected = new Set(selectedIds);
        circles.forEach((circle) => {
            const r = circle.radius;
            const cBox = { x1: circle.x - r, y1: circle.y - r, x2: circle.x + r, y2: circle.y + r };
            if (selBox.x1 < cBox.x2 && selBox.x2 > cBox.x1 && selBox.y1 < cBox.y2 && selBox.y2 > cBox.y1) {
                newSelected.add(circle.id);
            }
        });
        rects.forEach((r) => {
            if (
                selBox.x1 < r.x + r.width &&
                selBox.x2 > r.x &&
                selBox.y1 < r.y + r.height &&
                selBox.y2 > r.y
            ) {
                newSelected.add(r.id);
            }
        });
        texts.forEach((t) => {
            // Simple point check not enough, approximate box
            // Use approximate width if not known, or shapeRef if available?
            // Let's assume some width/height for hit test or use logic similar to others
            const node = shapeRefs.current[t.id];
            let width = 100;
            let height = 20;
            if (node) {
                width = node.width() * node.scaleX();
                height = node.height() * node.scaleY();
            }

            if (
                selBox.x1 < t.x + width &&
                selBox.x2 > t.x &&
                selBox.y1 < t.y + height &&
                selBox.y2 > t.y
            ) {
                newSelected.add(t.id);
            }
        });
        lines.forEach((line) => {
            const x1 = line.points[0] + line.x;
            const y1 = line.points[1] + line.y;
            const x2 = line.points[2] + line.x;
            const y2 = line.points[3] + line.y;
            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2);
            const minY = Math.min(y1, y2);
            const maxY = Math.max(y1, y2);
            if (selBox.x1 < maxX && selBox.x2 > minX && selBox.y1 < maxY && selBox.y2 > minY) {
                newSelected.add(line.id);
            }
        });

        images.forEach((i) => {
            if (
                selBox.x1 < i.x + i.width &&
                selBox.x2 > i.x &&
                selBox.y1 < i.y + i.height &&
                selBox.y2 > i.y
            ) {
                newSelected.add(i.id);
            }
        });

        setSelectedIds(newSelected);
        setSelection(null);
    };

    const handleDragStart = (id: string, e: any) => {
        if (mode !== 'select' || isPanning || editingId) return;
        saveHistory();

        if (!selectedIds.has(id)) {
            setSelectedIds(new Set([id]));
        }

        // Store initial positions for all selected items
        const newSelectedIds = selectedIds.has(id) ? selectedIds : new Set([id]);

        newSelectedIds.forEach(selectedId => {
            const node = shapeRefs.current[selectedId];
            if (node) {
                node.setAttr('startPos', { x: node.x(), y: node.y() });
            }
        });
    };

    const handleDragMove = (id: string, e: any) => {
        if (mode !== 'select' || isPanning || editingId) return;
        // If dragging an item that is not selected, select it (handled in dragStart, but safety check)

        const draggedNode = e.target;
        const startPos = draggedNode.getAttr('startPos');
        if (!startPos) return;

        const dx = draggedNode.x() - startPos.x;
        const dy = draggedNode.y() - startPos.y;

        selectedIds.forEach(selectedId => {
            if (selectedId !== id) {
                const node = shapeRefs.current[selectedId];
                const nodeStartPos = node?.getAttr('startPos');
                if (node && nodeStartPos) {
                    node.x(nodeStartPos.x + dx);
                    node.y(nodeStartPos.y + dy);
                }
            }
        });
    };

    const handleDragEnd = (id: string, e: any) => {
        if (mode !== 'select' || isPanning || editingId) return;

        // Synchronize state with Konva nodes
        const newSelectedIds = selectedIds.has(id) ? selectedIds : new Set([id]);

        setCircles(prev => prev.map(c => {
            if (newSelectedIds.has(c.id)) {
                const node = shapeRefs.current[c.id];
                return node ? { ...c, x: node.x(), y: node.y() } : c;
            }
            return c;
        }));
        setLines(prev => prev.map(l => {
            if (newSelectedIds.has(l.id)) {
                const node = shapeRefs.current[l.id];
                return node ? { ...l, x: node.x(), y: node.y() } : l;
            }
            return l;
        }));
        setRects(prev => prev.map(r => {
            if (newSelectedIds.has(r.id)) {
                const node = shapeRefs.current[r.id];
                return node ? { ...r, x: node.x(), y: node.y() } : r;
            }
            return r;
        }));
        setTexts(prev => prev.map(t => {
            if (newSelectedIds.has(t.id)) {
                const node = shapeRefs.current[t.id];
                return node ? { ...t, x: node.x(), y: node.y() } : t;
            }
            return t;
        }));
        setImages(prev => prev.map(i => {
            if (newSelectedIds.has(i.id)) {
                const node = shapeRefs.current[i.id];
                return node ? { ...i, x: node.x(), y: node.y() } : i;
            }
            return i;
        }));
    };

    const getSurfacePoint = (c1: CircleData, c2: CircleData) => {
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const angle = Math.atan2(dy, dx);

        const startX = c1.x + c1.radius * Math.cos(angle);
        const startY = c1.y + c1.radius * Math.sin(angle);

        const endX = c2.x - c2.radius * Math.cos(angle);
        const endY = c2.y - c2.radius * Math.sin(angle);

        return { startX, startY, endX, endY };
    };

    const handleClick = (id: string, e: any) => {
        e.cancelBubble = true;
        if (editingId) return;

        // Handle Text Edit on Double Click or specific interaction?
        // User said "Standalone text tool", but didn't specify editing existing text.
        // Assuming behaves like rect: e.g. 'c' key or double click?
        // Or maybe just let 'c' work for text too? 
        // Let's make 'c' work for selected text (user asked for 'c' on rect, but probably expects editing text to work similarly).
        // Or maybe double click is better UX, but let's stick to consistent key commands or added clicking logic.
        // For now, if I click a text object, just select it.
        // If I want to edit it, I might implementation 'c' key for it too or double click.
        // I'll add 'c' key support for TextData in handleKeyDown.

        if (mode === 'line' || mode === 'arrow') {
            const circle = circles.find(c => c.id === id);
            if (!circle) return;

            if (tempLineStartId === null) {
                setTempLineStartId(id);
            } else {
                if (tempLineStartId === id) {
                    setTempLineStartId(null);
                    return;
                }

                const startCircle = circles.find(c => c.id === tempLineStartId);
                if (startCircle) {
                    saveHistory();

                    const { startX, startY, endX, endY } = getSurfacePoint(startCircle, circle);

                    const newLine: LineData = {
                        id: `line-${Date.now()}`,
                        x: 0,
                        y: 0,
                        points: [startX, startY, endX, endY],
                        stroke: 'black',
                        strokeWidth: 2,
                        type: mode as 'line' | 'arrow'
                    };
                    setLines(prev => [...prev, newLine]);
                }
                setTempLineStartId(null);
            }
            return;
        }

        const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
        const isSelected = selectedIds.has(id);

        if (!metaPressed) {
            if (!isSelected) {
                setSelectedIds(new Set([id]));
            }
        } else {
            const newSelected = new Set(selectedIds);
            if (isSelected) {
                newSelected.delete(id);
            } else {
                newSelected.add(id);
            }
            setSelectedIds(newSelected);
        }
    };

    // Add 'c' key support for editing existing Text Objects
    // Update handleKeyDown logic for 'c' key... (Done below inside the component update)

    if (size.width === 0) {
        return <div>Loading Whiteboard...</div>;
    }

    let modeText = '👆 Select';
    let modeHint = '(Undo: Ctrl+Z, Space to Pan)';
    if (mode === 'line') {
        modeText = '📏 Line';
        modeHint = tempLineStartId ? 'Select second circle' : 'Drag to draw line / Select circle';
    } else if (mode === 'arrow') {
        modeText = '🏹 Arrow';
        modeHint = tempLineStartId ? 'Select second circle' : 'Drag to draw arrow / Select circle';
    } else if (mode === 'text') {
        modeText = '📝 Text';
        modeHint = 'Click anywhere to type';
    }

    const currentEditingRect = rects.find(r => r.id === editingId);
    const currentEditingText = texts.find(t => t.id === editingId);
    const currentEditingCircle = circles.find(c => c.id === editingId);

    const isEditingRect = !!currentEditingRect;
    const isEditingCircle = !!currentEditingCircle;

    // Determine initial value based on what we are editing
    const editingValue = isEditingRect ? currentEditingRect.text
        : isEditingCircle ? currentEditingCircle.text
            : currentEditingText?.text;

    return (
        <>
            <div className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded shadow border z-10 flex flex-col items-center select-none pointer-events-none">
                <div className="pointer-events-auto">
                    Current Mode: <span className="font-bold">{modeText}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                    {isPanning ? '🖐 Panning...' : modeHint}
                </div>
            </div>

            {/* Session Management UI */}
            <div className="absolute top-4 left-4 flex gap-2 z-10">
                <button
                    onClick={handleSave}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded shadow text-sm font-medium"
                >
                    Save
                </button>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded shadow text-sm font-medium"
                >
                    Load
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLoad}
                    accept=".json"
                    className="hidden"
                />
                <button
                    onClick={handleClear}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow text-sm font-medium"
                >
                    Clear
                </button>
            </div>

            {/* Inline Text Area */}
            {editingId && editPos && (currentEditingRect || currentEditingText || currentEditingCircle) && (
                <textarea
                    ref={textareaRef}
                    value={editingValue || ""}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (isEditingRect) {
                            setRects(prev => prev.map(r => r.id === editingId ? { ...r, text: val } : r));
                        } else if (isEditingCircle) {
                            setCircles(prev => prev.map(c => c.id === editingId ? { ...c, text: val } : c));
                        } else {
                            setTexts(prev => prev.map(t => t.id === editingId ? { ...t, text: val } : t));
                        }
                    }}
                    onBlur={() => {
                        // If text object is empty on blur, maybe delete it?
                        // Keeping it simple for now.
                        setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            setEditingId(null);
                        }
                    }}
                    style={{
                        position: 'absolute',
                        left: editPos.x,
                        top: editPos.y,
                        width: (isEditingRect || isEditingCircle) ? editPos.w : 'auto',
                        height: (isEditingRect || isEditingCircle) ? editPos.h : 'auto',
                        minWidth: (isEditingRect || isEditingCircle) ? undefined : '200px', // Min width for text tool
                        fontSize: (isEditingRect || isEditingCircle) ? 18 : (currentEditingText?.fontSize || 20),
                        textAlign: (isEditingRect || isEditingCircle) ? 'center' : 'left',
                        border: '1px solid #3b82f6',
                        outline: 'none',
                        background: 'transparent',
                        resize: 'none',
                        overflow: 'hidden',
                        zIndex: 20,
                        padding: 0,
                        paddingTop: (isEditingRect || isEditingCircle) ? Math.max(0, (editPos.h - (editingValue?.split('\n').length || 1) * 22) / 2) : 0,
                        lineHeight: '22px',
                        fontFamily: 'Consolas, monospace',
                        color: (isEditingRect || isEditingCircle) ? 'black' : (currentEditingText?.fill || 'black')
                    }}
                />
            )}

            <Stage
                width={size.width}
                height={size.height}
                ref={stageRef}
                draggable={isPanning}
                className={`bg-white touch-none ${isPanning ? 'cursor-grab active:cursor-grabbing' : (mode === 'text' ? 'cursor-text' : (mode !== 'select' ? 'cursor-crosshair' : 'cursor-default'))}`}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onTouchStart={onMouseDown}
                onTouchMove={onMouseMove}
                onTouchEnd={onMouseUp}
            >
                <Layer>
                    {/* Rects */}
                    {rects.map((rect) => {
                        const isSelected = selectedIds.has(rect.id);
                        const isEditing = editingId === rect.id;

                        return (
                            <Group
                                key={rect.id}
                                ref={(node) => {
                                    if (node) shapeRefs.current[rect.id] = node;
                                    else delete shapeRefs.current[rect.id];
                                }}
                                x={rect.x}
                                y={rect.y}
                                draggable={mode === 'select' && !isPanning && !isEditing}
                                onClick={(e) => {
                                    if (!isPanning) handleClick(rect.id, e)
                                }}
                                onDragStart={(e) => handleDragStart(rect.id, e)}
                                onDragMove={(e) => handleDragMove(rect.id, e)}
                                onDragEnd={(e) => handleDragEnd(rect.id, e)}
                                onTransformEnd={handleTransformEnd}
                            >
                                <Rect
                                    width={rect.width}
                                    height={rect.height}
                                    stroke={isSelected ? "#3b82f6" : (rect.stroke || "black")}
                                    strokeWidth={isSelected ? 4 : 2}
                                />
                                {!isEditing && (
                                    <Text
                                        text={rect.text || ""}
                                        fontSize={18}
                                        fill="black"
                                        width={rect.width}
                                        height={rect.height}
                                        align="center"
                                        verticalAlign="middle"
                                        listening={false}
                                        fontFamily="Consolas, monospace"
                                    />
                                )}
                            </Group>
                        );
                    })}

                    {/* Standalone Texts */}
                    {texts.map((textItem) => {
                        const isSelected = selectedIds.has(textItem.id);
                        const isEditing = editingId === textItem.id;

                        return (
                            <Group
                                key={textItem.id}
                                ref={(node) => {
                                    if (node) shapeRefs.current[textItem.id] = node;
                                    else delete shapeRefs.current[textItem.id];
                                }}
                                x={textItem.x}
                                y={textItem.y}
                                draggable={mode === 'select' && !isPanning && !isEditing}
                                onClick={(e) => {
                                    if (!isPanning) handleClick(textItem.id, e)
                                }}
                                onDragStart={(e) => handleDragStart(textItem.id, e)}
                                onDragMove={(e) => handleDragMove(textItem.id, e)}
                                onDragEnd={(e) => handleDragEnd(textItem.id, e)}
                                onTransformEnd={handleTransformEnd}
                            >
                                {!isEditing && (
                                    <>
                                        {/* Selection Border (Invisible unless selected) */}
                                        {isSelected && (
                                            <Rect
                                                width={shapeRefs.current[textItem.id]?.width() || 0}
                                                height={shapeRefs.current[textItem.id]?.height() || 0}
                                                stroke="#3b82f6"
                                                strokeWidth={1}
                                                dash={[5, 5]}
                                            />
                                        )}
                                        <Text
                                            text={textItem.text || "Type..."}
                                            fontSize={textItem.fontSize}
                                            fill={textItem.fill}
                                            align="left"
                                            fontFamily="Consolas, monospace"
                                        />
                                    </>
                                )}
                            </Group>
                        )
                    })}

                    {lines.map((line) => {
                        const isSelected = selectedIds.has(line.id);
                        const props = {
                            ref: (node: any) => {
                                if (node) shapeRefs.current[line.id] = node;
                                else delete shapeRefs.current[line.id];
                            },
                            x: line.x,
                            y: line.y,
                            points: line.points,
                            stroke: isSelected ? "#3b82f6" : line.stroke,
                            strokeWidth: isSelected ? 4 : line.strokeWidth,
                            hitStrokeWidth: 10,
                            tension: 0,
                            draggable: mode === 'select' && !isPanning,
                            onClick: (e: any) => {
                                if (mode === 'select' && !isPanning) handleClick(line.id, e);
                            },
                            onDragStart: (e: any) => handleDragStart(line.id, e),
                            onDragMove: (e: any) => handleDragMove(line.id, e),
                            onDragEnd: (e: any) => handleDragEnd(line.id, e)
                        };

                        if (line.type === 'arrow') {
                            return <Arrow key={line.id} {...props} pointerLength={10} pointerWidth={10} fill={isSelected ? "#3b82f6" : (line.stroke || "black")} />;
                        } else {
                            return <Line key={line.id} {...props} />;
                        }
                    })}

                    {/* Drawing Line Preview */}
                    {drawingLine && (
                        mode === 'arrow' ? (
                            <Arrow
                                points={[drawingLine.startX, drawingLine.startY, drawingLine.endX, drawingLine.endY]}
                                stroke="black"
                                strokeWidth={2}
                                pointerLength={10}
                                pointerWidth={10}
                                fill="black"
                            />
                        ) : (
                            <Line
                                points={[drawingLine.startX, drawingLine.startY, drawingLine.endX, drawingLine.endY]}
                                stroke="black"
                                strokeWidth={2}
                            />
                        )
                    )}

                    {circles.map((circle) => {
                        const isSelected = selectedIds.has(circle.id);
                        const isConnectStart = circle.id === tempLineStartId;
                        return (
                            <Group
                                key={circle.id}
                                ref={(node) => {
                                    if (node) shapeRefs.current[circle.id] = node;
                                    else delete shapeRefs.current[circle.id];
                                }}
                                x={circle.x}
                                y={circle.y}
                                draggable={mode === 'select' && !isPanning}
                                onClick={(e) => {
                                    if (!isPanning) handleClick(circle.id, e)
                                }}
                                onDragStart={(e) => handleDragStart(circle.id, e)}
                                onDragMove={(e) => handleDragMove(circle.id, e)}
                                onDragEnd={(e) => handleDragEnd(circle.id, e)}
                                onTransformEnd={handleTransformEnd}
                            >
                                <Circle
                                    radius={circle.radius}
                                    stroke={isSelected || isConnectStart ? "#3b82f6" : (circle.stroke || "black")}
                                    strokeWidth={isSelected || isConnectStart ? 4 : 2}
                                    fill={isConnectStart ? "rgba(59, 130, 246, 0.1)" : undefined}
                                />
                                <Text
                                    text={circle.text}
                                    fontSize={21}
                                    fill="black"
                                    align="center"
                                    verticalAlign="middle"
                                    offsetX={15}
                                    offsetY={10.5}
                                    width={30}
                                    height={21}
                                    listening={false}
                                    fontFamily="Consolas, monospace"
                                />
                            </Group>
                        );
                    })}

                    {images.map((image) => {
                        const isSelected = selectedIds.has(image.id);
                        return (
                            <Group
                                key={image.id}
                                x={image.x}
                                y={image.y}
                                ref={(node) => {
                                    if (node) shapeRefs.current[image.id] = node;
                                    else delete shapeRefs.current[image.id];
                                }}
                                draggable={mode === 'select' && !isPanning}
                                onClick={(e) => {
                                    if (!isPanning) handleClick(image.id, e)
                                }}
                                onDragStart={(e) => handleDragStart(image.id, e)}
                                onDragMove={(e) => handleDragMove(image.id, e)}
                                onDragEnd={(e) => handleDragEnd(image.id, e)}
                                onTransformEnd={handleTransformEnd}
                            >
                                <URLImage image={image} />
                            </Group>
                        );
                    })}

                    <Transformer
                        ref={trRef}
                        boundBoxFunc={(oldBox, newBox) => {
                            // limit resize
                            if (newBox.width < 5 || newBox.height < 5) {
                                return oldBox;
                            }
                            return newBox;
                        }}
                    />

                    {selection && selection.isSelecting && !isPanning && (
                        <Rect
                            x={selection.x}
                            y={selection.y}
                            width={selection.width}
                            height={selection.height}
                            fill="rgba(59, 130, 246, 0.2)"
                            stroke="#3b82f6"
                            listening={false}
                        />
                    )}
                </Layer>
            </Stage>
        </>
    );
};

export default Whiteboard;
