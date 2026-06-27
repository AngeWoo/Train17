let texts = []; 
let textElements = []; 
let visibleTextElements = []; 
let nextTextIndex = 0; 
let textGenerationIntervalId = null; 
let isGeneratingText = false; 

const TEXT_GENERATION_INTERVAL = 2000; 
const OVERLAP_PADDING = 15; 
const MAX_PLACEMENT_ATTEMPTS = 50; 

// DOM Elements
const bgMusic = document.getElementById('bgMusic');
const applauseSound = document.getElementById('applauseSound');
const lotteryButton = document.querySelector('.lottery-button');
const restartButton = document.querySelector('.restart-button');
const finalTextDiv = document.getElementById('finalText');
const titleTextDiv = document.getElementById('titleText');

// --- Three.js 3D Earth Setup ---
let scene, camera, renderer, earthMesh;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let autoSpin = true;
let spinSpeed = 0.003;

function init3DEarth() {
    const container = document.getElementById('earth-container');
    if (!container) return;

    const width = container.clientWidth || 550;
    const height = container.clientHeight || 550;

    // 1. Scene & Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5.5;

    // 2. Renderer
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio); // Performance optimization
    container.appendChild(renderer.domElement);

    // 3. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15); // Ambient fill light
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.25); // Main sun-like side light
    dirLight.position.set(-5, 3, 4);
    scene.add(dirLight);

    // 4. Earth Geometry & Texture
    const geometry = new THREE.SphereGeometry(2, 64, 64);
    
    // Fallback Material (when offline or loading fails)
    const fallbackMaterial = new THREE.MeshStandardMaterial({
        color: 0x1d3a5e,
        roughness: 0.8,
        metalness: 0.1
    });

    earthMesh = new THREE.Mesh(geometry, fallbackMaterial);
    earthMesh.rotation.x = 0.25; // Slight tilt
    scene.add(earthMesh);

    // 建立完 Mesh 後，才開始非同步載入貼圖
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

    // 優先載入本地已下載好的 360度無縫展開地圖
    textureLoader.load(
        './earth_map.jpg',
        (texture) => {
            applyTexture(texture);
            console.log("本地 3D 地球無縫貼圖載入成功");
        },
        undefined,
        (err) => {
            console.warn("載入本地 earth_map.jpg 失敗，嘗試載入舊版 earth.jpg 作為 Fallback...", err);
            textureLoader.load(
                './earth.jpg',
                (localTexture) => {
                    applyTexture(localTexture);
                    console.log("舊版地球貼圖載入成功（自轉背面可能有黑邊）");
                },
                undefined,
                (localErr) => {
                    console.error("所有地球貼圖載入均失敗:", localErr);
                }
            );
        }
    );

    // 5. Interaction Events
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
        // Limit X-axis rotation to avoid upside-down view
        earthMesh.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, earthMesh.rotation.x + deltaY * 0.005));

        previousMousePosition = { x: clientX, y: clientY };
    };

    const onPointerUp = () => {
        isDragging = false;
        setTimeout(() => {
            if (!isDragging) autoSpin = true;
        }, 1500);
    };

    // Mouse Events
    container.addEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onPointerUp);

    // Touch Events for mobile
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

    // 6. Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        if (earthMesh && autoSpin) {
            earthMesh.rotation.y += spinSpeed;
        }

        renderer.render(scene, camera);
    }
    animate();

    // 7. Handle Resize
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    });
}

// --- Core App Functions ---

async function fetchSheetData() {
    console.log('Fetching sheet data...');
    const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSELNOgRozrKO1bscsHe6doF8rH9-wSPYgvkhR5xXGhHKYvKoiXnlEC8YR3G5pPwQ2YFOksnlxYAQx-/pub?output=csv';
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const csvText = await response.text();
        console.log('CSV data fetched.');

        const rows = csvText.split('\n');
        const firstColumn = rows.map(row => row.split(',')[0].trim().replace(/^"|"$/g, ''));

        texts = firstColumn.filter((text, index) => {
             if (!text) return false;
             if (index === 0 && /^[A-Za-z\s]+$/i.test(text) && text.length < 30) {
                 console.log('Potential header removed:', text);
                 return false;
             }
             return true;
         });

        console.log(`Loaded ${texts.length} text items.`);

        if (texts.length === 0) {
            console.warn('No data from sheet, using default texts.');
            useDefaultTexts();
        }
        return true;
    } catch (error) {
        console.error('Failed to fetch sheet data:', error);
        useDefaultTexts();
        return false;
    }
}

function useDefaultTexts() {
     texts = [
         "01 具備充滿自己特性的美德", "02 勿忘身為真如教徒", "03 溫柔且堅強", "04 不以自我為中心",
         "05 莫讓他人難過", "06 批評別人之前先反省自己", "07 不在背後道人長短", "08 勿堅持己見",
         "09 設身處地為他人著想", "10 身心清淨", "11 經常微笑待人", "12 成為令人珍惜的人",
         "13 為人誠實", "14 不引起爭執", "15 謙恭穩重", "16 尊重他人",
         "17 不說不必要的話"
     ];
     console.log(`Using ${texts.length} default text items.`);
}

function createTextElements() {
    textElements.forEach(el => el.remove());
    textElements = [];

    texts.forEach((text, index) => {
        const div = document.createElement('div');
        div.className = 'text-segment';
        div.dataset.index = index;
        document.body.appendChild(div);
        textElements.push(div);
    });
    console.log(`Created ${textElements.length} hidden text elements.`);
}

function displayTextSegment() {
    if (!isGeneratingText || textElements.length === 0) return;

    if (nextTextIndex >= texts.length) {
        nextTextIndex = 0;
    }

    const textToShow = texts[nextTextIndex];
    const elementToShow = textElements[nextTextIndex];

    if (!textToShow || !elementToShow) {
         nextTextIndex++;
         return;
    }

     elementToShow.textContent = textToShow;
     
     const randomSize = 0.9 + Math.random() * 0.6;
     elementToShow.style.fontSize = `${randomSize}em`;

    const position = findNonOverlappingPosition(elementToShow);

    if (position) {
        elementToShow.style.left = `${position.x}px`;
        elementToShow.style.top = `${position.y}px`;
        
        setTimeout(() => {
            elementToShow.classList.add('visible');
        }, Math.random() * 200);

         setTimeout(() => {
             const rect = elementToShow.getBoundingClientRect();
             visibleTextElements.push({ element: elementToShow, rect: rect });
         }, 50);

        nextTextIndex++;
    } else {
         nextTextIndex++;
    }
}

function findNonOverlappingPosition(element) {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    element.style.visibility = 'hidden';
    element.style.display = 'block';
    const elementRect = element.getBoundingClientRect();
    element.style.display = 'none';
    element.style.visibility = 'visible';

    if (elementRect.width === 0 || elementRect.height === 0) {
         return null;
    }

    for (let i = 0; i < MAX_PLACEMENT_ATTEMPTS; i++) {
        const x = Math.random() * (screenW - elementRect.width - OVERLAP_PADDING * 2) + OVERLAP_PADDING;
        const y = Math.random() * (screenH - elementRect.height - OVERLAP_PADDING * 2) + OVERLAP_PADDING;

        const potentialRect = {
            left: x - OVERLAP_PADDING,
            top: y - OVERLAP_PADDING,
            right: x + elementRect.width + OVERLAP_PADDING,
            bottom: y + elementRect.height + OVERLAP_PADDING,
        };

        let overlaps = false;
        for (const visible of visibleTextElements) {
            if (isOverlapping(potentialRect, visible.rect)) {
                overlaps = true;
                break;
            }
        }

        if (!overlaps) {
            return { x, y };
        }
    }
    return null;
}

function isOverlapping(rect1, rect2) {
    if (rect1.right < rect2.left || rect2.right < rect1.left) return false;
    if (rect1.bottom < rect2.top || rect2.bottom < rect1.top) return false;
    return true;
}

function startTextGeneration() {
    if (isGeneratingText) return;
    isGeneratingText = true;
    visibleTextElements = [];
    nextTextIndex = 0;
     textElements.forEach(el => {
         el.classList.remove('visible', 'fading-out');
         el.style.display = 'none';
     });

    displayTextSegment();
    textGenerationIntervalId = setInterval(displayTextSegment, TEXT_GENERATION_INTERVAL);
}

function stopTextGeneration() {
    if (!isGeneratingText) return;
    clearInterval(textGenerationIntervalId);
    textGenerationIntervalId = null;
    isGeneratingText = false;
}

function clearVisibleText() {
     visibleTextElements.forEach(visible => {
         visible.element.classList.add('fading-out');
         setTimeout(() => {
              visible.element.style.display = 'none';
              visible.element.classList.remove('visible', 'fading-out');
         }, 300);
     });
     visibleTextElements = [];
}

function triggerLottery() {
    stopTextGeneration();
    
    // Screen flash effect
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.backgroundColor = 'white';
    flash.style.opacity = '0';
    flash.style.zIndex = '50';
    flash.style.transition = 'opacity 0.2s ease-in-out';
    document.body.appendChild(flash);
    
    setTimeout(() => {
        flash.style.opacity = '0.7';
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(flash);
                clearVisibleText();
                
                setTimeout(() => {
                    bgMusic.currentTime = 0;
                    bgMusic.volume = 0.4;
                    bgMusic.play().catch(e => console.error("Music error:", e));
                    
                    applauseSound.volume = 0.7;
                    applauseSound.currentTime = 0;
                    applauseSound.play().catch(e => console.error("Applause error:", e));
                    
                    if (texts.length === 0) {
                        finalTextDiv.textContent = "錯誤：無抽籤項目";
                    } else {
                        const selectedIndex = Math.floor(Math.random() * texts.length);
                        const selectedText = texts[selectedIndex];
                        finalTextDiv.textContent = selectedText.replace(/(\d+)\s+(.*)/, '$1\n$2');
                    }

                    
                    finalTextDiv.style.display = 'block';
                    setTimeout(() => {
                        finalTextDiv.classList.add('show-final');
                    }, 20);
                    
                    titleTextDiv.style.transition = 'opacity 0.5s ease-out';
                    titleTextDiv.style.opacity = '0';
                }, 400);
            }, 200);
        }, 200);
    }, 10);
}

// --- Initialization ---

const sheetDataPromise = fetchSheetData();

async function initApp() {
    try {
        await sheetDataPromise;
    } catch (e) {
        console.error("初始化資料失敗", e);
    }
    createTextElements();
    init3DEarth();
    startTextGeneration();
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    
    lotteryButton.addEventListener('click', triggerLottery);
    restartButton.addEventListener('click', () => {
        location.reload();
    });
    
    const playMusicOnce = () => {
        bgMusic.volume = 0.4;
        bgMusic.play().catch(e => console.log("Music play blocked"));
        applauseSound.load();
        
        document.removeEventListener('click', playMusicOnce);
        document.removeEventListener('touchstart', playMusicOnce);
    };
    document.addEventListener('click', playMusicOnce);
    document.addEventListener('touchstart', playMusicOnce);
});
