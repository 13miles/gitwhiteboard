'use client';
import { Group, Circle, Text } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { CircleData, WhiteboardMode } from '@/types';
import { CIRCLE_TEXT_FONT_SIZE, CIRCLE_TEXT_WIDTH, CIRCLE_TEXT_HEIGHT, CIRCLE_TEXT_OFFSET_X, CIRCLE_TEXT_OFFSET_Y } from '@/constants/shapes';

interface CircleShapeProps {
    circle: CircleData;
    isSelected: boolean;
    isConnectStart: boolean;
    mode: WhiteboardMode;
    isPanning: boolean;
    shapeRef: (node: Konva.Group | null) => void;
    onClick: (e: KonvaEventObject<MouseEvent>) => void;
    onDragStart: (e: KonvaEventObject<DragEvent>) => void;
    onDragMove: (e: KonvaEventObject<DragEvent>) => void;
    onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
    onTransformEnd: () => void;
}

const CircleShape = ({
    circle, isSelected, isConnectStart, mode, isPanning,
    shapeRef, onClick, onDragStart, onDragMove, onDragEnd, onTransformEnd,
}: CircleShapeProps) => (
    <Group
        ref={shapeRef}
        x={circle.x}
        y={circle.y}
        draggable={mode === 'select' && !isPanning}
        onClick={onClick}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
    >
        <Circle
            x={0}
            y={0}
            radius={circle.radius}
            stroke={isSelected || isConnectStart ? '#3b82f6' : (circle.stroke || 'black')}
            strokeWidth={isSelected || isConnectStart ? 4 : 2}
            fill={isConnectStart ? 'rgba(59, 130, 246, 0.1)' : undefined}
        />
        <Text
            text={circle.text}
            fontSize={CIRCLE_TEXT_FONT_SIZE}
            fill="black"
            align="center"
            verticalAlign="middle"
            offsetX={CIRCLE_TEXT_OFFSET_X}
            offsetY={CIRCLE_TEXT_OFFSET_Y}
            width={CIRCLE_TEXT_WIDTH}
            height={CIRCLE_TEXT_HEIGHT}
            listening={false}
            fontFamily="Consolas, monospace"
        />
    </Group>
);

export default CircleShape;
