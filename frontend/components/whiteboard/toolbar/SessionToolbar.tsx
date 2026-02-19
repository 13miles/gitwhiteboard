'use client';
import { RefObject } from 'react';

interface SessionToolbarProps {
    onSave: () => void;
    onLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
    fileInputRef: RefObject<HTMLInputElement | null>;
}

const SessionToolbar = ({ onSave, onLoad, onClear, fileInputRef }: SessionToolbarProps) => (
    <div className="absolute top-4 left-4 flex gap-2 z-10">
        <button
            onClick={onSave}
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
