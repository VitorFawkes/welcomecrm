import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import FeedbackForm from "./FeedbackForm";

interface PanelPosition {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    originX: number;
    originY: number;
}

export function FeedbackPopup() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
    const constraintsRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);

    const calculatePanelPosition = useCallback(() => {
        if (!buttonRef.current) return null;

        const buttonRect = buttonRef.current.getBoundingClientRect();
        const panelWidth = 320;
        const panelHeight = 450;
        const padding = 16;
        const buttonSize = buttonRect.width;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const spaceRight = viewportWidth - buttonRect.right - padding;
        const spaceLeft = buttonRect.left - padding;

        const position: PanelPosition = { originX: 0, originY: 0.5 };

        // Horizontal
        if (spaceRight >= panelWidth) {
            position.left = buttonSize + 8;
            position.originX = 0;
        } else if (spaceLeft >= panelWidth) {
            position.right = buttonSize + 8;
            position.originX = 1;
        } else {
            const centeredLeft = (viewportWidth - panelWidth) / 2 - buttonRect.left;
            position.left = centeredLeft;
            position.originX = 0.5;
        }

        // Vertical
        const idealTop = -panelHeight / 2 + buttonSize / 2;
        const panelTopInViewport = buttonRect.top + idealTop;
        const panelBottomInViewport = panelTopInViewport + panelHeight;

        if (panelTopInViewport < padding) {
            position.top = -buttonRect.top + padding;
            position.originY = 0;
        } else if (panelBottomInViewport > viewportHeight - padding) {
            position.bottom = -(viewportHeight - buttonRect.bottom - padding);
            position.originY = 1;
        } else {
            position.top = idealTop;
            position.originY = 0.5;
        }

        return position;
    }, []);

    const handleButtonClick = () => {
        if (!isDragging) {
            if (!isExpanded) {
                setPanelPosition(calculatePanelPosition());
            }
            setIsExpanded(!isExpanded);
        }
    };

    const handleDragEnd = () => {
        setTimeout(() => {
            setIsDragging(false);
            if (isExpanded) {
                setPanelPosition(calculatePanelPosition());
            }
        }, 100);
    };

    useEffect(() => {
        if (!isExpanded) return;

        const handleResize = () => {
            setPanelPosition(calculatePanelPosition());
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [isExpanded, calculatePanelPosition]);

    return (
        <>
            <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-40" />

            <motion.div
                drag
                dragMomentum={false}
                dragElastic={0.1}
                dragConstraints={constraintsRef}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={handleDragEnd}
                onDrag={() => {
                    if (isExpanded) {
                        setPanelPosition(calculatePanelPosition());
                    }
                }}
                className={cn(
                    "fixed z-50",
                    "left-4 bottom-20 sm:bottom-auto sm:top-1/2"
                )}
                style={{ touchAction: "none" }}
            >
                <motion.div
                    ref={buttonRef}
                    onTap={handleButtonClick}
                    className={cn(
                        "w-12 h-12 sm:w-14 sm:h-14 rounded-full",
                        "bg-indigo-600 shadow-lg shadow-indigo-500/30",
                        "flex items-center justify-center",
                        "hover:bg-indigo-700 transition-colors",
                        "cursor-grab active:cursor-grabbing"
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    role="button"
                    aria-label={isExpanded ? "Fechar feedback" : "Enviar feedback"}
                    aria-expanded={isExpanded}
                >
                    <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </motion.div>

                <AnimatePresence>
                    {isExpanded && panelPosition && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            onPointerDownCapture={(e) => e.stopPropagation()}
                            className="absolute w-80 max-w-[calc(100vw-2rem)]"
                            style={{
                                top: panelPosition.top,
                                bottom: panelPosition.bottom,
                                left: panelPosition.left,
                                right: panelPosition.right,
                                transformOrigin: `${panelPosition.originX * 100}% ${panelPosition.originY * 100}%`,
                            }}
                        >
                            <FeedbackForm onClose={() => setIsExpanded(false)} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </>
    );
}
