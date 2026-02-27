'use client';
import { useRef, useState, useEffect } from 'react';
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
    themeColor: string;
    shapeRef: (node: Konva.Group | null) => void;
    onClick: (e: KonvaEventObject<MouseEvent>) => void;
    onDragStart: (e: KonvaEventObject<DragEvent>) => void;
    onDragMove: (e: KonvaEventObject<DragEvent>) => void;
    onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
    onTransformEnd: () => void;
}

const TextShape = ({
    textItem, isSelected, isEditing, mode, isPanning,
    themeColor,
    shapeRef, onClick, onDragStart, onDragMove, onDragEnd, onTransformEnd,
}: TextShapeProps) => {
    // 선택 테두리 크기 측정용 내부 ref
    const textNodeRef = useRef<Konva.Text>(null);
    const [textSize, setTextSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (textNodeRef.current) {
            setTextSize({
                width: textNodeRef.current.width(),
                height: textNodeRef.current.height(),
            });
        }
    }, [textItem.text, textItem.fontSize]);

    // Helper to determine if a color should be treated as the theme's foreground
    const isThemeForeground = (color: string | undefined) => {
        if (!color) return true;
        const c = color.toLowerCase();
        return c === 'black' || c === '#171717' || c === '#000000' || c === '#000';
    };

    const textColor = isThemeForeground(textItem.fill) ? themeColor : textItem.fill;

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
                            width={textSize.width || 0}
                            height={textSize.height || 0}
                            stroke="#3b82f6"
                            strokeWidth={1}
                            dash={[5, 5]}
                        />
                    )}
                    <Text
                        ref={textNodeRef}
                        text={textItem.text || 'Type...'}
                        fontSize={textItem.fontSize}
                        fill={textColor || themeColor}
                        align="left"
                        fontFamily="Consolas, monospace"
                    />
                </>
            )}
        </Group>
    );
};

export default TextShape;
