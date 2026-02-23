'use client';
import { Group, Circle, Text } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { CircleData, WhiteboardMode } from '@/types';
import { CIRCLE_TEXT_FONT_SIZE } from '@/constants/shapes';

interface CircleShapeProps {
    circle: CircleData;
    isSelected: boolean;
    isConnectStart: boolean;
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

const CircleShape = ({
    circle, isSelected, isConnectStart, mode, isPanning,
    themeColor, theme,
    shapeRef, onClick, onDragStart, onDragMove, onDragEnd, onTransformEnd,
}: CircleShapeProps) => {
    // Helper to determine if a color should be treated as the theme's foreground
    const isThemeForeground = (color: string | undefined) => {
        if (!color) return true;
        const c = color.toLowerCase();
        return c === 'black' || c === '#171717' || c === '#000000' || c === '#000';
    };

    // Helper to determine if a color should be treated as the theme's background
    const isThemeBackground = (color: string | undefined) => {
        if (!color) return false;
        const c = color.toLowerCase();
        return c === 'white' || c === '#ffffff' || c === '#fff' || c === '#ededed';
    };

    const strokeColor = isSelected || isConnectStart ? '#eab308' : (isThemeForeground(circle.stroke) ? themeColor : (isThemeBackground(circle.stroke) && theme === 'dark' ? '#171717' : circle.stroke));
    const textColor = isThemeForeground(circle.textFill) ? themeColor : (isThemeBackground(circle.textFill) && theme === 'dark' ? '#171717' : circle.textFill);

    return (
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
                stroke={strokeColor || themeColor}
                strokeWidth={isSelected || isConnectStart ? 4 : 2}
                fill={isConnectStart ? 'rgba(234, 179, 8, 0.2)' : (circle.fill || 'transparent')}
            />
            <Text
                text={circle.text}
                fontSize={CIRCLE_TEXT_FONT_SIZE}
                fill={textColor || themeColor}
                align="center"
                verticalAlign="middle"
                offsetY={circle.radius}
                offsetX={circle.radius}
                width={circle.radius * 2}
                height={circle.radius * 2}
                wrap="word"
                listening={false}
                fontFamily="Consolas, monospace"
            />
        </Group>
    );
};

export default CircleShape;
