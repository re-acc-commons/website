/**
 * RE/ACC COMMONS — Main JavaScript
 * Interactive elements and generative visuals
 */

// ═══════════════════════════════════════════════════════════
// PIXEL GARDEN — Conway's Game of Life inspired animation
// ═══════════════════════════════════════════════════════════

class PixelGarden {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.cellSize = 8;
        this.grid = [];
        this.nextGrid = [];
        this.frameCount = 0;
        this.updateInterval = 8; // Update every N frames for subtle movement

        // Color palette - earth tones with fade states
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

        // Initialize empty grids
        for (let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            this.nextGrid[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = null;
                this.nextGrid[y][x] = null;
            }
        }

        // Seed with organic clusters
        const clusterCount = Math.floor((this.cols * this.rows) / 100);

        for (let i = 0; i < clusterCount; i++) {
            const centerX = Math.floor(Math.random() * this.cols);
            const centerY = Math.floor(Math.random() * this.rows);
            const size = 2 + Math.random() * 5;
            const types = ['moss', 'moss', 'moss', 'amber', 'soil'];
            const type = types[Math.floor(Math.random() * types.length)];

            // Create cluster with common life patterns
            this.seedPattern(centerX, centerY, type);
        }

        // Add sparse terminal accent cells
        for (let i = 0; i < 15; i++) {
            const x = Math.floor(Math.random() * this.cols);
            const y = Math.floor(Math.random() * this.rows);
            this.grid[y][x] = {
                type: 'terminal',
                age: 0,
                fade: 1
            };
        }
    }

    seedPattern(cx, cy, type) {
        // Various small patterns that create interesting life dynamics
        const patterns = [
            // Glider
            [[0,0], [1,0], [2,0], [2,1], [1,2]],
            // Small exploder
            [[0,0], [0,1], [0,2], [1,0], [1,2], [2,1]],
            // Block cluster
            [[0,0], [1,0], [0,1], [1,1], [3,0], [3,1]],
            // Line
            [[0,0], [1,0], [2,0], [3,0]],
            // L-shape
            [[0,0], [0,1], [0,2], [1,2], [2,2]],
            // Random scatter
            [[0,0], [2,1], [1,2], [3,0], [2,3]]
        ];

        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const colorIndex = Math.floor(Math.random() * 3);

        for (const [dx, dy] of pattern) {
            const x = cx + dx;
            const y = cy + dy;
            if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                this.grid[y][x] = {
                    type,
                    colorIndex,
                    age: 0,
                    fade: 1
                };
            }
        }
    }

    countNeighbors(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = (x + dx + this.cols) % this.cols;
                const ny = (y + dy + this.rows) % this.rows;
                if (this.grid[ny][nx] && this.grid[ny][nx].fade > 0.3) {
                    count++;
                }
            }
        }
        return count;
    }

    getNeighborType(x, y) {
        // Get the most common type among neighbors
        const types = {};
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = (x + dx + this.cols) % this.cols;
                const ny = (y + dy + this.rows) % this.rows;
                const cell = this.grid[ny][nx];
                if (cell && cell.fade > 0.3) {
                    types[cell.type] = (types[cell.type] || 0) + 1;
                }
            }
        }
        let maxType = 'moss';
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
        // Copy current grid to next
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = this.grid[y][x];
                const neighbors = this.countNeighbors(x, y);

                if (cell && cell.fade > 0.1) {
                    // Living cell - modified rules for organic feel
                    // Survive with 2-3 neighbors, slowly fade otherwise
                    if (neighbors >= 2 && neighbors <= 3) {
                        this.nextGrid[y][x] = {
                            ...cell,
                            age: cell.age + 1,
                            fade: Math.min(1, cell.fade + 0.1)
                        };
                    } else if (neighbors < 2 || neighbors > 4) {
                        // Underpopulation or overcrowding - fade out
                        this.nextGrid[y][x] = {
                            ...cell,
                            fade: cell.fade - 0.15
                        };
                        if (this.nextGrid[y][x].fade <= 0) {
                            this.nextGrid[y][x] = null;
                        }
                    } else {
                        this.nextGrid[y][x] = { ...cell };
                    }
                } else {
                    // Dead cell - birth with exactly 3 neighbors
                    if (neighbors === 3) {
                        const type = this.getNeighborType(x, y);
                        this.nextGrid[y][x] = {
                            type,
                            colorIndex: Math.floor(Math.random() * 3),
                            age: 0,
                            fade: 0.3
                        };
                    } else {
                        this.nextGrid[y][x] = null;
                    }
                }
            }
        }

        // Swap grids
        [this.grid, this.nextGrid] = [this.nextGrid, this.grid];

        // Occasionally seed new life to prevent extinction
        if (Math.random() < 0.02) {
            const x = Math.floor(Math.random() * this.cols);
            const y = Math.floor(Math.random() * this.rows);
            const types = ['moss', 'moss', 'amber', 'soil'];
            this.seedPattern(x, y, types[Math.floor(Math.random() * types.length)]);
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = this.grid[y][x];
                if (!cell || cell.fade <= 0) continue;

                if (cell.type === 'terminal') {
                    this.ctx.fillStyle = this.colors.terminal;
                    this.ctx.globalAlpha = cell.fade * 0.7;
                } else {
                    this.ctx.fillStyle = this.colors[cell.type][cell.colorIndex || 0];
                    this.ctx.globalAlpha = cell.fade * 0.5;
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

        // Update grid at slower interval for subtle movement
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
