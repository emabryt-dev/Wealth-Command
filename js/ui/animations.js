// Wealth Command Pro - Animations Module
class AnimationManager {
    constructor() {
        this.animations = new Map();
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.isEnabled = !this.prefersReducedMotion;
    }

    // Initialize animation system
    init() {
        this.setupIntersectionObserver();
        this.setupScrollAnimations();
        this.setupHoverAnimations();
    }

    // Setup intersection observer for scroll-triggered animations
    setupIntersectionObserver() {
        if (!this.isEnabled) return;

        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateOnScroll(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // Observe elements with animation attributes
        document.querySelectorAll('[data-animate]').forEach(el => {
            this.intersectionObserver.observe(el);
        });
    }

    // Setup scroll-based animations
    setupScrollAnimations() {
        if (!this.isEnabled) return;

        let ticking = false;
        
        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.handleScrollAnimations();
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
    }

    // Setup hover animations
    setupHoverAnimations() {
        if (!this.isEnabled) return;

        // Add hover effects to interactive elements
        document.querySelectorAll('.btn, .card, .nav-btn').forEach(el => {
            el.addEventListener('mouseenter', (e) => this.handleHoverEnter(e));
            el.addEventListener('mouseleave', (e) => this.handleHoverLeave(e));
        });
    }

    // Scroll-triggered animations
    animateOnScroll(element) {
        const animationType = element.dataset.animate;
        
        switch (animationType) {
            case 'fade-in':
                this.fadeIn(element);
                break;
            case 'slide-up':
                this.slideUp(element);
                break;
            case 'slide-left':
                this.slideLeft(element);
                break;
            case 'slide-right':
                this.slideRight(element);
                break;
            case 'scale-in':
                this.scaleIn(element);
                break;
            case 'bounce-in':
                this.bounceIn(element);
                break;
            default:
                this.fadeIn(element);
        }

        // Stop observing after animation
        this.intersectionObserver.unobserve(element);
    }

    // Handle scroll-based parallax and other effects
    handleScrollAnimations() {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('[data-parallax]');
        
        parallaxElements.forEach(el => {
            const speed = parseFloat(el.dataset.parallax) || 0.5;
            const yPos = -(scrolled * speed);
            el.style.transform = `translateY(${yPos}px)`;
        });

        // Progress bars animation
        const progressBars = document.querySelectorAll('.progress-bar[data-animate-progress]');
        progressBars.forEach(bar => {
            const rect = bar.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                const targetWidth = bar.dataset.animateProgress;
                this.animateProgressBar(bar, targetWidth);
            }
        });
    }

    // Hover animations
    handleHoverEnter(event) {
        const element = event.currentTarget;
        
        if (element.classList.contains('btn')) {
            this.animateButtonHover(element);
        } else if (element.classList.contains('card')) {
            this.animateCardHover(element);
        } else if (element.classList.contains('nav-btn')) {
            this.animateNavHover(element);
        }
    }

    handleHoverLeave(event) {
        const element = event.currentTarget;
        
        if (element.classList.contains('btn')) {
            this.animateButtonLeave(element);
        } else if (element.classList.contains('card')) {
            this.animateCardLeave(element);
        } else if (element.classList.contains('nav-btn')) {
            this.animateNavLeave(element);
        }
    }

    // Basic animation methods
    fadeIn(element, duration = 600) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        
        this.animate({
            element: element,
            duration: duration,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            properties: {
                opacity: [0, 1],
                transform: ['translateY(20px)', 'translateY(0)']
            }
        });
    }

    slideUp(element, duration = 600) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(40px)';
        
        this.animate({
            element: element,
            duration: duration,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            properties: {
                opacity: [0, 1],
                transform: ['translateY(40px)', 'translateY(0)']
            }
        });
    }

    slideLeft(element, duration = 600) {
        element.style.opacity = '0';
        element.style.transform = 'translateX(40px)';
        
        this.animate({
            element: element,
            duration: duration,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            properties: {
                opacity: [0, 1],
                transform: ['translateX(40px)', 'translateX(0)']
            }
        });
    }

    slideRight(element, duration = 600) {
        element.style.opacity = '0';
        element.style.transform = 'translateX(-40px)';
        
        this.animate({
            element: element,
            duration: duration,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            properties: {
                opacity: [0, 1],
                transform: ['translateX(-40px)', 'translateX(0)']
            }
        });
    }

    scaleIn(element, duration = 600) {
        element.style.opacity = '0';
        element.style.transform = 'scale(0.8)';
        
        this.animate({
            element: element,
            duration: duration,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            properties: {
                opacity: [0, 1],
                transform: ['scale(0.8)', 'scale(1)']
            }
        });
    }

    bounceIn(element, duration = 800) {
        element.style.opacity = '0';
        element.style.transform = 'scale(0.3)';
        
        this.animate({
            element: element,
            duration: duration,
            easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            properties: {
                opacity: [0, 1],
                transform: ['scale(0.3)', 'scale(1.1)', 'scale(1)']
            }
        });
    }

    // Interactive element animations
    animateButtonHover(button) {
        this.animate({
            element: button,
            duration: 200,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            properties: {
                transform: ['scale(1)', 'scale(1.05)']
            }
        });
    }

    animateButtonLeave(button) {
        this.animate({
            element: button,
            duration: 200,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            properties: {
                transform: ['scale(1.05)', 'scale(1)']
            }
        });
    }

    animateCardHover(card) {
        this.animate({
            element: card,
            duration: 300,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            properties: {
                transform: ['translateY(0)', 'translateY(-8px)'],
                boxShadow: [
                    '0 4px 20px rgba(0, 0, 0, 0.1)',
                    '0 12px 40px rgba(0, 0, 0, 0.15)'
                ]
            }
        });
    }

    animateCardLeave(card) {
        this.animate({
            element: card,
            duration: 300,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            properties: {
                transform: ['translateY(-8px)', 'translateY(0)'],
                boxShadow: [
                    '0 12px 40px rgba(0, 0, 0, 0.15)',
                    '0 4px 20px rgba(0, 0, 0, 0.1)'
                ]
            }
        });
    }

    animateNavHover(navBtn) {
        const icon = navBtn.querySelector('.nav-icon');
        if (icon) {
            this.animate({
                element: icon,
                duration: 200,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                properties: {
                    transform: ['translateY(0)', 'translateY(-2px)']
                }
            });
        }
    }

    animateNavLeave(navBtn) {
        const icon = navBtn.querySelector('.nav-icon');
        if (icon) {
            this.animate({
                element: icon,
                duration: 200,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                properties: {
                    transform: ['translateY(-2px)', 'translateY(0)']
                }
            });
        }
    }

    // Progress bar animation
    animateProgressBar(progressBar, targetWidth) {
        if (progressBar.dataset.animated) return;
        
        progressBar.dataset.animated = 'true';
        this.animate({
            element: progressBar,
            duration: 1000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            properties: {
                width: ['0%', targetWidth]
            }
        });
    }

    // FAB animations
    animateFABOpen(fab, menu) {
        // Animate FAB rotation
        this.animate({
            element: fab,
            duration: 300,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            properties: {
                transform: ['rotate(0deg)', 'rotate(135deg)']
            }
        });

        // Animate menu items with stagger
        const items = menu.querySelectorAll('.fab-option');
        items.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'scale(0) translateY(20px)';
            
            setTimeout(() => {
                this.animate({
                    element: item,
                    duration: 300,
                    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                    properties: {
                        opacity: [0, 1],
                        transform: ['scale(0) translateY(20px)', 'scale(1) translateY(0)']
                    }
                });
            }, index * 80);
        });
    }

    animateFABClose(fab, menu) {
        // Animate FAB rotation
        this.animate({
            element: fab,
            duration: 300,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            properties: {
                transform: ['rotate(135deg)', 'rotate(0deg)']
            }
        });

        // Animate menu items with reverse stagger
        const items = menu.querySelectorAll('.fab-option');
        items.forEach((item, index) => {
            setTimeout(() => {
                this.animate({
                    element: item,
                    duration: 200,
                    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    properties: {
                        opacity: [1, 0],
                        transform: ['scale(1) translateY(0)', 'scale(0) translateY(20px)']
                    }
                });
            }, (items.length - 1 - index) * 60);
        });
    }

    // Toast animations
    animateToastShow(toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        
        this.animate({
            element: toast,
            duration: 400,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            properties: {
                opacity: [0, 1],
                transform: ['translateX(100px)', 'translateX(0)']
            }
        });
    }

    animateToastHide(toast) {
        this.animate({
            element: toast,
            duration: 300,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            properties: {
                opacity: [1, 0],
                transform: ['translateX(0)', 'translateX(100px)']
            }
        }).then(() => {
            toast.remove();
        });
    }

    // Confetti animation
    createConfetti(container, count = 100) {
        if (!this.isEnabled) return;

        const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6'];
        
        for (let i = 0; i < count; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = Math.random() * 10 + 5 + 'px';
            confetti.style.opacity = '0';
            
            container.appendChild(confetti);

            // Animate confetti
            this.animate({
                element: confetti,
                duration: 3000 + Math.random() * 2000,
                easing: 'cubic-bezier(0.1, 0.8, 0.1, 1)',
                properties: {
                    opacity: [0, 1, 0],
                    transform: [
                        'translateY(-100px) rotate(0deg)',
                        `translateY(${window.innerHeight}px) rotate(${360 + Math.random() * 360}deg)`
                    ]
                }
            }).then(() => {
                confetti.remove();
            });

            // Start animation with delay
            setTimeout(() => {
                confetti.style.animation = `confettiFall ${3 + Math.random() * 2}s ease-in-out forwards`;
            }, Math.random() * 500);
        }
    }

    // Page transition animations
    async animatePageTransition(oldPage, newPage, direction = 'forward') {
        if (!this.isEnabled) {
            oldPage.style.display = 'none';
            newPage.style.display = 'block';
            return;
        }

        const duration = 400;
        
        // Animate old page out
        await this.animate({
            element: oldPage,
            duration: duration,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            properties: {
                opacity: [1, 0],
                transform: [
                    'translateX(0)',
                    direction === 'forward' ? 'translateX(-50px)' : 'translateX(50px)'
                ]
            }
        });

        oldPage.style.display = 'none';
        newPage.style.display = 'block';
        newPage.style.opacity = '0';
        newPage.style.transform = direction === 'forward' ? 'translateX(50px)' : 'translateX(-50px)';

        // Animate new page in
        await this.animate({
            element: newPage,
            duration: duration,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            properties: {
                opacity: [0, 1],
                transform: [
                    direction === 'forward' ? 'translateX(50px)' : 'translateX(-50px)',
                    'translateX(0)'
                ]
            }
        });
    }

    // Generic animation method using Web Animations API
    animate({ element, duration, easing, properties }) {
        if (!this.isEnabled) {
            // Apply final state immediately
            Object.keys(properties).forEach(property => {
                const values = properties[property];
                element.style[property] = typeof values[values.length - 1] === 'string' 
                    ? values[values.length - 1] 
                    : values[values.length - 1] + 'px';
            });
            return Promise.resolve();
        }

        const keyframes = {};
        Object.keys(properties).forEach(property => {
            keyframes[property] = properties[property];
        });

        const animation = element.animate(keyframes, {
            duration: duration,
            easing: easing,
            fill: 'forwards'
        });

        return new Promise(resolve => {
            animation.onfinish = () => resolve();
        });
    }

    // Utility methods
    enableAnimations() {
        this.isEnabled = true;
        document.body.classList.remove('no-animations');
    }

    disableAnimations() {
        this.isEnabled = false;
        document.body.classList.add('no-animations');
    }

    // Preload Lottie animations
    preloadLottieAnimations() {
        const lottieElements = document.querySelectorAll('lottie-player');
        lottieElements.forEach(player => {
            player.load(player.getAttribute('src'));
        });
    }

    // Ripple effect for buttons
    createRippleEffect(event) {
        if (!this.isEnabled) return;

        const button = event.currentTarget;
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        circle.style.width = circle.style.height = diameter + 'px';
        circle.style.left = (event.clientX - button.offsetLeft - radius) + 'px';
        circle.style.top = (event.clientY - button.offsetTop - radius) + 'px';
        circle.classList.add('ripple');

        const ripple = button.getElementsByClassName('ripple')[0];
        if (ripple) {
            ripple.remove();
        }

        button.appendChild(circle);

        // Remove ripple after animation
        setTimeout(() => {
            circle.remove();
        }, 600);
    }
}

// Create global animation manager instance
window.animationManager = new AnimationManager();

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.animationManager.init();
});
