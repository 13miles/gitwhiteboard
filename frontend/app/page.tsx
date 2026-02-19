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
      <div className="fixed bottom-4 left-4 bg-white p-4 rounded shadow-lg pointer-events-none opacity-80">
        <p className="text-sm font-bold">사용법:</p>
        <ul className="text-sm list-disc pl-4">
          <li>키보드 'c' 키: 원 생성</li>
          <li>마우스 드래그: 원 이동</li>
        </ul>
      </div>
    </main>
  );
}
