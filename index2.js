let texts = [];
let isAnimating = false;

const loadingScreen = document.getElementById('loading-screen');
const mainInterface = document.getElementById('main-interface');
const resultScreen = document.getElementById('result-screen');
const bgMusic = document.getElementById('bgMusic');
const applauseSound = document.getElementById('applauseSound');
const lotteryButton = document.getElementById('lottery-button');
const restartButton = document.getElementById('restart-button');
const cosmicOrb = document.getElementById('cosmic-orb');
const starfield = document.querySelector('.starfield');

// --- Three.js 3D Cosmic Orb Setup ---
let scene, camera, renderer, particleSphere, ring1, ring2, ring3, ring4;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let autoSpin = true;
let spinSpeed = 0.003;
let targetSpinSpeed = 0.003;

let targetScale = 1.0;
let currentScale = 1.0;
let isCharging = false;
let isExploding = false;
let orbOpacity = 0.8;

// Parallax target rotation
let targetRotationX = 0;
let targetRotationY = 0;

function init3DOrb() {
    const container = document.getElementById('cosmic-orb');
    if (!container) return;

    // Use container dimensions, default to 250px
    const width = container.clientWidth || 250;
    const height = container.clientHeight || 250;

    // 1. Scene & Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 6.2;

    // 2. WebGL Renderer (with alpha background)
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    // Make canvas slightly larger to accommodate rotating rings
    renderer.setSize(width + 100, height + 100);
    renderer.setPixelRatio(window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // 3. Particle Sphere Geometry
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x00ffff); // Glow color (cyan)
    const color2 = new THREE.Color(0xff00ff); // Secondary color (magenta)

    for (let i = 0; i < particleCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        
        // Random radius simulating sphere depth (1.4 ~ 1.8)
        const r = 1.4 + Math.random() * 0.4;
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Mixed cyan and magenta colors
        const mixedColor = color1.clone().lerp(color2, Math.random());
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Points Material
    const pointsMaterial = new THREE.PointsMaterial({
        size: 0.07,
        vertexColors: true,
        transparent: true,
        opacity: orbOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particleSphere = new THREE.Points(geometry, pointsMaterial);
    scene.add(particleSphere);

    // 4. Orbiting Rings (Total 4 rings)
    const ringGeo1 = new THREE.RingGeometry(2.1, 2.14, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });
    ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2.3;
    scene.add(ring1);

    const ringGeo2 = new THREE.RingGeometry(2.3, 2.34, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });
    ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = -Math.PI / 2.8;
    ring2.rotation.y = Math.PI / 6;
    scene.add(ring2);

    const ringGeo3 = new THREE.RingGeometry(1.9, 1.94, 64);
    const ringMat3 = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });
    ring3 = new THREE.Mesh(ringGeo3, ringMat3);
    ring3.rotation.x = Math.PI / 6;
    ring3.rotation.y = Math.PI / 4;
    scene.add(ring3);

    const ringGeo4 = new THREE.RingGeometry(2.5, 2.54, 64);
    const ringMat4 = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending
    });
    ring4 = new THREE.Mesh(ringGeo4, ringMat4);
    ring4.rotation.x = -Math.PI / 4;
    ring4.rotation.y = -Math.PI / 3;
    scene.add(ring4);

    // 5. Mouse Interaction for Parallax effect
    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        targetRotationY = (x / rect.width) * 0.45;
        targetRotationX = (y / rect.height) * 0.45;
        
        // Slightly speed up on hover
        if (!isCharging && !isExploding) {
            targetSpinSpeed = 0.007;
        }
    });

    container.addEventListener('mouseleave', () => {
        targetRotationX = 0;
        targetRotationY = 0;
        if (!isCharging && !isExploding) {
            targetSpinSpeed = 0.003;
        }
    });

    // Touch interaction for mobile Parallax
    container.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            const rect = container.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left - rect.width / 2;
            const y = e.touches[0].clientY - rect.top - rect.height / 2;
            
            targetRotationY = (x / rect.width) * 0.45;
            targetRotationX = (y / rect.height) * 0.45;
        }
    }, { passive: true });

    container.addEventListener('touchend', () => {
        targetRotationX = 0;
        targetRotationY = 0;
    });

    // 6. WebGL Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        // Sinusoidal breathing effect
        const time = Date.now() * 0.0025;
        let breathScale = 1.0;
        if (!isCharging && !isExploding) {
            breathScale = 1.0 + Math.sin(time) * 0.04;
        }

        // Interpolate rotation speed
        spinSpeed = THREE.MathUtils.lerp(spinSpeed, targetSpinSpeed, 0.05);
        if (particleSphere) {
            particleSphere.rotation.y += spinSpeed;
        }
        if (ring1) ring1.rotation.z += 0.008;
        if (ring2) ring2.rotation.z -= 0.006;
        if (ring3) ring3.rotation.z += 0.012;
        if (ring4) ring4.rotation.z -= 0.004;

        // Apply smooth Parallax tilting
        scene.rotation.y = THREE.MathUtils.lerp(scene.rotation.y, targetRotationY, 0.08);
        scene.rotation.x = THREE.MathUtils.lerp(scene.rotation.x, targetRotationX, 0.08);

        // Apply charge condensation or explosion scaling
        currentScale = THREE.MathUtils.lerp(currentScale, targetScale, isExploding ? 0.15 : 0.06);
        const finalScale = currentScale * breathScale;
        
        if (particleSphere) particleSphere.scale.set(finalScale, finalScale, finalScale);
        if (ring1) ring1.scale.set(finalScale, finalScale, finalScale);
        if (ring2) ring2.scale.set(finalScale, finalScale, finalScale);
        if (ring3) ring3.scale.set(finalScale, finalScale, finalScale);
        if (ring4) ring4.scale.set(finalScale, finalScale, finalScale);

        // Exploding fade out
        if (isExploding) {
            orbOpacity = THREE.MathUtils.lerp(orbOpacity, 0.0, 0.1);
            if (pointsMaterial) pointsMaterial.opacity = orbOpacity;
            if (ringMat1) ringMat1.opacity = orbOpacity * 0.4;
            if (ringMat2) ringMat2.opacity = orbOpacity * 0.3;
            if (ringMat3) ringMat3.opacity = orbOpacity * 0.4;
            if (ringMat4) ringMat4.opacity = orbOpacity * 0.25;
        }

        renderer.render(scene, camera);
    }
    animate();
}

// --- Sheet Data Fetch ---
async function fetchSheetData() {
    const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSJvh4hp9JZWYOKyACPM-TDXKe-4aMTNQfqNxbBloYlZjsZJ_2wSVSjL88TS340Bf7CeBqVwIXCM3KA/pub?gid=0&single=true&output=csv';
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP 錯誤!`);
        const csvText = await response.text();
        const rows = csvText.split('\n');
        texts = rows
            .map(row => row.trim().replace(/^"|"$/g, ''))
            .filter(row => row);
        if (texts.length === 0) throw new Error("No data fetched");
    } catch (error) {
        console.error('獲取 Sheet 數據失敗，使用默認數據:', error);
        texts = [
            "01 具備充滿自己特性的美德", "02 勿忘身為真如教徒", "03 溫柔且堅強", "04 不以自我為中心",
            "05 莫讓他人難過", "06 批評別人之前先反省自己", "07 不在背後道人長短", "08 勿堅持己見",
            "09 設身處地為他人著想", "10 身心清淨", "11 經常微笑待人", "12 成為令人珍惜的人",
            "13 為人誠實", "14 不引起爭執", "15 謙恭穩重", "16 尊重他人", "17 不說不必要的話"
        ];
    }
}

function triggerLottery() {
    if (isAnimating) return;
    isAnimating = true;
    
    bgMusic.volume = 0.05;

    lotteryButton.classList.add('hidden');
    starfield.classList.add('accelerate');
    
    // 3D Charging animation (condensation)
    isCharging = true;
    targetSpinSpeed = 0.035;
    targetScale = 0.35;
    
    setTimeout(() => {
        applauseSound.currentTime = 0;
        applauseSound.volume = 0.7;
        applauseSound.play();
        applauseSound.addEventListener('ended', () => {
            bgMusic.volume = 0.2;
        }, { once: true });

        // 3D Exploding animation
        isCharging = false;
        isExploding = true;
        targetScale = 3.5;
        targetSpinSpeed = 0.08;
        
        cosmicOrb.classList.add('vanish');
        const rect = cosmicOrb.getBoundingClientRect();
        confetti({
            particleCount: 200, spread: 100,
            origin: { x: (rect.left + rect.right) / 2 / window.innerWidth, y: (rect.top + rect.bottom) / 2 / window.innerHeight },
            colors: ['#00ffff', '#ff00ff', '#ffffff']
        });
    }, 3000);

    setTimeout(() => {
        const selectedIndex = Math.floor(Math.random() * texts.length);
        let selectedText = texts[selectedIndex] || "196 為自己修行無法生信仰心，為他人付出可深植信仰心(苑歌月曆-常樂12)";
        const resultNumberEl = document.getElementById('result-number');
        const resultContentEl = document.getElementById('result-content');
        const parts = selectedText.match(/^(\d+)\s*(.*)/);
        if (parts && parts.length > 2) {
            let content = parts[2].trim();
            if (content.startsWith('》')) content = content.substring(1).trim();
            resultNumberEl.textContent = `《${parts[1]}》`;
            resultContentEl.textContent = content;
        } else {
            resultNumberEl.textContent = '';
            resultContentEl.textContent = selectedText;
        }
        mainInterface.style.opacity = '0';
        resultScreen.classList.add('show');
        restartButton.classList.remove('hidden');
    }, 3500);
}

// 立即發起資料獲取，不等待 DOM 或其它資源載入
const sheetDataPromise = fetchSheetData();

async function initApp() {
    try {
        await sheetDataPromise;
    } catch (e) {
        console.error("載入試算表資料失敗，已套用預設值", e);
    }
    
    // 隱藏載入畫面，顯示主介面，並初始化 3D 光球
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 500);
    mainInterface.classList.add('show');
    
    // 初始化 3D WebGL 光球
    init3DOrb();
}

// 使用 DOMContentLoaded，這樣就不需要等待圖片或音訊等資源下載完畢
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    
    const playMusicOnce = () => {
        bgMusic.volume = 0.2;
        bgMusic.play().catch(e => console.log("背景音樂播放需要使用者互動"));
        
        applauseSound.load();
        
        document.body.removeEventListener('click', playMusicOnce);
        document.body.removeEventListener('touchstart', playMusicOnce);
    };
    document.body.addEventListener('click', playMusicOnce);
    document.body.addEventListener('touchstart', playMusicOnce);
    lotteryButton.addEventListener('click', triggerLottery);
    cosmicOrb.addEventListener('click', triggerLottery);
    restartButton.addEventListener('click', () => { location.reload(); });
});
