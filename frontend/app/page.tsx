'use client';

import dynamic from 'next/dynamic';

const Whiteboard = dynamic(() => import('@/components/Whiteboard'), {
  ssr: false,
  loading: () => <p className="p-4">Loading Whiteboard...</p>,
});

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden bg-gray-100">
      <Whiteboard />
      <div className="fixed bottom-4 left-4 bg-white p-4 rounded shadow-lg pointer-events-none opacity-80 max-w-xs">
        <p className="text-sm font-bold mb-1">단축키 도움말</p>
        <ul className="text-xs list-none space-y-0.5 text-gray-700">
          <li><kbd className="font-mono bg-gray-100 px-1 rounded">C</kbd> 원 생성 &nbsp;<kbd className="font-mono bg-gray-100 px-1 rounded">R</kbd> 사각형 생성</li>
          <li><kbd className="font-mono bg-gray-100 px-1 rounded">T</kbd> 텍스트 모드 &nbsp;<kbd className="font-mono bg-gray-100 px-1 rounded">L</kbd> 선/화살표 모드</li>
          <li><kbd className="font-mono bg-gray-100 px-1 rounded">Space</kbd> 캔버스 이동(Pan)</li>
          <li><kbd className="font-mono bg-gray-100 px-1 rounded">D</kbd> / <kbd className="font-mono bg-gray-100 px-1 rounded">Delete</kbd> 선택 삭제</li>
          <li><kbd className="font-mono bg-gray-100 px-1 rounded">A</kbd> 좌측 정렬 &nbsp;<kbd className="font-mono bg-gray-100 px-1 rounded">Q</kbd> 수직 균등 배분</li>
          <li><kbd className="font-mono bg-gray-100 px-1 rounded">1</kbd>~<kbd className="font-mono bg-gray-100 px-1 rounded">6</kbd> 색상 변경</li>
          <li><kbd className="font-mono bg-gray-100 px-1 rounded">Ctrl+C/V</kbd> 복사·붙여넣기</li>
          <li><kbd className="font-mono bg-gray-100 px-1 rounded">Ctrl+Z</kbd> 실행 취소</li>
        </ul>
      </div>
    </main>
  );
}
