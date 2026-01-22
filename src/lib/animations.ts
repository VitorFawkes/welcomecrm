/**
 * Animation utilities and constants for the proposal builder
 * 
 * Uses Tailwind-compatible transitions and CSS custom properties
 */

// Spring-like animation configs for framer-motion style
export const springTransition = {
    type: 'spring',
    stiffness: 500,
    damping: 30,
}

// Smooth fade transition
export const fadeTransition = {
    enter: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
}

// Scale up on appear
export const scaleTransition = {
    enter: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.15 },
}

// Slide in from side
export const slideInTransition = {
    enter: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.2 },
}

// CSS class helpers for Tailwind animations
export const animationClasses = {
    // Fade in/out
    fadeIn: 'animate-in fade-in duration-200',
    fadeOut: 'animate-out fade-out duration-200',

    // Slide animations
    slideInLeft: 'animate-in slide-in-from-left-2 duration-200',
    slideInRight: 'animate-in slide-in-from-right-2 duration-200',
    slideInUp: 'animate-in slide-in-from-bottom-2 duration-200',
    slideInDown: 'animate-in slide-in-from-top-2 duration-200',

    // Scale animations
    scaleIn: 'animate-in zoom-in-95 duration-150',
    scaleOut: 'animate-out zoom-out-95 duration-150',

    // Bounce effect
    bounceIn: 'animate-in zoom-in-75 duration-300 ease-out',

    // Combined effects
    popIn: 'animate-in zoom-in-95 fade-in duration-200',
    popOut: 'animate-out zoom-out-95 fade-out duration-150',
}

// Drag animation styles
export const dragAnimationStyles = {
    dragging: {
        scale: 1.02,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        cursor: 'grabbing',
    },
    dropping: {
        scale: 1,
        boxShadow: 'none',
        transition: 'all 0.2s ease-out',
    },
}

// Drop zone indicator animation
export const dropZoneStyles = {
    idle: 'border-2 border-dashed border-slate-200',
    active: 'border-2 border-dashed border-blue-400 bg-blue-50 scale-[1.02]',
    reject: 'border-2 border-dashed border-red-400 bg-red-50',
}

// Utility function to apply staggered delay to children
export function getStaggerDelay(index: number, baseDelayMs = 50): string {
    return `${index * baseDelayMs}ms`
}

// CSS variable for controlling animation duration globally
export const cssAnimationVars = `
    --animation-fast: 150ms;
    --animation-normal: 200ms;
    --animation-slow: 300ms;
    --transition-timing: cubic-bezier(0.4, 0, 0.2, 1);
`

export default animationClasses
