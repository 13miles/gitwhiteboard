'use client';

import dynamic from 'next/dynamic';

const Whiteboard = dynamic(() => import('@/components/Whiteboard'), {
  ssr: false,
  loading: () => <p className="p-4">Loading Whiteboard...</p>,
});

const ShortcutHelp = dynamic(() => import('@/components/whiteboard/ShortcutHelp'), { ssr: false });

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden bg-gray-100">
      <Whiteboard />
      <ShortcutHelp />
    </main>
  );
}
