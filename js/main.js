/**
 * RE/ACC COMMONS — Main JavaScript
 * Interactive elements and generative visuals
 */

// ═══════════════════════════════════════════════════════════
// PIXEL GARDEN — Generative background animation
// ═══════════════════════════════════════════════════════════

class PixelGarden {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.pixels = [];
        this.cellSize = 8;
        this.time = 0;

        // Color palette - earth tones
        this.colors = {
            moss: ['#2d5a3d', '#4a7c59', '#6b9b7a'],
            amber: ['#b8864a', '#d4a574', '#e8c9a0'],
            soil: ['#3d3225', '#5a4a3a', '#8b7355'],
            terminal: '#39ff14'
        };

        this.init();
        this.animate();

        window.addEventListener('resize', () => this.resize());
    }

    init() {
        this.resize();
        this.generatePixels();
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.cols = Math.ceil(this.canvas.width / this.cellSize);
        this.rows = Math.ceil(this.canvas.height / this.cellSize);
        this.generatePixels();
    }

    generatePixels() {
        this.pixels = [];

        // Create organic clusters of pixels
        const clusterCount = Math.floor((this.cols * this.rows) / 80);

        for (let i = 0; i < clusterCount; i++) {
            const centerX = Math.random() * this.cols;
            const centerY = Math.random() * this.rows;
            const size = 3 + Math.random() * 8;
            const type = Math.random() < 0.7 ? 'moss' : (Math.random() < 0.5 ? 'amber' : 'soil');

            // Create cluster
            for (let j = 0; j < size * 3; j++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * size;
                const x = Math.floor(centerX + Math.cos(angle) * distance);
                const y = Math.floor(centerY + Math.sin(angle) * distance);

                if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                    this.pixels.push({
                        x,
                        y,
                        type,
                        colorIndex: Math.floor(Math.random() * 3),
                        phase: Math.random() * Math.PI * 2,
                        speed: 0.5 + Math.random() * 1.5
                    });
                }
            }
        }

        // Add sparse terminal-green accent pixels
        for (let i = 0; i < 20; i++) {
            this.pixels.push({
                x: Math.floor(Math.random() * this.cols),
                y: Math.floor(Math.random() * this.rows),
                type: 'terminal',
                phase: Math.random() * Math.PI * 2,
                speed: 2 + Math.random() * 2
            });
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const pixel of this.pixels) {
            const brightness = 0.3 + 0.7 * ((Math.sin(this.time * pixel.speed + pixel.phase) + 1) / 2);

            if (pixel.type === 'terminal') {
                this.ctx.fillStyle = this.colors.terminal;
                this.ctx.globalAlpha = brightness * 0.8;
            } else {
                this.ctx.fillStyle = this.colors[pixel.type][pixel.colorIndex];
                this.ctx.globalAlpha = brightness * 0.6;
            }

            this.ctx.fillRect(
                pixel.x * this.cellSize,
                pixel.y * this.cellSize,
                this.cellSize - 1,
                this.cellSize - 1
            );
        }

        this.ctx.globalAlpha = 1;
    }

    animate() {
        this.time += 0.01;
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// ═══════════════════════════════════════════════════════════
// MOBILE NAVIGATION
// ═══════════════════════════════════════════════════════════

function initMobileNav() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuBtn.classList.toggle('active');
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                menuBtn.classList.remove('active');
            });
        });
    }
}

// ═══════════════════════════════════════════════════════════
// SCROLL ANIMATIONS
// ═══════════════════════════════════════════════════════════

function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe elements that should animate on scroll
    document.querySelectorAll('.philosophy-card, .mechanism-node, .membrane-layer, .info-card, .join-step').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Add CSS for visible state
const style = document.createElement('style');
style.textContent = `
    .visible {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(style);

// ═══════════════════════════════════════════════════════════
// TERMINAL TYPING EFFECT
// ═══════════════════════════════════════════════════════════

function initTypingEffect() {
    const typingLines = document.querySelectorAll('.typing-line');

    typingLines.forEach(line => {
        const children = Array.from(line.children);
        let delay = 0;

        children.forEach(child => {
            child.style.opacity = '0';
            child.style.animation = `fadeIn 0.3s ease forwards ${delay}s`;
            delay += 0.2;
        });
    });
}

// Add fadeIn keyframes
const fadeInStyle = document.createElement('style');
fadeInStyle.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateX(-5px); }
        to { opacity: 1; transform: translateX(0); }
    }
`;
document.head.appendChild(fadeInStyle);

// ═══════════════════════════════════════════════════════════
// NAVBAR SCROLL BEHAVIOR
// ═══════════════════════════════════════════════════════════

function initNavbarScroll() {
    const nav = document.querySelector('.main-nav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            nav.style.background = 'rgba(13, 18, 16, 0.95)';
        } else {
            nav.style.background = 'rgba(13, 18, 16, 0.9)';
        }

        lastScroll = currentScroll;
    });
}

// ═══════════════════════════════════════════════════════════
// SMOOTH SCROLL FOR ANCHOR LINKS
// ═══════════════════════════════════════════════════════════

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════
// COPY TO CLIPBOARD FOR CODE BLOCKS
// ═══════════════════════════════════════════════════════════

function initCodeCopy() {
    document.querySelectorAll('.code-block').forEach(block => {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'copy';
        copyBtn.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(74, 124, 89, 0.3);
            border: 1px solid rgba(74, 124, 89, 0.5);
            color: #a8a298;
            padding: 4px 8px;
            font-family: var(--font-mono);
            font-size: 0.625rem;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        block.style.position = 'relative';
        block.appendChild(copyBtn);

        copyBtn.addEventListener('click', async () => {
            const code = block.querySelector('code').textContent;
            await navigator.clipboard.writeText(code);
            copyBtn.textContent = 'copied!';
            copyBtn.style.background = 'rgba(74, 124, 89, 0.5)';
            setTimeout(() => {
                copyBtn.textContent = 'copy';
                copyBtn.style.background = 'rgba(74, 124, 89, 0.3)';
            }, 2000);
        });
    });
}

// ═══════════════════════════════════════════════════════════
// INITIALIZE
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // Initialize pixel garden on pages that have it
    new PixelGarden('pixel-garden');

    // Initialize all interactive features
    initMobileNav();
    initScrollAnimations();
    initTypingEffect();
    initNavbarScroll();
    initSmoothScroll();
    initCodeCopy();

    console.log(`
╭─────────────────────────────────────╮
│                                     │
│   🌱 re/acc commons                 │
│   Fork the future. Seed the commons.│
│                                     │
│   github.com/re-acc-commons         │
│                                     │
╰─────────────────────────────────────╯
    `);
});
