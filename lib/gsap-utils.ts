'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Fade in animation
export const fadeIn = (element: gsap.TweenTarget, options = {}) => {
  return gsap.from(element, {
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    ...options,
  });
};

// Slide in from bottom
export const slideInUp = (element: gsap.TweenTarget, options = {}) => {
  return gsap.from(element, {
    y: 100,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    ...options,
  });
};

// Slide in from left
export const slideInLeft = (element: gsap.TweenTarget, options = {}) => {
  return gsap.from(element, {
    x: -100,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    ...options,
  });
};

// Slide in from right
export const slideInRight = (element: gsap.TweenTarget, options = {}) => {
  return gsap.from(element, {
    x: 100,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    ...options,
  });
};

// Scale in animation
export const scaleIn = (element: gsap.TweenTarget, options = {}) => {
  return gsap.from(element, {
    scale: 0.8,
    opacity: 0,
    duration: 0.8,
    ease: 'back.out(1.7)',
    ...options,
  });
};

// Stagger animation for lists
export const staggerIn = (elements: gsap.TweenTarget, options = {}) => {
  return gsap.from(elements, {
    y: 50,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: 'power3.out',
    ...options,
  });
};

// Floating animation
export const floatingAnimation = (element: gsap.TweenTarget) => {
  return gsap.to(element, {
    y: -20,
    duration: 2,
    ease: 'power1.inOut',
    repeat: -1,
    yoyo: true,
  });
};

// Oxygen flow animation (continuous smooth motion)
export const oxygenFlow = (element: gsap.TweenTarget) => {
  return gsap.to(element, {
    x: '100%',
    duration: 3,
    ease: 'power1.inOut',
    repeat: -1,
    yoyo: true,
  });
};

// Pulse glow animation
export const pulseGlow = (element: gsap.TweenTarget) => {
  return gsap.to(element, {
    boxShadow: '0 0 40px rgba(148, 210, 189, 0.6)',
    duration: 1.5,
    ease: 'power1.inOut',
    repeat: -1,
    yoyo: true,
  });
};

// Scroll-triggered animation
export const scrollReveal = (element: gsap.TweenTarget, options = {}) => {
  return gsap.from(element, {
    y: 100,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: element,
      start: 'top 80%',
      end: 'bottom 20%',
      toggleActions: 'play none none reverse',
    },
    ...options,
  });
};

// Card hover effect
export const cardHoverEffect = (card: HTMLElement) => {
  const tl = gsap.timeline({ paused: true });
  
  tl.to(card, {
    y: -10,
    boxShadow: '0 20px 40px rgba(155, 34, 38, 0.15)',
    duration: 0.3,
    ease: 'power2.out',
  });

  card.addEventListener('mouseenter', () => tl.play());
  card.addEventListener('mouseleave', () => tl.reverse());
};

// Button ripple effect
export const buttonRipple = (button: HTMLElement, x: number, y: number) => {
  const ripple = document.createElement('span');
  ripple.style.position = 'absolute';
  ripple.style.borderRadius = '50%';
  ripple.style.background = 'rgba(255, 255, 255, 0.5)';
  ripple.style.width = '0px';
  ripple.style.height = '0px';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.transform = 'translate(-50%, -50%)';

  button.appendChild(ripple);

  gsap.to(ripple, {
    width: 300,
    height: 300,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out',
    onComplete: () => ripple.remove(),
  });
};

// Text reveal animation (word by word)
export const textReveal = (element: gsap.TweenTarget, options = {}) => {
  return gsap.from(element, {
    opacity: 0,
    y: 20,
    duration: 0.8,
    stagger: 0.05,
    ease: 'power3.out',
    ...options,
  });
};

// Page transition
export const pageTransition = () => {
  const tl = gsap.timeline();
  
  tl.to('.page-transition', {
    scaleY: 1,
    duration: 0.5,
    ease: 'power3.inOut',
    transformOrigin: 'bottom',
  })
  .to('.page-transition', {
    scaleY: 0,
    duration: 0.5,
    ease: 'power3.inOut',
    transformOrigin: 'top',
    delay: 0.3,
  });

  return tl;
};

// Magnetic button effect
export const magneticButton = (button: HTMLElement) => {
  const handleMouseMove = (e: MouseEvent) => {
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    gsap.to(button, {
      x: x * 0.3,
      y: y * 0.3,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  const handleMouseLeave = () => {
    gsap.to(button, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: 'elastic.out(1, 0.5)',
    });
  };

  button.addEventListener('mousemove', handleMouseMove);
  button.addEventListener('mouseleave', handleMouseLeave);
};

export { gsap, ScrollTrigger };

