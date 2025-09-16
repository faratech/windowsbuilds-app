/**
 * WindowsBuilds Enhanced Interactions
 * Provides smooth animations and enhanced UX for link clicks and card interactions
 */

(function() {
    'use strict';

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', initEnhancements);

    function initEnhancements() {
        enhanceLinkInteractions();
        enhanceCardInteractions();
        enhanceTabTransitions();
        setupClickFeedback();
        detectThemePreference();
    }

    /**
     * Enhanced link interactions with visual feedback
     */
    function enhanceLinkInteractions() {
        const links = document.querySelectorAll('.build-link, .edge-build-link, .artifact-link');
        
        links.forEach(link => {
            // Add ripple effect on click
            link.addEventListener('click', function(e) {
                createRipple(this, e);
                
                // Add clicked state
                this.classList.add('link-clicked');
                setTimeout(() => {
                    this.classList.remove('link-clicked');
                }, 300);
            });

            // Enhanced hover with scale
            link.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.02)';
            });

            link.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });

            // Keyboard support
            link.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
        });
    }

    /**
     * Enhanced card interactions
     */
    function enhanceCardInteractions() {
        const cards = document.querySelectorAll('.build-card, .build-row');
        
        cards.forEach(card => {
            // Add hover effect with tilt
            card.addEventListener('mousemove', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (y - centerY) / 20;
                const rotateY = (centerX - x) / 20;
                
                this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
            });

            card.addEventListener('mouseleave', function() {
                this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
            });

            // Click animation
            card.addEventListener('click', function(e) {
                if (!e.target.closest('a, button')) {
                    this.classList.add('card-pulse');
                    setTimeout(() => {
                        this.classList.remove('card-pulse');
                    }, 600);
                }
            });
        });
    }

    /**
     * Enhanced tab transitions
     */
    function enhanceTabTransitions() {
        const tabLinks = document.querySelectorAll('.tabs__link');
        const tabContents = document.querySelectorAll('.tab');
        
        tabLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Add smooth fade transition
                const targetTab = this.getAttribute('data-tab') || this.getAttribute('href')?.substring(1);
                if (!targetTab) return;
                
                // Fade out current tab
                const currentTab = document.querySelector('.tab.is-active');
                if (currentTab) {
                    currentTab.style.opacity = '0';
                    setTimeout(() => {
                        currentTab.classList.remove('is-active');
                        currentTab.style.opacity = '';
                        
                        // Fade in new tab
                        const newTab = document.getElementById(targetTab);
                        if (newTab) {
                            newTab.classList.add('is-active');
                            newTab.style.opacity = '0';
                            setTimeout(() => {
                                newTab.style.opacity = '1';
                            }, 10);
                        }
                    }, 200);
                }
                
                // Update active tab link
                document.querySelectorAll('.tabs__item').forEach(item => {
                    item.classList.remove('is-active');
                });
                this.closest('.tabs__item').classList.add('is-active');
            });
        });
    }

    /**
     * Setup click feedback for buttons and links
     */
    function setupClickFeedback() {
        const clickables = document.querySelectorAll('.button, .action-button');
        
        clickables.forEach(element => {
            element.addEventListener('click', function(e) {
                // Visual click feedback
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
                
                // Add ripple effect
                createRipple(this, e);
            });
        });
    }

    /**
     * Create ripple effect on click
     */
    function createRipple(element, event) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    /**
     * Detect and apply theme preference
     */
    function detectThemePreference() {
        // Check for XenForo theme
        const isDarkMode = document.body.classList.contains('style-variation--dark') ||
                          document.documentElement.getAttribute('data-theme') === 'dark';
        
        // Apply appropriate theme class
        const widget = document.getElementById('windows-builds-widget');
        if (widget) {
            if (isDarkMode) {
                widget.classList.add('dark-theme');
            } else {
                widget.classList.remove('dark-theme');
            }
        }
        
        // Listen for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
                    detectThemePreference();
                }
            });
        });
        
        observer.observe(document.body, { attributes: true });
        observer.observe(document.documentElement, { attributes: true });
    }

    // Add CSS for ripple effect
    const style = document.createElement('style');
    style.textContent = `
        .ripple-effect {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            transform: scale(0);
            animation: ripple-animation 0.6s ease-out;
            pointer-events: none;
        }
        
        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .link-clicked {
            animation: link-click 0.3s ease-out;
        }
        
        @keyframes link-click {
            0% { transform: scale(1); }
            50% { transform: scale(0.95); }
            100% { transform: scale(1); }
        }
        
        .card-pulse {
            animation: card-pulse 0.6s ease-out;
        }
        
        @keyframes card-pulse {
            0% { box-shadow: 0 0 0 0 rgba(0, 120, 212, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(0, 120, 212, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 120, 212, 0); }
        }
        
        /* Smooth transitions for theme detection */
        #windows-builds-widget {
            transition: background-color 0.3s ease, color 0.3s ease;
        }
        
        /* Enhanced focus states */
        .build-link:focus-visible,
        .edge-build-link:focus-visible {
            outline: 3px solid var(--wb-accent-windows);
            outline-offset: 4px;
            border-radius: 4px;
        }
        
        /* Pressed state for buttons */
        .button:active,
        .action-button:active {
            transform: scale(0.95);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        /* Card 3D hover effect */
        .build-card,
        .build-row {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            transform-style: preserve-3d;
        }
    `;
    document.head.appendChild(style);
})();