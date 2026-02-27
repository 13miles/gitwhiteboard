'use client';
import { Line, Arrow } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { LineData, WhiteboardMode } from '@/types';
import { LINE_HIT_STROKE_WIDTH, ARROW_POINTER_LENGTH, ARROW_POINTER_WIDTH } from '@/constants/shapes';

interface LineShapeProps {
    line: LineData;
    isSelected: boolean;
    mode: WhiteboardMode;
    isPanning: boolean;
    themeColor: string;
    shapeRef: (node: Konva.Line | null) => void;
    onClick: (e: KonvaEventObject<MouseEvent>) => void;
    onDragStart: (e: KonvaEventObject<DragEvent>) => void;
    onDragMove: (e: KonvaEventObject<DragEvent>) => void;
    onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
}

const LineShape = ({
    line, isSelected, mode, isPanning,
    themeColor,
    shapeRef, onClick, onDragStart, onDragMove, onDragEnd,
}: LineShapeProps) => {
    // Helper to determine if a color should be treated as the theme's foreground
    const isThemeForeground = (color: string | undefined) => {
        if (!color) return true;
        const c = color.toLowerCase();
        return c === 'black' || c === '#171717' || c === '#000000' || c === '#000';
    };

    const strokeColor = isSelected ? '#eab308' : (isThemeForeground(line.stroke) ? themeColor : line.stroke);

    const commonProps = {
        ref: shapeRef,
        x: line.x,
        y: line.y,
        points: line.points,
        stroke: strokeColor || themeColor,
        strokeWidth: isSelected ? 4 : line.strokeWidth,
        hitStrokeWidth: LINE_HIT_STROKE_WIDTH,
        tension: 0,
        draggable: mode === 'select' && !isPanning,
        onClick,
        onDragStart,
        onDragMove,
        onDragEnd,
    };

    if (line.type === 'arrow') {
        return (
            <Arrow
                {...commonProps}
                pointerLength={ARROW_POINTER_LENGTH}
                pointerWidth={ARROW_POINTER_WIDTH}
                fill={strokeColor || themeColor}
            />
        );
    }
    return <Line {...commonProps} />;
};

export default LineShape;
