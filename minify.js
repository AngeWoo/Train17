const { execSync } = require('child_process');

console.log("開始最小化 CSS...");
try {
    execSync('npx -y clean-css-cli -o index2.min.css index2.css');
    console.log("CSS 最小化成功！");
} catch (e) {
    console.error("CSS 最小化失敗:", e);
}

console.log("開始最小化 JS...");
try {
    execSync('npx -y terser index2.js -o index2.min.js --compress --mangle');
    console.log("JS 最小化成功！");
} catch (e) {
    console.error("JS 最小化失敗:", e);
}
