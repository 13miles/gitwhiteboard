'use client';
import { useState } from 'react';

const ShortcutHelp = () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="fixed bottom-4 left-4 z-20 flex items-end">
            {/* Toggle Button (Left) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center w-5 h-8 bg-transparent hover:bg-gray-100 rounded-l transition-colors duration-200 cursor-pointer ${isOpen ? 'opacity-50 hover:opacity-100' : 'opacity-80'}`}
                title={isOpen ? "접기" : "펼치기"}
            >
                <span className="text-gray-300 hover:text-gray-500 font-bold text-xs transform transition-transform duration-300">
                    {isOpen ? '◀' : '▶'}
                </span>
            </button>

            {/* Content (Right) */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-w-[400px] opacity-100' : 'max-w-0 opacity-0'}`}>
                <div className="bg-white rounded-r shadow-lg border-l border-gray-100 p-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 mb-2">
                        <p className="text-sm font-bold">단축키 도움말</p>
                        <span className="text-xs text-black mt-0.5">{process.env.NEXT_PUBLIC_COMMIT_HASH}</span>
                    </div>
                    <ul className="text-xs list-none space-y-1 text-gray-700">
                        <li><kbd className="font-mono bg-gray-100 px-1 rounded border">C</kbd> 원 생성 &nbsp;<kbd className="font-mono bg-gray-100 px-1 rounded border">R</kbd> 사각형 생성</li>
                        <li><kbd className="font-mono bg-gray-100 px-1 rounded border">RR/RRR</kbd> 큰 사각형 생성</li>
                        <li><kbd className="font-mono bg-gray-100 px-1 rounded border">T</kbd> 텍스트 모드 &nbsp;<kbd className="font-mono bg-gray-100 px-1 rounded border">E</kbd> 편집 (원/사각형)</li>
                        <li><kbd className="font-mono bg-gray-100 px-1 rounded border">L/LL</kbd> 선/화살표 모드</li>
                        <li><kbd className="font-mono bg-gray-100 px-1 rounded border">Space</kbd> 캔버스 이동(Pan)</li>
                        <li><kbd className="font-mono bg-gray-100 px-1 rounded border">D</kbd> / <kbd className="font-mono bg-gray-100 px-1 rounded border">Delete</kbd> 선택 삭제</li>
                        <li><kbd className="font-mono bg-gray-100 px-1 rounded border">A</kbd> 좌측 정렬 &nbsp;<kbd className="font-mono bg-gray-100 px-1 rounded border">Q</kbd> 수직 균등 배분</li>
                        <li><kbd className="font-mono bg-gray-100 px-1 rounded border">S</kbd> 위쪽 정렬 &nbsp;<kbd className="font-mono bg-gray-100 px-1 rounded border">W</kbd> 수평 균등 배분</li>
                        <li><kbd className="font-mono bg-gray-100 px-1 rounded border">1</kbd>~<kbd className="font-mono bg-gray-100 px-1 rounded border">6</kbd> 색상 변경</li>
                        <li><kbd className="font-mono bg-gray-100 px-1 rounded border">Ctrl+C/V</kbd> 복사·붙여넣기</li>
                        <li><kbd className="font-mono bg-gray-100 px-1 rounded border">Ctrl+Z</kbd> 실행 취소</li>
                    </ul>
                </div>
            </div>

            {/* Collapsed state hint (If button is too small or confusing, maybe unnecessary if button is always visible on left) */}
            {/* Since the button is now flex-item on the left, it remains visible even when content collapses (width 0). */}
        </div>
    );
};

export default ShortcutHelp;
