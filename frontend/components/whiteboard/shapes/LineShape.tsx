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
    shapeRef: (node: Konva.Line | null) => void;
    onClick: (e: KonvaEventObject<MouseEvent>) => void;
    onDragStart: (e: KonvaEventObject<DragEvent>) => void;
    onDragMove: (e: KonvaEventObject<DragEvent>) => void;
    onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
}

const LineShape = ({
    line, isSelected, mode, isPanning,
    shapeRef, onClick, onDragStart, onDragMove, onDragEnd,
}: LineShapeProps) => {
    const commonProps = {
        ref: shapeRef,
        x: line.x,
        y: line.y,
        points: line.points,
        stroke: isSelected ? '#3b82f6' : line.stroke,
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
                fill={isSelected ? '#3b82f6' : (line.stroke || 'black')}
            />
        );
    }
    return <Line {...commonProps} />;
};

export default LineShape;
