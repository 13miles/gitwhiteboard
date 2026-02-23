'use client';
import { RefObject } from 'react';
import ThemeToggle from '@/components/ThemeToggle';

interface SessionToolbarProps {
    onSave: () => void;
    onLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
    fileInputRef: RefObject<HTMLInputElement | null>;
}

const SessionToolbar = ({ onSave, onLoad, onClear, fileInputRef }: SessionToolbarProps) => (
    <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
        <ThemeToggle />
        <button
            onClick={onSave}
            className="text-white px-3 py-1 rounded shadow text-sm font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: '#155dfc' }}
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
            onChange={onLoad}
            accept=".json"
            className="hidden"
        />
        <button
            onClick={onClear}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow text-sm font-medium"
        >
            Clear
        </button>
    </div>
);

export default SessionToolbar;
