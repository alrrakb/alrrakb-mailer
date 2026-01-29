import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { clsx } from 'clsx';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

export default function ResizableImage(props: NodeViewProps) {
    const { node, updateAttributes, selected, editor } = props;
    const [width, setWidth] = useState<number | string>(node.attrs.width || '100%');
    const [isResizing, setIsResizing] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);
    const resizeRef = useRef<{ startX: number, startWidth: number, direction: 'left' | 'right' } | null>(null);

    const setAlign = useCallback((alignment: 'left' | 'center' | 'right') => {
        if (!editor || typeof props.getPos !== 'function') return;

        // Function to safely execute alignment command
        const executeAlign = () => {
            // We need to re-select the image as `splitBlock` might change selection focus
            if (typeof props.getPos === 'function') {
                const newPos = props.getPos();
                /* 
                   Validation: getPos() returns number | boolean. 
                   If boolean, it means the node is not in the doc.
                */
                if (typeof newPos === 'number') {
                    editor.chain().setNodeSelection(newPos).setTextAlign(alignment).run();
                }
            }
        };

        const pos = props.getPos();
        if (typeof pos === 'number') {
            const $pos = editor.state.doc.resolve(pos);
            const parent = $pos.parent;
            const isIsolated = parent.childCount === 1;

            if (!isIsolated) {
                // Need to split. We use safe `splitBlock` commands.
                const chain = editor.chain();

                // Split After? If not at end block
                if ($pos.parentOffset + 1 < parent.content.size) {
                    chain.setTextSelection(pos + 1).splitBlock();
                }

                // Split Before? If not at start block
                if ($pos.parentOffset > 0) {
                    // Note: We chain this, relying on Tiptap to handle pos mapping.
                    // Splitting at `pos` moves the current node to the new block start.
                    chain.setTextSelection(pos).splitBlock();
                }

                chain.run();

                // Defer alignment to next tick to ensure model update and correct getPos()
                requestAnimationFrame(() => {
                    executeAlign();
                });
                return;
            }
        }

        // Already isolated or simple case
        executeAlign();

    }, [editor, props.getPos]);

    // Sync local state with node attributes if they change externally (e.g. undo/redo)
    useEffect(() => {
        setWidth(node.attrs.width || '100%');
    }, [node.attrs.width]);

    const handleMouseDown = useCallback((e: React.MouseEvent, direction: 'left' | 'right') => {
        e.preventDefault();
        e.stopPropagation();

        if (!imageRef.current) return;

        setIsResizing(true);
        const startX = e.clientX;
        const startWidth = imageRef.current.offsetWidth;

        resizeRef.current = { startX, startWidth, direction };

        const handleMouseMove = (mvEvent: MouseEvent) => {
            if (!resizeRef.current) return;

            const currentX = mvEvent.clientX;
            const diff = currentX - resizeRef.current.startX;

            let newWidth;
            if (resizeRef.current.direction === 'left') {
                // Moving right (positive diff) means shrinking width
                newWidth = Math.max(50, resizeRef.current.startWidth - diff);
            } else {
                // Moving right (positive diff) means growing width
                newWidth = Math.max(50, resizeRef.current.startWidth + diff);
            }

            setWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);

            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, []);

    // Effect to commit changes when resizing stops
    const lastWidthRef = useRef(width);
    useEffect(() => {
        lastWidthRef.current = width;
    }, [width]);

    useEffect(() => {
        if (!isResizing && lastWidthRef.current !== node.attrs.width) {
            requestAnimationFrame(() => {
                updateAttributes({ width: lastWidthRef.current });
            });
        }
    }, [isResizing, updateAttributes, node.attrs.width]);


    return (
        <NodeViewWrapper as="span" className="relative inline-block leading-none">
            <div className={clsx("relative inline-block transition-[outline]", selected ? "outline outline-2 outline-blue-500 rounded-sm" : "")}>
                <img
                    ref={imageRef}
                    src={node.attrs.src}
                    alt={node.attrs.alt}
                    style={{ width: typeof width === 'number' ? `${width}px` : width, height: 'auto', maxWidth: '100%' }}
                    className={clsx("block rounded-lg transition-opacity", isResizing && "opacity-80")}
                />

                {selected && (
                    <>


                        {/* Left Handle */}
                        <div
                            className="absolute bottom-1 left-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize z-10 shadow-sm hover:scale-110 transition-transform"
                            onMouseDown={(e) => handleMouseDown(e, 'left')}
                            title="Resize"
                        />

                        {/* Right Handle */}
                        <div
                            className="absolute bottom-1 right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize z-10 shadow-sm hover:scale-110 transition-transform"
                            onMouseDown={(e) => handleMouseDown(e, 'right')}
                            title="Resize"
                        />
                    </>
                )}
            </div>
        </NodeViewWrapper>
    );
}
