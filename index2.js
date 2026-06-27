// JavaScript 程式碼完全不需要修改
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
    cosmicOrb.classList.add('charging');
    starfield.classList.add('accelerate');
    
    setTimeout(() => {
        applauseSound.currentTime = 0;
        applauseSound.volume = 0.7;
        applauseSound.play();
        applauseSound.addEventListener('ended', () => {
            bgMusic.volume = 0.2;
        }, { once: true });

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
        // 等待 Google Sheet 資料獲取完畢
        await sheetDataPromise;
    } catch (e) {
        console.error("載入試算表資料失敗，已套用預設值", e);
    }
    
    // 隱藏載入畫面，顯示主介面
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 500);
    mainInterface.classList.add('show');
}

// 使用 DOMContentLoaded，這樣就不需要等待圖片或音訊等資源下載完畢
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    
    const playMusicOnce = () => {
        bgMusic.volume = 0.2;
        bgMusic.play().catch(e => console.log("背景音樂播放需要使用者互動"));
        
        // 使用者首次互動時，順便在背景載入抽籤音效，確保之後播放流暢
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
