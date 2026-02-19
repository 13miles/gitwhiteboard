'use client';
import { Group, Rect, Text } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { RectData, WhiteboardMode } from '@/types';
import { RECT_TEXT_FONT_SIZE } from '@/constants/shapes';

interface RectShapeProps {
    rect: RectData;
    isSelected: boolean;
    isEditing: boolean;
    mode: WhiteboardMode;
    isPanning: boolean;
    shapeRef: (node: Konva.Group | null) => void;
    onClick: (e: KonvaEventObject<MouseEvent>) => void;
    onDragStart: (e: KonvaEventObject<DragEvent>) => void;
    onDragMove: (e: KonvaEventObject<DragEvent>) => void;
    onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
    onTransformEnd: () => void;
}

const RectShape = ({
    rect, isSelected, isEditing, mode, isPanning,
    shapeRef, onClick, onDragStart, onDragMove, onDragEnd, onTransformEnd,
}: RectShapeProps) => (
    <Group
        ref={shapeRef}
        x={rect.x}
        y={rect.y}
        draggable={mode === 'select' && !isPanning && !isEditing}
        onClick={onClick}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
    >
        <Rect
            x={0}
            y={0}
            width={rect.width}
            height={rect.height}
            stroke={isSelected ? '#3b82f6' : (rect.stroke || 'black')}
            strokeWidth={isSelected ? 4 : 2}
        />
        {!isEditing && (
            <Text
                text={rect.text || ''}
                fontSize={RECT_TEXT_FONT_SIZE}
                fill="black"
                width={rect.width}
                height={rect.height}
                align="center"
                verticalAlign="middle"
                listening={false}
                fontFamily="Consolas, monospace"
            />
        )}
    </Group>
);

export default RectShape;
