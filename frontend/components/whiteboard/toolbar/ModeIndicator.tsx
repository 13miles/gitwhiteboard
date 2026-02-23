'use client';

import type { WhiteboardMode } from '@/types';

interface ModeIndicatorProps {
    mode: WhiteboardMode;
    isPanning: boolean;
    tempLineStartId: string | null;
}

const ModeIndicator = ({ mode, isPanning, tempLineStartId }: ModeIndicatorProps) => {
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

    return (
        <div className="absolute bottom-4 right-4 bg-background px-3 py-1.5 rounded shadow border border-gray-200 dark:border-gray-800 z-10 select-none pointer-events-none flex flex-col items-center whitespace-nowrap">
            <div className="text-xs text-gray-500">
                Current Mode: <span className="font-bold text-foreground">{modeText}</span>
            </div>
            <div className="text-[10px] text-gray-400">
                {isPanning ? '🖐 Panning...' : modeHint}
            </div>
        </div>
    );
};

export default ModeIndicator;
