const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const BLOCK_SIZE = 20;
const COLS = 12;
const ROWS = 20;

// Colores brillantes para las piezas
const COLORS = [
    '#FF3F8E', // Rosa
    '#04C2C9', // Cyan
    '#2DE2E6', // Turquesa
    '#FF6B6B', // Coral
    '#FFE66D', // Amarillo
    '#7C4DFF', // Púrpura
    '#2ECC71'  // Verde
];

// Audio
const bgMusic = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
bgMusic.loop = true;

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;
let lineCount = 0;
let gameRunning = true;

// Matriz de piezas de Tetris
const PIECES = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[1, 1, 1], [0, 1, 0]], // T
    [[1, 1, 1], [1, 0, 0]], // L
    [[1, 1, 1], [0, 0, 1]], // J
    [[1, 1, 0], [0, 1, 1]], // S
    [[0, 1, 1], [1, 1, 0]]  // Z
];

const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    color: null
};

const arena = createMatrix(COLS, ROWS);

// Agregar después de las variables globales
let touchStartX = 0;
let touchStartY = 0;
let isSwiping = false;
let lastTap = 0;

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece() {
    const piece = PIECES[Math.floor(Math.random() * PIECES.length)];
    player.matrix = piece;
    player.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    player.pos.y = 0;
    player.pos.x = Math.floor(COLS / 2) - Math.floor(piece[0].length / 2);
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] &&
                arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = player.color;
            }
        });
    });
}

function rotate(matrix) {
    const N = matrix.length;
    const result = matrix.map((row, i) =>
        matrix.map(col => col[i]).reverse()
    );
    return result;
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        createPiece();
        
        // Verificar líneas completadas
        let linesCleared = 0;
        for (let y = arena.length - 1; y >= 0; y--) {
            if (arena[y].every(value => value !== 0)) {
                const row = arena.splice(y, 1)[0].fill(0);
                arena.unshift(row);
                y++;
                linesCleared++;
                lineCount++;
            }
        }
        
        // Mostrar anuncio Popunder cada 2 líneas
        if (lineCount % 2 === 0 && lineCount > 0) {
            // El script de Adsterra ya maneja esto
        }
        
        score += linesCleared * 100;
        updateScore();
        
        if (collide(arena, player)) {
            // Game Over
            gameRunning = false;
            showGameOver();
        }
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerRotate() {
    const pos = player.pos.x;
    let offset = 1;
    const matrix = rotate(player.matrix);
    player.matrix = matrix;
    
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > matrix[0].length) {
            player.matrix = matrix;
            player.pos.x = pos;
            return;
        }
    }
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    drawMatrix(arena, {x: 0, y: 0});
    drawMatrix(player.matrix, player.pos);
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = value;
                context.fillRect(
                    (x + offset.x) * BLOCK_SIZE,
                    (y + offset.y) * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
            }
        });
    });
}

function updateScore() {
    document.getElementById('score').textContent = score;
    document.getElementById('lines').textContent = lineCount;
}

function update(time = 0) {
    if (!gameRunning) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    
    draw();
    requestAnimationFrame(update);
}

// Reemplazar los controles táctiles existentes con estos nuevos:
function initTouchControls() {
    const gameArea = document.getElementById('tetris');
    
    // Detectar inicio del toque
    gameArea.addEventListener('touchstart', e => {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
        
        // Detectar doble tap para rotación
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 300 && tapLength > 0) {
            playerRotate();
            e.preventDefault();
        }
        lastTap = currentTime;
    });
    
    // Detectar movimiento del dedo
    gameArea.addEventListener('touchmove', e => {
        e.preventDefault();
        if (!isSwiping) {
            const touchEndX = e.touches[0].clientX;
            const touchEndY = e.touches[0].clientY;
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            // Determinar si es movimiento horizontal o vertical
            if (Math.abs(deltaX) > 30) { // Umbral para movimiento horizontal
                isSwiping = true;
                if (deltaX > 0) {
                    playerMove(1); // Mover derecha
                } else {
                    playerMove(-1); // Mover izquierda
                }
                touchStartX = touchEndX;
            }
            
            // Deslizar hacia abajo para caída rápida
            if (deltaY > 30) { // Umbral para movimiento vertical
                isSwiping = true;
                playerDrop();
                touchStartY = touchEndY;
            }
        }
    });
    
    // Detectar fin del toque
    gameArea.addEventListener('touchend', e => {
        e.preventDefault();
        isSwiping = false;
    });
    
    // Mantener los botones existentes como alternativa
    document.getElementById('leftBtn').addEventListener('touchstart', e => {
        e.preventDefault();
        playerMove(-1);
    });
    
    document.getElementById('rightBtn').addEventListener('touchstart', e => {
        e.preventDefault();
        playerMove(1);
    });
    
    document.getElementById('downBtn').addEventListener('touchstart', e => {
        e.preventDefault();
        playerDrop();
    });
    
    document.getElementById('rotateBtn').addEventListener('touchstart', e => {
        e.preventDefault();
        playerRotate();
    });
}

// Agregar función para mostrar Game Over
function showGameOver() {
    context.fillStyle = 'rgba(0, 0, 0, 0.75)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = '#fff';
    context.font = '30px Arial';
    context.textAlign = 'center';
    context.fillText('Game Over', canvas.width / 2, canvas.height / 2);
    context.font = '20px Arial';
    context.fillText('Toca para continuar', canvas.width / 2, canvas.height / 2 + 40);
}

// Inicializar los controles táctiles al cargar el juego
document.addEventListener('DOMContentLoaded', () => {
    initTouchControls();
    createPiece();
    update();
    bgMusic.play().catch(() => {
        console.log('Autoplay prevented. Touch to start music.');
        document.addEventListener('touchstart', () => {
            bgMusic.play();
        }, { once: true });
    });
}); 