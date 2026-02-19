'use client';
import { Group, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import useImage from 'use-image';
import type { ImageData, WhiteboardMode } from '@/types';

interface ImageShapeProps {
    image: ImageData;
    isSelected: boolean;
    mode: WhiteboardMode;
    isPanning: boolean;
    shapeRef: (node: Konva.Group | null) => void;
    onClick: (e: KonvaEventObject<MouseEvent>) => void;
    onDragStart: (e: KonvaEventObject<DragEvent>) => void;
    onDragMove: (e: KonvaEventObject<DragEvent>) => void;
    onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
    onTransformEnd: () => void;
}

// x/y 위치는 부모 Group이 담당하므로 여기서는 0으로 고정
const ImageCanvas = ({ src, width, height }: { src: string; width: number; height: number }) => {
    const [img] = useImage(src);
    return <KonvaImage image={img} x={0} y={0} width={width} height={height} />;
};

const ImageShape = ({
    image, mode, isPanning,
    shapeRef, onClick, onDragStart, onDragMove, onDragEnd, onTransformEnd,
}: ImageShapeProps) => (
    <Group
        ref={shapeRef}
        x={image.x}
        y={image.y}
        draggable={mode === 'select' && !isPanning}
        onClick={onClick}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
    >
        <ImageCanvas src={image.src} width={image.width} height={image.height} />
    </Group>
);

export default ImageShape;
