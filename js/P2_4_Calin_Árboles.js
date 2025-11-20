/**
 * Código JavaScript FINAL - SOL PLANO Y CUATRO CUADRANTES DE COLOR (RESPONSIVE)
 *
 * El sol ahora adapta su tamaño al tamaño de la ventana.
 */

// ====================================================================
// 1. CONFIGURACIÓN GLOBAL Y COLORES
// ====================================================================

// Color de fondo (Almacenará el color estático o condicional)
let BACKGROUND_COLOR; 

// --- Círculo Luminoso ---
let lightX, lightY;
// Color amarillo plano para el sol
let LIGHT_SOURCE_COLOR = '#ffff00'; 
// useDynamicBackground: true = fondo estático/apagado, false = luz activa/fondo condicional
let useDynamicBackground = true; 

// AÑADIDO: Radio del sol. Se calculará dinámicamente.
let SUN_RADIUS; 
const SUN_SIZE_FACTOR = 0.15; // El radio será el 15% del ancho del lienzo (ajustable)

// --- CONSTANTES DE COLORACIÓN DEL FONDO (Nuevas reglas por cuadrante) ---
const BG_OFF_COLOR = '#000030';    // Fondo cuando el sol está apagado (Negro muy oscuro)

// Colores Condicionales (Cuadrantes)
const BG_TOP_LEFT_COLOR    = '#4FA6DB'; // Superior Izquierdo
const BG_BOTTOM_LEFT_COLOR = '#000030'; // Inferior Izquierdo (Mismo que apagado, para un efecto de "fusión")
const BG_TOP_RIGHT_COLOR   = '#D46E00'; // Superior Derecho
const BG_BOTTOM_RIGHT_COLOR= '#160157'; // Inferior Derecho

// --- RANGOS PARA LA VARIACIÓN DE TONOS MARRONES (HSB) ---
const MARRON_HUE = 25; 
const MARRON_SATURATION = 70; 
const MARRON_BRIGHTNESS_MIN = 30; 
const MARRON_BRIGHTNESS_MAX = 80; 

// Marrón para las partículas ASENTADAS (Base de la pila)
const ASENTADO_COLOR = '#4a2c1f'; 

// --- COLOR: VERDE PARA LA CAPA SUPERIOR ---
const TOP_LAYER_COLOR = '#8bc34a'; 

const SPAWN_INTERVAL = 1;          
let frameCount = 0;

// RANGO DE TAMAÑOS Y DEFORMACIÓN 
const MIN_PARTICLE_SIZE = 30; 
const MAX_PARTICLE_SIZE = 80; 
const SHAPE_DEFORMATION_FACTOR = 0.3; 

let particulasCayendo = [];   
let particulasAcumuladas = []; 

let spawnX = 0; 
let isPouring = false;       

// --- CONSTANTES DE LA CUADRÍCULA Y EL UMBRAL DE ALTURA ---
const GRID_COLUMN_WIDTH = 20; 
let columnHeights; 
let GREEN_LAYER_Y; 
const GREEN_Y_MIN_FACTOR = 0.2; 
const GREEN_Y_MAX_FACTOR = 0.6; 

// --- Elemento del Botón ---
let replantButton;


// ====================================================================
// 2. CLASE PARTÍCULA
// ====================================================================

class Particula { 
    constructor(x, y, sizeX, sizeY, speed, color, isFalling = true) {
        this.x = x;
        this.y = y;
        this.sizeX = sizeX; 
        this.sizeY = sizeY; 
        this.speed = speed;
        this.color = color; 
        this.isFalling = isFalling;
        
        this.velX = random(-0.5, 0.5); 
        this.gravity = 0.5;          
        this.bounceFactor = 0.4;     
        this.friction = 0.95;        
    }

    draw() {
        noStroke(); 
        fill(this.color); 
        ellipse(this.x + this.sizeX / 2, this.y + this.sizeY / 2, this.sizeX, this.sizeY); 
    }

    update() {
        if (!this.isFalling) return;

        this.speed += this.gravity; 
        this.velX *= this.friction; 
        
        this.x += this.velX; 
        this.y += this.speed;

        if (this.x < 0 || this.x + this.sizeX > width) {
            this.velX *= -0.7; 
            this.x = constrain(this.x, 0, width - this.sizeX); 
        }
    }
    
    bounce(impulse) {
        this.speed *= -this.bounceFactor;
        this.velX += impulse;
    }
}

// ====================================================================
// 3. FUNCIONES AUXILIARES Y COLISIÓN
// ====================================================================

function crearParticulaAleatoria() { 
    
    const baseSize = random(MIN_PARTICLE_SIZE, MAX_PARTICLE_SIZE);
    const deformation = baseSize * SHAPE_DEFORMATION_FACTOR;
    const sizeX = baseSize + random(-deformation / 2, deformation / 2);
    const sizeY = baseSize + random(-deformation / 2, deformation / 2);
    const speed = random(3.0, 5.0); 

    colorMode(HSB, 100); 
    const randomBrightness = random(MARRON_BRIGHTNESS_MIN, MARRON_BRIGHTNESS_MAX);
    const fallingColor = color(MARRON_HUE, MARRON_SATURATION, randomBrightness);
    colorMode(RGB, 255); 

    const center_x = constrain(spawnX, MAX_PARTICLE_SIZE / 2, width - MAX_PARTICLE_SIZE / 2); 
    const x = random(center_x - 15, center_x + 15); 
    const y = -MAX_PARTICLE_SIZE; 
    
    particulasCayendo.push( 
        new Particula(x, y, sizeX, sizeY, speed, fallingColor, true)
    );
}

function getCollisionSurfaceY(fallingParticula) {
    let surfaceY = height; 

    const startCol = floor(fallingParticula.x / GRID_COLUMN_WIDTH);
    const endCol = floor((fallingParticula.x + fallingParticula.sizeX -1) / GRID_COLUMN_WIDTH);

    for (let i = startCol; i <= endCol; i++) {
        if (i >= 0 && i < columnHeights.length) { 
            surfaceY = min(surfaceY, columnHeights[i]);
        }
    }
    
    if (fallingParticula.y + fallingParticula.sizeY >= surfaceY) {
        return surfaceY;
    }
    
    return null; 
}


/**
 * Dibuja un CÍRCULO PLANO AMARILLO (sol).
 * @param {number} x - Posición X del centro de la luz.
 * @param {number} y - Posición Y del centro de la luz.
 */
function drawLightSource(x, y) {
    
    colorMode(RGB, 255);
    noStroke();

    const lightColor = color(LIGHT_SOURCE_COLOR);
    // MODIFICADO: Usa la variable global SUN_RADIUS
    const diameter = SUN_RADIUS * 2; 

    // Dibujar el círculo amarillo plano
    fill(lightColor); 
    ellipse(x, y, diameter, diameter); 
}

function resetSimulation() {
    // Limpiar arrays de partículas
    particulasAcumuladas = []; 
    particulasCayendo = []; 
    
    // Restablecer la cuadrícula de alturas
    columnHeights = new Array(ceil(width / GRID_COLUMN_WIDTH)).fill(height); 
    
    // Reiniciar el punto de inicio de la caída
    spawnX = width / 2;
    
    // Resetear el estado de la luz (fondo estático)
    useDynamicBackground = true;
    
    console.log("Simulación reiniciada por el botón 'Replant'.");
}


// ====================================================================
// 4. ESTRUCTURA PRINCIPAL DE p5.js
// ====================================================================

/**
 * Función auxiliar para centrar el botón en la posición X del lienzo.
 */
function centerReplantButton() {
    // Calcula la posición X para centrar el botón.
    if (replantButton) {
        const btnWidth = replantButton.elt.getBoundingClientRect().width;
        const xPos = (width / 2) - (btnWidth / 2);
        // Establece la posición. La posición Y (10) se mantiene fija desde la parte superior.
        replantButton.position(xPos, 10);
    }
}


function calculateResponsiveSizes() {
    // 1. Calcula el radio del sol basado en el ancho (lo más pequeño entre ancho y alto para pantallas muy estrechas)
    SUN_RADIUS = min(width, height) * SUN_SIZE_FACTOR;

    // 2. Recalcula la capa verde
    const randomYFactor = random(GREEN_Y_MIN_FACTOR, GREEN_Y_MAX_FACTOR);
    GREEN_LAYER_Y = height * randomYFactor;
    
    // 3. Recalcula la cuadrícula
    columnHeights = new Array(ceil(width / GRID_COLUMN_WIDTH)).fill(height); 
}


function setup() {
    createCanvas(windowWidth, windowHeight); 
    spawnX = width / 2;
    
    colorMode(RGB, 255); 
    
    // Calcula los tamaños responsivos al inicio
    calculateResponsiveSizes();

    // --- CREAR Y CONFIGURAR EL BOTÓN "REPLANT" ---
    replantButton = createButton('Replant');
    // Aplicar estilos básicos
    replantButton.style('font-size', '16px');
    replantButton.style('padding', '10px 15px');
    replantButton.style('border-radius', '5px');
    replantButton.style('cursor', 'pointer');
    replantButton.style('background-color', '#fff');
    replantButton.style('border', '2px solid #333');
    replantButton.mousePressed(resetSimulation); // Asignar la función de reinicio
    
    // Centrar el botón por primera vez al iniciar
    centerReplantButton();
    
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    console.log("Device motion access granted.");
                } else {
                    console.log("Device motion access denied.");
                }
            })
            .catch(console.error);
    }
}

function draw() {
    
    // --- LÓGICA DE INTERACCIÓN: POSICIÓN Y CAÍDA DE ÓVALOS (Activa al moverse) ---
    if (mouseX !== pmouseX || mouseY !== pmouseY || accelerationX !== 0) {
        isPouring = true;
        
        // Las posiciones de generación y de luz siguen al cursor/dispositivo
        if (p5.deviceType === 'mobile' || p5.deviceType === 'tablet' || accelerationX !== 0) {
            spawnX = map(accelerationX, -10, 10, 0, width);
            lightX = spawnX;
            lightY = map(accelerationY, -10, 10, 0, height); 
        } else {
            spawnX = mouseX;
            lightX = mouseX;
            lightY = mouseY;
        }
    } else {
        isPouring = false;
    }
    
    // --- LÓGICA DE INTERACCIÓN: LUZ/FONDO (Controlado por mouseIsPressed) ---
    useDynamicBackground = !mouseIsPressed; 
    
    if (mouseIsPressed) {
        // Sol activado: Color de fondo según el cuadrante
        
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        if (lightX < halfWidth) {
            // Mitad Izquierda
            if (lightY < halfHeight) {
                // Superior Izquierda: #4FA6DB
                BACKGROUND_COLOR = color(BG_TOP_LEFT_COLOR); 
            } else {
                // Inferior Izquierda: #000030
                BACKGROUND_COLOR = color(BG_BOTTOM_LEFT_COLOR);
            }
        } else {
            // Mitad Derecha
            if (lightY < halfHeight) {
                // Superior Derecha: #D46E00
                BACKGROUND_COLOR = color(BG_TOP_RIGHT_COLOR); 
            } else {
                // Inferior Derecha: #160157
                BACKGROUND_COLOR = color(BG_BOTTOM_RIGHT_COLOR);
            }
        }
    } else {
        // Sol desactivado: Color de fondo estático: #000030
        BACKGROUND_COLOR = color(BG_OFF_COLOR);
    }
    
    // 1. DIBUJAR FONDO
    background(BACKGROUND_COLOR); 
    
    // 2. DIBUJAR EL SOL *DETRÁS* DE LAS PARTÍCULAS
    if (!useDynamicBackground) {
        drawLightSource(lightX, lightY);
    } 

    // 3. GENERACIÓN DE PARTÍCULAS
    if (isPouring && frameCount % SPAWN_INTERVAL === 0) {
        crearParticulaAleatoria(); 
    }
    frameCount++;

    // 4. PROCESAR FÍSICA Y DIBUJAR ÓVALOS
    const nextParticulasCayendo = []; 
    for (let i = 0; i < particulasCayendo.length; i++) { 
        const particula = particulasCayendo[i]; 
        
        particula.update();
        const surfaceY = getCollisionSurfaceY(particula); 

        // --- LÓGICA DE REBOTE Y ASENTAMIENTO ---
        if (surfaceY !== null) { 
            particula.y = surfaceY - particula.sizeY; 
            
            if (abs(particula.speed) < 1.0 && abs(particula.velX) < 0.5) { 
                particula.isFalling = false;
                particula.speed = 0;
                particula.velX = 0; 
                
                // ASIGNAR COLOR FINAL SEGÚN LA ALTURA
                if (particula.y < GREEN_LAYER_Y) {
                    particula.color = TOP_LAYER_COLOR; // Verde
                } else {
                    particula.color = ASENTADO_COLOR; // Marrón
                }
                
                particulasAcumuladas.push(particula); 
                
                // ACTUALIZAR LA ALTURA DE LA CUADRÍCULA 
                const startCol = floor(particula.x / GRID_COLUMN_WIDTH);
                const endCol = floor((particula.x + particula.sizeX - 1) / GRID_COLUMN_WIDTH);
                for (let col = startCol; col <= endCol; col++) {
                    if (col >= 0 && col < columnHeights.length) {
                        columnHeights[col] = min(columnHeights[col], particula.y);
                    }
                }
                
            } else {
                particula.bounce(random(-3, 3)); 
                nextParticulasCayendo.push(particula);
            }
        } else {
            nextParticulasCayendo.push(particula);
        }
        particula.draw(); 
    }
    particulasCayendo = nextParticulasCayendo; 

    // 5. Dibujar acumulados (delante de la luz/fondo)
    for (const particula of particulasAcumuladas) { 
        particula.draw();
    }
}

function windowResized() {
    // 1. Redimensiona el lienzo
    resizeCanvas(windowWidth, windowHeight);
    
    // 2. Recalcula los tamaños responsivos (incluyendo SUN_RADIUS y GREEN_LAYER_Y)
    calculateResponsiveSizes();
    
    // 3. Centra el botón al redimensionar
    centerReplantButton();
    
    // 4. Reinicia las colecciones de partículas (necesario para la coherencia de la cuadrícula de colisión)
    particulasAcumuladas = []; 
    particulasCayendo = []; 
}
