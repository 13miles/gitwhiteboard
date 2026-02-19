'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { WhiteboardState } from '@/types';

interface UsePersistenceOptions {
    circles: WhiteboardState['circles'];
    lines: WhiteboardState['lines'];
    rects: WhiteboardState['rects'];
    texts: WhiteboardState['texts'];
    images: WhiteboardState['images'];
    onApplyState: (partial: Partial<WhiteboardState>) => void;
    beforeLoad?: () => void;
}

/**
 * localStorage 저장/로드 및 파일 I/O 훅.
 */
export function usePersistence({
    circles, lines, rects, texts, images,
    onApplyState, beforeLoad,
}: UsePersistenceOptions) {
    const [isLoaded, setIsLoaded] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const onApplyStateRef = useRef(onApplyState);

    useEffect(() => { onApplyStateRef.current = onApplyState; });

    // 마운트 시 localStorage에서 로드
    useEffect(() => {
        const savedData = localStorage.getItem('whiteboard-data');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed && typeof parsed === 'object') {
                    onApplyStateRef.current(parsed);
                }
            } catch (e) {
                console.error('Failed to load whiteboard data', e);
            }
        }
        setIsLoaded(true);
    }, []);

    // 상태 변경 시 localStorage에 저장
    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem('whiteboard-data', JSON.stringify({ circles, lines, rects, texts, images }));
    }, [circles, lines, rects, texts, images, isLoaded]);

    const handleSave = useCallback(() => {
        const data = { circles, lines, rects, texts, images };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `whiteboard-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [circles, lines, rects, texts, images]);

    const handleLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target?.result as string);
                if (parsed && typeof parsed === 'object') {
                    beforeLoad?.();
                    onApplyStateRef.current(parsed);
                }
            } catch {
                alert('Failed to load file: Invalid JSON');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }, [beforeLoad]);

    return { isLoaded, fileInputRef, handleSave, handleLoad };
}
