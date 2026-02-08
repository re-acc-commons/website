/**
 * RE/ACC COMMONS — Main JavaScript
 * Interactive elements and generative visuals
 */

// ═══════════════════════════════════════════════════════════
// PIXEL GARDEN — Organic agent swarm animation
// ═══════════════════════════════════════════════════════════

class PixelGarden {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.cellSize = 6;
        this.grid = [];
        this.nextGrid = [];
        this.frameCount = 0;
        this.updateInterval = 12; // Balanced update speed
        this.time = 0;

        // Color palette - matrix greens + earth tones
        this.colors = {
            moss: ['#1a3d1a', '#2d5a3d', '#4a7c59'],
            matrix: ['#003300', '#005500', '#00aa00', '#00dd00'],
            glow: ['#00ff00', '#33ff33', '#66ff66'],
            amber: ['#5a4420', '#8b6914', '#b8864a'],
            soil: ['#1a1a12', '#2d2820', '#3d3225'],
            terminal: '#39ff14'
        };

        this.init();
        this.animate();

        window.addEventListener('resize', () => this.resize());
    }

    init() {
        this.resize();
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.cols = Math.ceil(this.canvas.width / this.cellSize);
        this.rows = Math.ceil(this.canvas.height / this.cellSize);
        this.initGrid();
    }

    initGrid() {
        this.grid = [];
        this.nextGrid = [];

        // Initialize grids
        for (let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            this.nextGrid[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = null;
                this.nextGrid[y][x] = null;
            }
        }

        // Dense initial seeding for swarm effect
        const density = 0.28;
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (Math.random() < density) {
                    // Weighted towards greens for Matrix feel
                    const types = ['moss', 'moss', 'matrix', 'matrix', 'matrix', 'glow', 'glow', 'amber', 'soil'];
                    const type = types[Math.floor(Math.random() * types.length)];
                    const maxIndex = this.colors[type].length;
                    this.grid[y][x] = {
                        type,
                        colorIndex: Math.floor(Math.random() * maxIndex),
                        energy: 0.7 + Math.random() * 0.3,
                        phase: Math.random() * Math.PI * 2
                    };
                }
            }
        }

        // Scatter bright glow accents
        for (let i = 0; i < 60; i++) {
            const x = Math.floor(Math.random() * this.cols);
            const y = Math.floor(Math.random() * this.rows);
            this.grid[y][x] = {
                type: 'glow',
                colorIndex: Math.floor(Math.random() * 3),
                energy: 0.95,
                phase: Math.random() * Math.PI * 2
            };
        }
    }

    countNeighbors(x, y) {
        let count = 0;
        let totalEnergy = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = (x + dx + this.cols) % this.cols;
                const ny = (y + dy + this.rows) % this.rows;
                const cell = this.grid[ny][nx];
                if (cell && cell.energy > 0.2) {
                    count++;
                    totalEnergy += cell.energy;
                }
            }
        }
        return { count, avgEnergy: count > 0 ? totalEnergy / count : 0 };
    }

    getNeighborType(x, y) {
        const types = {};
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = (x + dx + this.cols) % this.cols;
                const ny = (y + dy + this.rows) % this.rows;
                const cell = this.grid[ny][nx];
                if (cell && cell.energy > 0.2 && cell.type !== 'glow') {
                    types[cell.type] = (types[cell.type] || 0) + 1;
                }
            }
        }
        let maxType = 'matrix';
        let maxCount = 0;
        for (const [type, count] of Object.entries(types)) {
            if (count > maxCount) {
                maxCount = count;
                maxType = type;
            }
        }
        return maxType;
    }

    updateGrid() {
        // Organic swarm rules - more chaotic than Conway's
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = this.grid[y][x];
                const { count, avgEnergy } = this.countNeighbors(x, y);

                if (cell && cell.energy > 0.1) {
                    // Living cell
                    let newEnergy = cell.energy;

                    if (count <= 1) {
                        // Lonely - lose energy
                        newEnergy -= 0.08;
                    } else if (count >= 2 && count <= 3) {
                        // Happy - gain energy slowly
                        newEnergy += 0.02;
                    } else if (count >= 4 && count <= 5) {
                        // Crowded - stable but stressed
                        newEnergy -= 0.03;
                    } else if (count > 5) {
                        // Overcrowded - die faster
                        newEnergy -= 0.12;
                    }

                    // Random fluctuation for organic feel
                    newEnergy += (Math.random() - 0.5) * 0.04;

                    // Clamp energy
                    newEnergy = Math.max(0, Math.min(1, newEnergy));

                    if (newEnergy > 0.05) {
                        this.nextGrid[y][x] = {
                            ...cell,
                            energy: newEnergy
                        };
                    } else {
                        this.nextGrid[y][x] = null;
                    }
                } else {
                    // Dead cell - birth conditions
                    // More lenient birth rules for continuous activity
                    if (count >= 2 && count <= 5 && avgEnergy > 0.3 && Math.random() < 0.4) {
                        const type = this.getNeighborType(x, y);
                        // Small chance to mutate type
                        const mutationTypes = ['moss', 'matrix', 'matrix', 'glow', 'glow', 'amber', 'soil'];
                        const actualType = Math.random() < 0.15
                            ? mutationTypes[Math.floor(Math.random() * mutationTypes.length)]
                            : type;
                        const maxIndex = this.colors[actualType].length;
                        this.nextGrid[y][x] = {
                            type: actualType,
                            colorIndex: Math.floor(Math.random() * maxIndex),
                            energy: 0.5 + Math.random() * 0.4,
                            phase: Math.random() * Math.PI * 2
                        };
                    } else {
                        this.nextGrid[y][x] = null;
                    }
                }
            }
        }

        // Swap grids
        [this.grid, this.nextGrid] = [this.nextGrid, this.grid];

        // Continuous spawning to maintain swarm density - life tending to life
        const spawnCount = Math.floor(Math.random() * 10) + 5;
        for (let i = 0; i < spawnCount; i++) {
            const x = Math.floor(Math.random() * this.cols);
            const y = Math.floor(Math.random() * this.rows);
            if (!this.grid[y][x]) {
                const types = ['moss', 'moss', 'matrix', 'matrix', 'matrix', 'glow', 'glow', 'amber', 'soil'];
                const type = types[Math.floor(Math.random() * types.length)];
                const maxIndex = this.colors[type].length;
                this.grid[y][x] = {
                    type,
                    colorIndex: Math.floor(Math.random() * maxIndex),
                    energy: 0.6 + Math.random() * 0.4,
                    phase: Math.random() * Math.PI * 2
                };
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Global slow pulse - soft breathing of the swarm
        const globalPulse = 0.8 + 0.2 * Math.sin(this.time * 0.3);

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = this.grid[y][x];
                if (!cell || cell.energy <= 0) continue;

                // Individual cell pulse offset by phase - organic variation
                const cellPulse = 0.6 + 0.4 * Math.sin(this.time * 0.5 + cell.phase);
                const alpha = cell.energy * cellPulse * globalPulse;

                const colorArray = this.colors[cell.type];
                if (Array.isArray(colorArray)) {
                    this.ctx.fillStyle = colorArray[cell.colorIndex % colorArray.length];
                } else {
                    this.ctx.fillStyle = colorArray;
                }

                // More visible - glow types brightest, earth tones visible but softer
                if (cell.type === 'glow') {
                    this.ctx.globalAlpha = alpha * 0.75;
                } else if (cell.type === 'matrix') {
                    this.ctx.globalAlpha = alpha * 0.65;
                } else if (cell.type === 'moss') {
                    this.ctx.globalAlpha = alpha * 0.55;
                } else {
                    this.ctx.globalAlpha = alpha * 0.5;
                }

                this.ctx.fillRect(
                    x * this.cellSize,
                    y * this.cellSize,
                    this.cellSize - 1,
                    this.cellSize - 1
                );
            }
        }

        this.ctx.globalAlpha = 1;
    }

    animate() {
        this.frameCount++;
        this.time += 0.016; // ~60fps time increment

        // Slow grid updates
        if (this.frameCount % this.updateInterval === 0) {
            this.updateGrid();
        }

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
