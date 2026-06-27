const texts = [
    "01 具備充滿自己特性的美德", "02 勿忘身為真如教徒", "03 溫柔且堅強", "04 不以自我為中心",
    "05 莫讓他人難過", "06 批評別人之前先反省自己", "07 不在背後道人長短", "08 勿堅持己見",
    "09 設身處地為他人著想", "10 身心清淨", "11 經常微笑待人", "12 成為令人珍惜的人",
    "13 為人誠實", "14 不引起爭執", "15 謙恭穩重", "16 尊重他人",
    "17 不說不必要的話"
];

const maxSegments = texts.length;
const radius = 420; /* 旋轉半徑 */
let textElements = [];
let isAnimating = false;
let animationFrameId = null;
let angle = 0;
let isFirstTrigger = true;

// DOM Elements
const bgMusic = document.getElementById('bgMusic');
const applauseSound = document.getElementById('applauseSound');
const lotteryButton = document.querySelector('.lottery-button');
const restartButton = document.querySelector('.restart-button');
const finalTextDiv = document.getElementById('finalText');
const titleTextDiv = document.getElementById('titleText');
const earthMessage = document.getElementById('earthMessage');

// --- Three.js 3D Earth Setup ---
let scene, camera, renderer, earthMesh;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let autoSpin = true;
let spinSpeed = 0.003;

function init3DEarth() {
    const container = document.getElementById('earth-container');
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    // 1. Scene & Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5.5; // Prevent edges clipping

    // 2. WebGL Renderer
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // 3. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.25);
    dirLight.position.set(-5, 3, 4);
    scene.add(dirLight);

    // 4. Earth Sphere
    const geometry = new THREE.SphereGeometry(2, 64, 64);
    const fallbackMaterial = new THREE.MeshStandardMaterial({
        color: 0x1d3a5e,
        roughness: 0.8,
        metalness: 0.1
    });

    earthMesh = new THREE.Mesh(geometry, fallbackMaterial);
    earthMesh.rotation.x = 0.25;
    scene.add(earthMesh);

    // Load texture after mesh is created
    const textureLoader = new THREE.TextureLoader();

    function applyTexture(texture) {
        if (!earthMesh) return;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.65,
            metalness: 0.1
        });
        earthMesh.material = material;
    }

    textureLoader.load(
        './earth_map.jpg',
        (texture) => {
            applyTexture(texture);
            console.log("3D 地球無縫貼圖載入成功");
        },
        undefined,
        (err) => {
            console.warn("載入本地 earth_map.jpg 失敗，降級到本地 earth.jpg...", err);
            textureLoader.load(
                './earth.jpg',
                (localTexture) => {
                    applyTexture(localTexture);
                    console.log("備用地球貼圖載入成功");
                },
                undefined,
                (localErr) => {
                    console.error("所有地球貼圖載入皆失敗:", localErr);
                }
            );
        }
    );

    // 5. Drag/Touch Interaction
    const onPointerDown = (clientX, clientY) => {
        isDragging = true;
        autoSpin = false;
        previousMousePosition = { x: clientX, y: clientY };
    };

    const onPointerMove = (clientX, clientY) => {
        if (!isDragging || !earthMesh) return;
        const deltaX = clientX - previousMousePosition.x;
        const deltaY = clientY - previousMousePosition.y;

        earthMesh.rotation.y += deltaX * 0.005;
        earthMesh.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, earthMesh.rotation.x + deltaY * 0.005));

        previousMousePosition = { x: clientX, y: clientY };
    };

    const onPointerUp = () => {
        isDragging = false;
        setTimeout(() => {
            if (!isDragging) autoSpin = true;
        }, 1500);
    };

    container.addEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onPointerUp);

    container.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // 6. Animation loop
    function animateEarth() {
        requestAnimationFrame(animateEarth);

        if (earthMesh && autoSpin) {
            earthMesh.rotation.y += spinSpeed;
        }

        renderer.render(scene, camera);
    }
    animateEarth();

    // 7. Handle Resize
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    });
}

// --- Text animation functions ---

// Create DOM Text Elements
texts.forEach((text, i) => {
    const div = document.createElement('div');
    div.className = 'text-segment';
    div.textContent = text;
    div.style.opacity = '0';
    div.style.display = 'none';
    document.body.appendChild(div);
    textElements.push(div);
});

function updatePositions() {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    textElements.forEach((el, i) => {
        const individualAngle = angle + (i * (2 * Math.PI / maxSegments));
        const textLength = el.textContent.length;
        const dynamicRadius = radius + (textLength > 15 ? 50 : 0);

        const x = centerX + Math.cos(individualAngle) * dynamicRadius;
        const y = centerY + Math.sin(individualAngle) * dynamicRadius;

        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.transform = 'translateX(-50%)';

        const normalizedAngle = (individualAngle + Math.PI) % (2 * Math.PI);
        const opacity = normalizedAngle > Math.PI ? 0.5 : 1;
        el.style.opacity = opacity;
    });

    angle += 0.005;
}

function animateTexts() {
    if (!isAnimating) return;
    updatePositions();
    animationFrameId = requestAnimationFrame(animateTexts);
}

function initializeTextPositions() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        textElements.forEach((el, i) => {
            const individualAngle = i * (2 * Math.PI / maxSegments);
            const textLength = el.textContent.length;
            const dynamicRadius = radius + (textLength > 15 ? 50 : 0);
            const x = centerX + Math.cos(individualAngle) * dynamicRadius;
            const y = centerY + Math.sin(individualAngle) * dynamicRadius;
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            el.style.transform = 'translateX(-50%)';
            el.style.opacity = '0.7';
        });
        return;
    }

    // Mobile random Y falling positions
    const screenW = window.innerWidth;
    textElements.forEach((el, i) => {
        const minX = screenW * 0.15;
        const maxX = screenW * 0.85;
        const x = Math.random() * (maxX - minX) + minX;
        el.style.left = `${x}px`;
        el.style.top = `-50px`;
        el.style.transform = 'translateX(-50%)';
        el.style.opacity = '0.7';
    });
}

let mobileFallTimers = [];
function startAnimation() {
    isAnimating = true;
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) {
        animateTexts();
        bgMusic.volume = 0.5;
        bgMusic.play().catch((e) => console.log("Auto-music blocked", e));
        return;
    }

    mobileFallTimers.forEach(timer => clearTimeout(timer));
    mobileFallTimers = [];

    textElements.forEach((el, i) => {
        function fall() {
            if (!isAnimating) return;
            const delay = Math.random() * 1000;
            const duration = 5000 + Math.random() * 1500;
            setTimeout(() => {
                el.style.transition = `top ${duration}ms cubic-bezier(0.3,0.8,0.5,1)`;
                const screenH = window.innerHeight;
                const endY = screenH + 60 + Math.random() * 40;
                el.style.top = `${endY}px`;
                const timer = setTimeout(() => {
                    el.style.transition = 'none';
                    el.style.top = `-50px`;
                    void el.offsetWidth; // force reflow
                    fall();
                }, duration + 200);
                mobileFallTimers[i] = timer;
            }, delay);
        }
        fall();
    });

    bgMusic.volume = 0.5;
    bgMusic.play().catch((e) => console.log("Auto-music blocked", e));
}

function stopAnimation() {
    isAnimating = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    mobileFallTimers.forEach(timer => clearTimeout(timer));
    mobileFallTimers = [];
    bgMusic.pause();
    bgMusic.currentTime = 0;
}

function triggerLottery() {
    if (isAnimating) {
        stopAnimation();
        
        applauseSound.volume = 0.7;
        applauseSound.currentTime = 0;
        applauseSound.play();

        const selectedIndex = Math.floor(Math.random() * texts.length);

        textElements.forEach(el => {
            el.style.transition = 'all 0.8s ease-out';
            el.style.opacity = '0';
            setTimeout(() => {
                el.style.display = 'none';
            }, 800);
        });

        finalTextDiv.textContent = texts[selectedIndex];
        finalTextDiv.style.display = 'block';
        finalTextDiv.style.fontSize = '1.6em';
        finalTextDiv.style.fontSize = '1.2em';
        
        titleTextDiv.style.display = 'block';
        titleTextDiv.style.fontSize = '2.4em';
        
        earthMessage.style.display = 'block';
        const message = "向世界與未來傳揚真如慈救之利他行";
        drawCurvedText(earthMessage, message);
        
        setTimeout(() => {
            finalTextDiv.classList.add('show-final');
            titleTextDiv.classList.add('show-final');
            earthMessage.style.opacity = '1';
        }, 100);
        
        isFirstTrigger = false;
    } else if (!isFirstTrigger) {
        location.reload();
    }
}

function drawCurvedText(container, text) {
    container.innerHTML = '';
    const isMobile = window.innerWidth <= 768;
    const canvas = document.createElement('canvas');
    canvas.width = isMobile ? 300 : 400;
    canvas.height = isMobile ? 300 : 400;
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isMobile) {
        ctx.font = '24px Arial';
        ctx.fillStyle = '#ffeb3b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 10;

        const lines = ['向世界與未來傳揚', '真如慈救之利他行'];
        const lineHeight = 36;
        const centerY = canvas.height / 2 + 60;
        const offsetX = 50;

        lines.forEach((line, i) => {
            ctx.fillText(line, canvas.width / 2 + offsetX, centerY + (i - 0.5) * lineHeight);
        });
    } else {
        ctx.font = '28px Arial';
        ctx.fillStyle = '#ffeb3b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 10;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 180;

        const startAngle = Math.PI * 1.45;
        const endAngle = Math.PI * 0.55;
        const totalAngle = endAngle - startAngle;
        const anglePerChar = totalAngle / (text.length * 0.45);

        for (let i = 0; i < text.length; i++) {
            const charAngle = startAngle + i * anglePerChar;
            const x = centerX + Math.cos(charAngle) * radius;
            const y = centerY + Math.sin(charAngle) * radius;
            ctx.save();
            ctx.translate(x, y);
            ctx.fillText(text[i], 0, 0);
            ctx.restore();
        }
    }
}

// --- Initialization ---

function initApp() {
    initializeTextPositions();
    init3DEarth();
    
    // Auto-play music setup
    bgMusic.volume = 0.5;
    bgMusic.play().then(() => {
        console.log('Music started.');
    }).catch(e => {
        console.log('Interaction needed for music.', e);
        const playMusic = () => {
            bgMusic.play();
            applauseSound.load(); // Load target sound on interaction
            document.removeEventListener('click', playMusic);
            document.removeEventListener('touchstart', playMusic);
        };
        document.addEventListener('click', playMusic);
        document.addEventListener('touchstart', playMusic);
    });
    
    setTimeout(() => {
        textElements.forEach(el => {
            el.style.display = 'block';
            el.style.transition = 'opacity 0.5s ease-in-out';
            setTimeout(() => {
                el.style.opacity = '0.7';
            }, 50);
        });
        
        startAnimation();
        isFirstTrigger = false;
        
    }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    
    lotteryButton.addEventListener('click', () => {
        if (isAnimating) {
            triggerLottery();
        }
    });

    restartButton.addEventListener('click', () => {
        location.reload();
    });
});

window.addEventListener('resize', () => {
    if (isAnimating) {
        updatePositions();
    } else {
        initializeTextPositions();
    }
});
