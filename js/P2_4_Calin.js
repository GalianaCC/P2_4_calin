/**
 * Código JavaScript FINAL - P2_4_Calin.js
 * * Funcionalidades:
 * 1. Chorro de caída: Mouse move (escritorio) o Touch move (móvil).
 * 2. Control de posición: mouseX (escritorio) o accelerationX (inclinación móvil).
 * 3. Fondo: Color ascendente sincronizado con el color del chorro.
 * 4. Disolución: Los cubos desaparecen cuando el fondo retrocede.
 */

// ====================================================================
// 1. CONFIGURACIÓN GLOBAL Y COLORES
// ====================================================================

const BASE_COLOR = '#6b4e3e';      
const FALLING_COLOR = '#4a2c1f';   
const BACKGROUND_BASE_COLOR = '#e0d2c9'; 

const SPAWN_INTERVAL = 1;          
let frameCount = 0;

// Modelos de cuadrados
const modelosCuadrados = [
    { size: 8, speed: 5.0 },
    { size: 12, speed: 4.0 },  
    { size: 16, speed: 3.0 }
];

let cuadradosCayendo = [];
let cuadradosAcumulados = [];

// Constantes de Control de Interacción
const ACCEL_SENSITIVITY = 10; 
const MAX_FILL_HEIGHT_FACTOR = 0.8; // Máxima altura de llenado (80% del lienzo)
const ACCUMULATION_RATE = 0.008;     
const DECAY_RATE = 0.001;            

let spawnX = 0; 
let isPouring = false;       
let interactionLevel = 0.0; 

// ====================================================================
// 2. CLASE CUADRADO
// ====================================================================

class Cuadrado {
    constructor(x, y, size, speed, color, isFalling = true) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speed = speed;
        this.color = color;
        this.isFalling = isFalling;
        
        this.velX = random(-0.5, 0.5); 
        this.gravity = 0.3;          
        this.bounceFactor = 0.6;     
        this.friction = 0.99;        
    }

    draw() {
        noStroke(); 
        fill(this.color); 
        rect(this.x, this.y, this.size, this.size); 
    }

    update() {
        if (!this.isFalling) return;

        this.speed += this.gravity; 
        this.velX *= this.friction; 
        
        this.x += this.velX; 
        this.y += this.speed;

        if (this.x < 0 || this.x + this.size > width) {
            this.velX *= -0.7; 
            this.x = constrain(this.x, 0, width - this.size); 
        }
    }
    
    bounce(impulse) {
        this.speed *= -this.bounceFactor;
        this.velX += impulse;
    }
}

// ====================================================================
// 3. FUNCIONES AUXILIARES Y COLISIÓN DE REBOTE
// ====================================================================

function getRandomInt(min, max) {
    return floor(random(min, max + 1));
}

function getRandomModel() {
    return modelosCuadrados[getRandomInt(0, modelosCuadrados.length - 1)];
}

function crearCuadradoAleatorio() {
    const modelo = getRandomModel();
    const center_x = constrain(spawnX, 15, width - 15);
    const x = random(center_x - 15, center_x + 15); 
    const y = -modelo.size;
    
    cuadradosCayendo.push(
        new Cuadrado(x, y, modelo.size, modelo.speed, FALLING_COLOR, true)
    );
}

function getCollisionSurfaceY(fallingSquare) {
    let surfaceY = height; 

    for (const accumulatedSquare of cuadradosAcumulados) {
        if (fallingSquare.x < accumulatedSquare.x + accumulatedSquare.size &&
            fallingSquare.x + fallingSquare.size > accumulatedSquare.x) 
        {
            if (fallingSquare.y + fallingSquare.size >= accumulatedSquare.y) 
            {
                surfaceY = min(surfaceY, accumulatedSquare.y);
            }
        }
    }
    
    if (fallingSquare.y + fallingSquare.size >= surfaceY) {
        return surfaceY;
    }
    
    return null; 
}

// ====================================================================
// 4. ESTRUCTURA PRINCIPAL DE p5.js
// ====================================================================

function setup() {
    createCanvas(windowWidth, windowHeight); 
    spawnX = width / 2;
    
    // Solicitud de permiso para sensores en móviles
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
    
    // 1. DETERMINAR INTERACCIÓN Y POSICIÓN
    
    // La interacción (caída) se activa con el movimiento del mouse/dedo
    if (mouseX !== pmouseX || mouseY !== pmouseY) {
        isPouring = true;
    } else {
        isPouring = false;
    }

    // Lógica de control de posición dual
    if (p5.deviceType === 'mobile' || p5.deviceType === 'tablet' || accelerationX !== 0) {
        // MÓVIL: Control de Posición por Inclinación
        spawnX = map(accelerationX, -10, 10, 0, width);
        spawnX = constrain(spawnX, 0, width); 
    } else {
        // ESCRITORIO: Control de Posición por Ratón
        spawnX = mouseX;
    }
    
    // 2. LÓGICA DE FONDO ASCENDENTE ACUMULATIVO
    
    // Actualizar el nivel de interacción acumulado
    if (isPouring) {
        interactionLevel += ACCUMULATION_RATE;
    } else {
        interactionLevel -= DECAY_RATE;
    }
    interactionLevel = constrain(interactionLevel, 0.0, 1.0);
    
    // Establecer el color de fondo base (la parte superior del lienzo)
    background(BACKGROUND_BASE_COLOR); 

    // Calcular la altura de llenado
    const fillHeight = height * interactionLevel * MAX_FILL_HEIGHT_FACTOR;
    const fillY = height - fillHeight; // Posición Y del borde superior del fondo ascendente
    
    const baseColor = color(BACKGROUND_BASE_COLOR);
    const targetColor = color(FALLING_COLOR); // Usamos el color del chorro
    
    const fillColor = lerpColor(baseColor, targetColor, interactionLevel);

    // Dibujar el rectángulo de llenado
    noStroke();
    fill(fillColor);
    rect(0, fillY, width, fillHeight); 
    
    // 3. LÓGICA DE DESAPARICIÓN DE CUBOS ACUMULADOS
    
    // Los cubos desaparecen si el fondo está retrocediendo (no vertiendo y nivel bajando)
    if (!isPouring && interactionLevel > 0) {
        // Filtramos la lista, eliminando cubos cuya parte superior esté por debajo del nivel de llenado actual
        cuadradosAcumulados = cuadradosAcumulados.filter(cuadrado => {
            return cuadrado.y < fillY - 2; // -2 es un pequeño margen
        });
    }

    // 4. GENERACIÓN DE CUADRADOS
    
    if (isPouring && frameCount % SPAWN_INTERVAL === 0) {
        crearCuadradoAleatorio();
    }
    frameCount++;

    // 5. PROCESAR FÍSICA Y DIBUJAR
    
    const nextCuadradosCayendo = [];
    for (let i = 0; i < cuadradosCayendo.length; i++) {
        const cuadrado = cuadradosCayendo[i];
        
        cuadrado.update();

        const surfaceY = getCollisionSurfaceY(cuadrado);

        // --- LÓGICA DE REBOTE Y ASENTAMIENTO ---
        if (surfaceY !== null) { 
            
            cuadrado.y = surfaceY - cuadrado.size; 
            
            // Asentamiento FINAL
            if (abs(cuadrado.speed) < 1.0 && abs(cuadrado.velX) < 0.5) { 
                
                cuadrado.isFalling = false;
                cuadrado.speed = 0;
                cuadrado.velX = 0; 
                cuadrado.color = BASE_COLOR; 
                cuadradosAcumulados.push(cuadrado);
                
            } else {
                // Aplicar Rebote/Deslizamiento
                cuadrado.bounce(random(-3, 3)); 
                nextCuadradosCayendo.push(cuadrado);
            }
        } else {
            // Sigue cayendo
            nextCuadradosCayendo.push(cuadrado);
        }
        cuadrado.draw(); 
    }
    cuadradosCayendo = nextCuadradosCayendo;

    // 6. Dibujar acumulados
    for (const cuadrado of cuadradosAcumulados) {
        cuadrado.draw();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    cuadradosAcumulados = [];
    cuadradosCayendo = []; 
    interactionLevel = 0.0;
}