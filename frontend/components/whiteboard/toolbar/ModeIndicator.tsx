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
        <div className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded shadow border z-10 flex flex-col items-center select-none pointer-events-none">
            <div className="pointer-events-auto">
                Current Mode: <span className="font-bold">{modeText}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
                {isPanning ? '🖐 Panning...' : modeHint}
            </div>
        </div>
    );
};

export default ModeIndicator;
