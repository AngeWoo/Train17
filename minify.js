const { execSync } = require('child_process');

console.log("開始最小化 CSS...");
try {
    execSync('npx -y clean-css-cli -o index.min.css index.css');
    execSync('npx -y clean-css-cli -o index2.min.css index2.css');
    execSync('npx -y clean-css-cli -o index4.min.css index4.css');
    console.log("CSS 最小化成功！");
} catch (e) {
    console.error("CSS 最小化失敗:", e);
}

console.log("開始最小化 JS...");
try {
    execSync('npx -y terser index.js -o index.min.js --compress --mangle');
    execSync('npx -y terser index2.js -o index2.min.js --compress --mangle');
    execSync('npx -y terser index4.js -o index4.min.js --compress --mangle');
    console.log("JS 最小化成功！");
} catch (e) {
    console.error("JS 最小化失敗:", e);
}
