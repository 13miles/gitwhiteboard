export interface CircleData {
    id: string;
    x: number;
    y: number;
    radius: number;
    text: string;
    stroke?: string;
    fill?: string;
    textFill?: string;
}

export interface RectData {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text?: string;
    stroke?: string;
    fill?: string;
    textFill?: string;
}

export interface ImageData {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    src: string;
}

export interface LineData {
    id: string;
    x: number;
    y: number;
    points: number[];
    stroke: string;
    strokeWidth: number;
    type: 'line' | 'arrow';
}

export interface TextData {
    id: string;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fill: string;
}

export interface WhiteboardState {
    circles: CircleData[];
    lines: LineData[];
    rects: RectData[];
    texts: TextData[];
    images: ImageData[];
}

export type WhiteboardMode = 'select' | 'line' | 'arrow' | 'text';
