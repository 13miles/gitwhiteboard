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
    themeColor: string;
    theme: 'light' | 'dark';
    shapeRef: (node: Konva.Group | null) => void;
    onClick: (e: KonvaEventObject<MouseEvent>) => void;
    onDragStart: (e: KonvaEventObject<DragEvent>) => void;
    onDragMove: (e: KonvaEventObject<DragEvent>) => void;
    onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
    onTransformEnd: () => void;
}

const RectShape = ({
    rect, isSelected, isEditing, mode, isPanning,
    themeColor, theme,
    shapeRef, onClick, onDragStart, onDragMove, onDragEnd, onTransformEnd,
}: RectShapeProps) => {
    // Helper to determine if a color should be treated as the theme's foreground (black/white-ish)
    const isThemeForeground = (color: string | undefined) => {
        if (!color) return true;
        const c = color.toLowerCase();
        return c === 'black' || c === '#171717' || c === '#000000' || c === '#000';
    };

    // Helper to determine if a color should be treated as the theme's background (white/black-ish)
    const isThemeBackground = (color: string | undefined) => {
        if (!color) return false;
        const c = color.toLowerCase();
        return c === 'white' || c === '#ffffff' || c === '#fff' || c === '#ededed';
    };

    const strokeColor = isSelected ? '#eab308' : (isThemeForeground(rect.stroke) ? themeColor : (isThemeBackground(rect.stroke) && theme === 'dark' ? '#171717' : rect.stroke));
    const textColor = isThemeForeground(rect.textFill) ? themeColor : (isThemeBackground(rect.textFill) && theme === 'dark' ? '#171717' : rect.textFill);

    return (
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
                stroke={strokeColor || themeColor}
                strokeWidth={isSelected ? 4 : 2}
                fill={rect.fill || 'transparent'}
            />
            {!isEditing && (
                <Text
                    text={rect.text || ''}
                    fontSize={RECT_TEXT_FONT_SIZE}
                    fill={textColor || themeColor}
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
};

export default RectShape;
