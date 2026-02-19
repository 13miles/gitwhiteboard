'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { WhiteboardState } from '@/types';
import { MAX_HISTORY_SIZE } from '@/constants/shapes';

/**
 * 화이트보드 undo 히스토리 훅.
 * stateRef 패턴으로 stale closure 없이 최신 상태를 스냅샷.
 */
export function useHistory(currentState: WhiteboardState) {
    const [history, setHistory] = useState<WhiteboardState[]>([]);
    const stateRef = useRef(currentState);

    // 매 렌더마다 최신 상태로 동기화
    useEffect(() => {
        stateRef.current = currentState;
    });

    const saveHistory = useCallback(() => {
        setHistory(prev => [
            ...prev.slice(-(MAX_HISTORY_SIZE - 1)),
            structuredClone(stateRef.current),
        ]);
    }, []);

    /**
     * 이전 상태 복원. applyState 콜백으로 훅이 개별 setter를 알 필요 없음.
     */
    const undo = useCallback((applyState: (state: WhiteboardState) => void) => {
        setHistory(prev => {
            if (prev.length === 0) return prev;
            applyState(prev[prev.length - 1]);
            return prev.slice(0, -1);
        });
    }, []);

    return { history, saveHistory, undo };
}
