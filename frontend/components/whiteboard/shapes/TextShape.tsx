'use client';
import { useRef } from 'react';
import { Group, Rect, Text } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { TextData, WhiteboardMode } from '@/types';

interface TextShapeProps {
    textItem: TextData;
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

const TextShape = ({
    textItem, isSelected, isEditing, mode, isPanning,
    shapeRef, onClick, onDragStart, onDragMove, onDragEnd, onTransformEnd,
}: TextShapeProps) => {
    // 선택 테두리 크기 측정용 내부 ref
    const textNodeRef = useRef<Konva.Text>(null);

    return (
        <Group
            ref={shapeRef}
            x={textItem.x}
            y={textItem.y}
            draggable={mode === 'select' && !isPanning && !isEditing}
            onClick={onClick}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onTransformEnd={onTransformEnd}
        >
            {!isEditing && (
                <>
                    {isSelected && (
                        <Rect
                            width={textNodeRef.current?.width() || 0}
                            height={textNodeRef.current?.height() || 0}
                            stroke="#3b82f6"
                            strokeWidth={1}
                            dash={[5, 5]}
                        />
                    )}
                    <Text
                        ref={textNodeRef}
                        text={textItem.text || 'Type...'}
                        fontSize={textItem.fontSize}
                        fill={textItem.fill}
                        align="left"
                        fontFamily="Consolas, monospace"
                    />
                </>
            )}
        </Group>
    );
};

export default TextShape;
