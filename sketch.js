// ============================================================
//   诗词意象河流 — 修复密集+特效版
// ============================================================

let poems = [];
let gameStarted = false;

// 世界
let worldW = 6000;
let camX = 0;

// 河流
let riverY, riverH = 140;

// 小船
let boatX = 400;
let boatSpd = 4;

// 钓鱼动画
let fishing = false;
let fishTarget = null;
let fishLineProgress = 0;

// 意象鱼
let fishes = [];
let caughtIds = [];

// 河流背景文字
let bgChars = [];

// 朝代 — 加宽区间
let dynastyList = [
    { name: '先秦', t: 0.03, span: 0.08 },
    { name: '魏晋', t: 0.12, span: 0.08 },
    { name: '唐',   t: 0.30, span: 0.20 },
    { name: '宋',   t: 0.55, span: 0.15 },
    { name: '元',   t: 0.72, span: 0.08 },
    { name: '明',   t: 0.82, span: 0.08 },
    { name: '清',   t: 0.92, span: 0.06 }
];

// 时间轴拖动
let tlDrag = false;

// 特效系统 —— 全新
let effects = [];
let bgTint = { r: 0, g: 0, b: 0, a: 0 };       // 全屏染色
let targetTint = { r: 0, g: 0, b: 0, a: 0 };
let glowPulse = 0;    // 中心光晕
let moonUp = 0;
let umbrella = 0;
let activeEffect = '';
let effectTimer = 0;
let effectAccent = { r: 120, g: 120, b: 120 };

// 悬停
let hoveredFish = null;


// ───── preload ─────
function preload() {
    poems = loadJSON('data/poems.json');
}


// ───── setup ─────
function setup() {
    let c = createCanvas(windowWidth, windowHeight);
    c.parent('canvas-container');
    riverY = height * 0.6;

    if (!Array.isArray(poems)) {
        let temp = [];
        for (let k in poems) temp.push(poems[k]);
        poems = temp;
    }

    worldW = max(6000, poems.length * 150+ 1000);
    createFishes();
    createBgChars();

    document.getElementById('start-btn').addEventListener('click', function () {
        gameStarted = true;
        document.getElementById('start-screen').classList.add('fade-out');
        setTimeout(function () {
            document.getElementById('start-screen').style.display = 'none';}, 1200);
    });

    document.getElementById('card-close').addEventListener('click', function () {
        document.getElementById('poem-card').classList.add('hidden');
        activeEffect = '';
        targetTint = { r: 0, g: 0, b: 0, a: 0 };
    });
}


// ============================================================
//   创建意象鱼 —— 防密集算法
// ============================================================
function createFishes() {
    fishes = [];

    // 按朝代分组
    let groups = {};
    for (let i = 0; i < dynastyList.length; i++) {
        groups[dynastyList[i].name] = [];
    }
    for (let i = 0; i < poems.length; i++) {
        let d = poems[i].dynasty;
        if (!groups[d]) groups[d] = [];
        groups[d].push(poems[i]);
    }

    // 每个朝代内均匀分布
    for (let di = 0; di < dynastyList.length; di++) {
        let dyn = dynastyList[di];
        let arr = groups[dyn.name];
        if (!arr || arr.length === 0) continue;

        //朝代在世界坐标的范围
        let startT = dyn.t - dyn.span / 2;
        let endT = dyn.t + dyn.span / 2;
        let startX = 200 + startT * (worldW - 400);
        let endX = 200 + endT * (worldW - 400);
        let rangeX = endX - startX;

        // 均匀间距
        let spacing = rangeX / (arr.length + 1);
        // 最小间距 80px
        spacing = max(spacing, 80);

        for (let j = 0; j < arr.length; j++) {
            let p = arr[j];
            let wx = startX + spacing * (j + 1);

            // 上下交错避免重叠
            let yOffset;
            if (arr.length <= 5) {
                yOffset = (j % 3 - 1) * 28;
            } else {
                // 多层分布：5层
                let layer = j % 5;
                yOffset = (layer - 2) * 22;
            }

            let fy = riverY + yOffset;

            fishes.push({
                poem: p,
                worldX: wx,
                y: fy,
                baseY: fy,
                swimSpd: random(0.12, 0.3),
                swimRange: random(8, 20),
                swimOff: random(1000),
                bobSpd: random(0.012, 0.022),
                bobAmt: random(1.5, 3),
                caught: false,
                catching: false,
                screenX: 0,
                screenY: 0
            });
        }
    }
}


// ───── 河流背景文字 ─────
function createBgChars() {
    bgChars = [];
    let allChars = [];
    for (let i = 0; i < poems.length; i++) {
        let clean = poems[i].poem.replace(/[，。？！、；：""''《》\s]/g, '');
        for (let j = 0; j < clean.length; j++) {
            allChars.push(clean[j]);
        }
    }
    if (allChars.length === 0) allChars.push('诗');

    let spacingX = 55;
    let spacingY = 40;
    let cols = Math.ceil(worldW / spacingX);
    let rows = Math.ceil(riverH / spacingY);

    for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
            if (random() < 0.4) continue;
            let idx = (col * rows + row) % allChars.length;
            bgChars.push({
                wx: col * spacingX + random(-6, 6),
                ry: -riverH / 2 + row * spacingY + random(-4, 4),
                ch: allChars[idx],
                alpha: random(20, 45),
                bob: random(0.008, 0.018),
                bobAmt: random(1, 3)
            });
        }
    }
}


// ============================================================
//   draw
// ============================================================
function draw() {
    if (!gameStarted) return;

    // ── 背景：白底+ 全屏染色叠加 ──
    background(250, 250, 248);

    // 平滑过渡染色
    bgTint.r = lerp(bgTint.r, targetTint.r, 0.025);
    bgTint.g = lerp(bgTint.g, targetTint.g, 0.025);
    bgTint.b = lerp(bgTint.b, targetTint.b, 0.025);
    bgTint.a = lerp(bgTint.a, targetTint.a, 0.025);

    // 画全屏染色层
    if (bgTint.a > 1) {
        drawFullScreenTint();
    }

    updateBoat();
    updateFishPositions();
    updateFishing2();
    updateEffects();

    drawBgChars();
    drawFishes();
    drawFishingAnim();
    drawBoat();

    // 特效在最上层
    drawGlow();
    drawEffectParticles();
    drawMoon();

    drawUI();
    drawTimeline();

    checkHover();

    // 特效渐退
    if (activeEffect === '') {
        targetTint = { r: 0, g: 0, b: 0, a: 0 };
        moonUp = lerp(moonUp, 0, 0.015);
        umbrella = lerp(umbrella, 0, 0.02);
        glowPulse = lerp(glowPulse, 0, 0.02);
    }

    if (activeEffect !== '') {
        effectTimer--;
        if (effectTimer <= 0) {
            activeEffect = '';
        }
    }
}


// ============================================================
//   全屏染色 —— 解决白底遮挡
// ============================================================
function drawFullScreenTint() {
    noStroke();

    // 径向渐变：从中心向外
    let cx = boatX - camX;
    let cy = riverY - 20;
    let maxR = max(width, height) * 1.2;
    let steps = 15;

    for (let i = steps; i >= 0; i--) {
        let t = i / steps;
        let r = maxR * t;
        let a = bgTint.a * (1 - t * t) *0.7;
        fill(bgTint.r, bgTint.g, bgTint.b, a);
        ellipse(cx, cy, r * 2, r * 2);
    }

    // 顶部天空渐变
    for (let y = 0; y < riverY - riverH / 2; y += 8) {
        let t = y / (riverY - riverH / 2);
        let a = bgTint.a * 0.4 * (1 - t);
        fill(bgTint.r, bgTint.g, bgTint.b, a);
        rect(0, y, width, 10);
    }
}


// ============================================================
//   中心光晕
// ============================================================
function drawGlow() {
    if (glowPulse < 0.5) return;

    let cx = boatX - camX;
    let cy = riverY - 20;
    let pulse = sin(frameCount * 0.03) * 0.15 + 1;

    noStroke();

    // 多层光晕
    for (let i = 5; i >= 0; i--) {
        let r = (30 + i * 40) * pulse * (glowPulse / 100);
        let a = (glowPulse * 0.6) * (1 - i / 5);
        fill(effectAccent.r, effectAccent.g, effectAccent.b, a);
        ellipse(cx, cy, r, r);
    }
}


// ============================================================
//   小船
// ============================================================
function updateBoat() {
    if (!fishing) {
        if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) boatX -= boatSpd;
        if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) boatX += boatSpd;
    }
    boatX = constrain(boatX, 80, worldW - 80);

    let target = boatX - width / 2;
    target = constrain(target, 0, worldW - width);
    camX = lerp(camX, target, 0.06);
}

function drawBoat() {
    let sx = boatX - camX;
    let sy = riverY - 18;
    let bob = sin(frameCount * 0.025) * 3;
    sy += bob;

    let isDark = bgTint.a > 100;

    push();
    translate(sx, sy);

    // 水纹
    let waterAlpha = isDark ? 60 : 30;
    fill(160, 160, 155, waterAlpha);
    textAlign(CENTER, CENTER);
    textSize(10);
    noStroke();
    for (let i = 1; i <= 2; i++) {
        let wx = sin(frameCount * 0.03 + i) * 4;
        text('〜', -18- i * 14+ wx, 12+ i * 2);
        text('〜', 18 + i * 14 - wx, 12 + i * 2);
    }

    // 舟
    let boatCol = isDark ? 220 : 70;
    fill(boatCol, boatCol - 5, boatCol - 15);
    textSize(34);
    text('舟', 0, 0);

    // 人
    fill(boatCol + 20, boatCol + 15, boatCol + 5);
    textSize(18);
    text('人', 0, -22);

    // 伞
    if (umbrella > 0.1) {
        fill(boatCol + 10, boatCol + 5, boatCol - 5, umbrella * 255);
        textSize(22* umbrella);
        text('伞', 0, -22 -16 * umbrella);
    }

    pop();
}


// ============================================================
//   更新鱼屏幕坐标
// ============================================================
function updateFishPositions() {
    for (let i = 0; i < fishes.length; i++) {
        let f = fishes[i];
        if (f.catching) continue;

        let swim = sin((frameCount * 0.006* f.swimSpd) + f.swimOff) * f.swimRange;
        f.screenX = (f.worldX + swim) - camX;
        f.y = f.baseY + sin(frameCount * f.bobSpd) * f.bobAmt;
        f.screenY = f.y;
    }
}


// ============================================================
//   河流背景文字
// ============================================================
function drawBgChars() {
    textAlign(CENTER, CENTER);
    noStroke();
    let isDark = bgTint.a > 100;
    let textCol = isDark ? 140 : 195;

    for (let i = 0; i < bgChars.length; i++) {
        let bc = bgChars[i];
        let sx = bc.wx - camX + sin(frameCount * 0.002 + bc.wx * 0.005) * 5;
        if (sx < -20|| sx > width + 20) continue;

        let dy = sin(frameCount * bc.bob + bc.wx * 0.008) * bc.bobAmt;
        let sy = riverY + bc.ry + dy;

        fill(textCol, textCol, textCol - 5, bc.alpha);
        textSize(12);
        text(bc.ch, sx, sy);
    }
}


// ============================================================
//   意象鱼
// ============================================================
function drawFishes() {
    textAlign(CENTER, CENTER);
    noStroke();
    let isDark = bgTint.a > 100;

    for (let i = 0; i < fishes.length; i++) {
        let f = fishes[i];
        if (f.catching) continue;

        let sx = f.screenX;
        let sy = f.screenY;
        if (sx < -60 || sx > width + 60) continue;

        let c = hexToRgb(f.poem.color);

        if (!f.caught) {
            let isHover = (hoveredFish === f);

            // 光圈
            let glowSize = isHover ? 54 : 42;
            let glowAlpha = isHover ? 45 : 20;
            let pulse = sin(frameCount * 0.04+ f.swimOff) * 5;
            fill(c.r, c.g, c.b, glowAlpha + pulse);
            ellipse(sx, sy, glowSize + pulse, glowSize + pulse);

            // 关键词
            let fontSize = isHover ? 30 : 24;
            fill(c.r, c.g, c.b, 230);
            textSize(fontSize);
            textStyle(BOLD);
            text(f.poem.keyword, sx, sy);textStyle(NORMAL);

            // 悬停提示
            if (isHover) {
                noFill();
                stroke(c.r, c.g, c.b, 80);
                strokeWeight(1);
                ellipse(sx, sy, 58, 58);
                noStroke();

                fill(c.r, c.g, c.b, 180);
                textSize(11);
                text(f.poem.title, sx, sy - 36);

                fill(c.r, c.g, c.b, 120);
                textSize(10);
                text('〔' + f.poem.dynasty + '〕' + f.poem.poet, sx, sy + 36);
            }
        } else {
            // 已钓过— 更淡
            fill(c.r, c.g, c.b, isDark ? 40 : 25);
            textSize(14);
            text(f.poem.keyword, sx, sy);
        }
    }
}


// ============================================================
//   悬停检测
// ============================================================
function checkHover() {
    hoveredFish = null;

    if (!document.getElementById('poem-card').classList.contains('hidden')) {
        cursor(ARROW);
        return;
    }
    if (fishing) {
        cursor(ARROW);
        return;
    }

    for (let i = 0; i < fishes.length; i++) {
        let f = fishes[i];
        if (f.caught || f.catching) continue;

        let sx = f.screenX;
        let sy = f.screenY;
        if (sx < -60 || sx > width + 60) continue;

        let d = dist(mouseX, mouseY, sx, sy);
        if (d < 30) {
            hoveredFish = f;
            cursor(HAND);
            return;
        }
    }
    cursor(ARROW);
}


// ============================================================
//   点击
// ============================================================
function mousePressed() {
    if (!gameStarted) return;

    if (mouseY > height - 50) {
        tlDrag = true;
        doTlDrag();
        return;
    }

    if (!document.getElementById('poem-card').classList.contains('hidden')) return;
    if (fishing) return;

    if (hoveredFish) {
        startFishing(hoveredFish);}
}

function mouseDragged() {
    if (tlDrag) doTlDrag();
}

function mouseReleased() {
    tlDrag = false;
}

function doTlDrag() {
    let tlL = 80;
    let tlR = width - 80;
    let t = constrain((mouseX - tlL) / (tlR - tlL), 0, 1);
    boatX = 200 + t * (worldW - 400);
}


// ───── 钓鱼 ─────
function startFishing(fish) {
    fishing = true;
    fishTarget = fish;
    fish.catching = true;
    fishLineProgress = 0;
    addEffect(fish.screenX, fish.screenY,'bubble',6);
}

function updateFishing2() {
    if (!fishing || !fishTarget) return;

    fishLineProgress += 0.015;

    if (fishLineProgress >= 2) {
        fishing = false;
        fishTarget.caught = true;
        fishTarget.catching = false;

        if (!caughtIds.includes(fishTarget.poem.id)) {
            caughtIds.push(fishTarget.poem.id);
        }

        showPoemCard(fishTarget.poem);
        triggerEffect(fishTarget.poem.effect, fishTarget.poem.color);

        let sx = boatX - camX;
        addEffect(sx, riverY - 20, 'bubble', 10);

        fishTarget = null;
    }
}

function drawFishingAnim() {
    if (!fishing || !fishTarget) return;

    let bsx = boatX - camX;
    let bsy = riverY - 40+ sin(frameCount * 0.025) * 3;

    let swim = sin((frameCount * 0.006 * fishTarget.swimSpd) + fishTarget.swimOff) * fishTarget.swimRange;
    let fx = (fishTarget.worldX + swim) - camX;
    let fy = fishTarget.baseY;

    let c = hexToRgb(fishTarget.poem.color);
    let isDark = bgTint.a > 100;
    let lineCol = isDark ? 180 : 120;

    if (fishLineProgress < 1) {
        let t = fishLineProgress;
        let curX = lerp(bsx, fx, t);
        let curY = lerp(bsy, fy, t);

        stroke(lineCol, lineCol, lineCol - 10, 100);
        strokeWeight(0.8);
        line(bsx, bsy, curX, curY);noStroke();

        fill(lineCol, lineCol, lineCol - 10, 150);
        textAlign(CENTER, CENTER);
        textSize(11);
        text('钩', curX, curY);

        fill(c.r, c.g, c.b, 220);
        textSize(24);
        textStyle(BOLD);
        text(fishTarget.poem.keyword, fx, fy);
        textStyle(NORMAL);
    } else {
        let t = fishLineProgress - 1;
        let curX = lerp(fx, bsx, t);
        let curY = lerp(fy, bsy - 10, t);

        stroke(lineCol, lineCol, lineCol - 10, 100);
        strokeWeight(0.8);
        line(bsx, bsy, curX, curY);
        noStroke();

        let fishSize = lerp(24, 18, t);
        fill(c.r, c.g, c.b, 220);
        textAlign(CENTER, CENTER);
        textSize(fishSize);
        textStyle(BOLD);
        text(fishTarget.poem.keyword, curX, curY);
        textStyle(NORMAL);

        if (frameCount % 6 === 0) {
            addEffect(curX, curY, 'bubble', 1);
        }
    }
}


// ============================================================
//   特效系统 —— 全新：强染色 + 大粒子
// ============================================================
function triggerEffect(name, poemColor) {
    activeEffect = name;
    effectTimer = 400;

    let pc = hexToRgb(poemColor);
    effectAccent = { r: pc.r, g: pc.g, b: pc.b };

    // 每种特效都有强烈的全屏染色
    switch (name) {
        case 'moon':
            targetTint = { r: 15, g: 15, b: 40, a: 200 };
            moonUp = 1;
            glowPulse = 80;
            break;

        case 'flower':
        case 'spring':
            targetTint = { r: 255, g: 220, b: 220, a: 120 };
            glowPulse = 50;
            for (let i = 0; i < 80; i++)
                addEffect(random(width), random(-120, -10), 'flower', 1);
            break;

        case 'rain':
            targetTint = { r: 60, g: 80, b: 100, a: 160 };
            umbrella = 1;
            glowPulse = 30;
            for (let i = 0; i < 150; i++)
                addEffect(random(width), random(-height, 0), 'rain', 1);
            break;

        case 'snow':
            targetTint = { r: 180, g: 195, b: 220, a: 100 };
            glowPulse = 40;
            for (let i = 0; i < 80; i++)
                addEffect(random(width), random(-120, -10), 'snow', 1);
            break;

        case 'wind':
            targetTint = { r: 200, g: 220, b: 230, a: 80 };
            glowPulse = 35;
            for (let i = 0; i < 60; i++)
                addEffect(-50, random(height * 0.15, height * 0.75), 'wind', 1);
            break;

        case 'autumn':
        case 'willow':
            targetTint = { r: 200, g: 160, b: 80, a: 100 };
            glowPulse = 40;
            for (let i = 0; i < 60; i++)
                addEffect(random(width), random(-80, -10), 'leaf', 1);
            break;

        case 'star':
            targetTint = { r: 10, g: 10, b: 35, a: 210 };
            glowPulse = 60;
            for (let i = 0; i < 70; i++)
                addEffect(random(width), random(20, height * 0.45), 'star', 1);
            break;

        case 'dream':
        case 'wine':
            targetTint = { r: 60, g: 30, b: 80, a: 170 };
            glowPulse = 70;
            for (let i = 0; i < 50; i++)
                addEffect(random(width), random(height), 'dream', 1);
            break;

        case 'sword':
            targetTint = { r: 40, g: 40, b: 50, a: 140 };
            glowPulse = 90;
            for (let i = 0; i < 12; i++)
                addEffect(random(width * 0.15, width * 0.85), random(40, height * 0.35), 'sword', 1);
            break;

        case 'water':
            targetTint = { r: 100, g: 160, b: 200, a: 90 };
            glowPulse = 45;
            for (let i = 0; i < 40; i++)
                addEffect(random(width), riverY + random(-40, 40), 'bubble', 1);
            break;

        case 'bird':
            targetTint = { r: 220, g: 200, b: 170, a: 70 };
            glowPulse = 30;
            for (let i = 0; i < 15; i++)
                addEffect(random(-80, 0), random(40, height * 0.4), 'bird', 1);
            break;

        case 'mountain':
            targetTint = { r: 80, g: 100, b: 80, a: 80 };
            glowPulse = 25;
            break;

        default:
            // 未知特效也给淡染色
            targetTint = { r: pc.r, g: pc.g, b: pc.b, a: 60 };
            glowPulse = 30;
            break;
    }
}


function addEffect(x, y, type, count) {
    for (let i = 0; i < count; i++) {
        let p = {
            x: x + random(-10, 10),
            y: y + random(-10, 10),
            type: type,
            life: 300,
            maxLife: 300,
            vx: 0, vy: 0,
            size: 16,
            rot: random(TWO_PI),
            char: '',
            col: [150, 150, 150]
        };

        switch (type) {
            case 'bubble':
                p.vy = random(-2.5, -0.5);
                p.vx = random(-0.4, 0.4);
                p.life = 70; p.maxLife = 70;
                p.char = '。';
                p.size = random(10, 18);
                p.col = [140, 170, 200];
                break;
            case 'flower':
                p.vy = random(0.6, 2.2);
                p.vx = random(-1.5, 1.5);
                p.char = random(['花', '瓣', '落', '飞', '红', '粉', '樱', '桃']);
                p.col = [220, 100, 110];
                p.size = random(16, 26);
                break;
            case 'rain':
                p.vy = random(6, 12);
                p.vx = random(-0.8, 0.8);
                p.char = '雨';
                p.col = [100, 160, 200];
                p.size = random(14, 22);
                p.life = 240; p.maxLife = 240;
                break;
            case 'snow':
                p.vy = random(0.3, 1.6);
                p.vx = random(-0.6, 0.6);
                p.char = random(['雪', '霜', '冰', '寒', '白', '凝']);
                p.col = [200, 210, 230];
                p.size = random(14, 22);
                break;
            case 'wind':
                p.vx = random(4, 10);
                p.vy = random(-0.8, 0.8);
                p.char = random(['风', '吹', '飘', '动', '拂']);
                p.col = [140, 170, 195];
                p.size = random(16, 24);
                break;
            case 'leaf':
                p.vy = random(0.5, 2.0);
                p.vx = random(-1.5, 1.5);
                p.char = random(['叶', '落', '枫', '柳', '黄', '萧']);
                p.col = [200, 150, 80];
                p.size = random(16, 24);
                break;
            case 'star':
                p.vy = 0; p.vx = 0;
                p.char = random(['星', '辰', '光', '亮', '✦', '☆']);
                p.col = [220, 210, 120];
                p.size = random(14, 28);
                p.life = 280; p.maxLife = 280;
                break;
            case 'dream':
                p.vy = random(-0.8, 0.8);
                p.vx = random(-0.8, 0.8);
                p.char = random(['梦', '幻', '蝶', '影', '迷', '醉', '烟']);
                p.col = [180, 140, 220];
                p.size = random(16, 28);
                break;
            case 'sword':
                p.vy = random(3, 8);
                p.vx = random(-1.5, 1.5);
                p.char = random(['剑', '刃', '锋', '斩', '戈']);
                p.col = [190, 195, 210];
                p.size = random(20, 30);
                p.life = 90; p.maxLife = 90;
                break;
            case 'bird':
                p.vx = random(2, 6);
                p.vy = random(-1.2, 0.5);
                p.char = random(['鸟', '雀', '鸣', '飞', '翔', '燕']);
                p.col = [140, 120, 90];
                p.size = random(16, 24);
                break;
        }
        effects.push(p);
    }
}

function updateEffects() {
    // 持续补充粒子
    if (activeEffect ==='rain' && frameCount % 2 === 0)
        addEffect(random(width), -10, 'rain', 4);
    if (activeEffect === 'snow' && frameCount % 4 === 0)
        addEffect(random(width), -10, 'snow', 2);
    if ((activeEffect === 'flower' || activeEffect === 'spring') && frameCount % 6 === 0)
        addEffect(random(width), -10, 'flower', 2);
    if (activeEffect === 'wind' && frameCount % 3 === 0)
        addEffect(-50, random(height * 0.15, height * 0.75), 'wind', 1);
    if (activeEffect === 'bird' && frameCount % 12 === 0)
        addEffect(-50, random(50, height * 0.4), 'bird', 1);
    if (activeEffect === 'star' && frameCount % 20 === 0)
        addEffect(random(width), random(20, height * 0.45), 'star', 1);
    if ((activeEffect === 'dream' || activeEffect === 'wine') && frameCount % 8 === 0)
        addEffect(random(width), random(height), 'dream', 1);
    if ((activeEffect === 'autumn' || activeEffect === 'willow') && frameCount % 8 === 0)
        addEffect(random(width), -10, 'leaf', 1);

    for (let i = effects.length - 1; i >= 0; i--) {
        let e = effects[i];
        e.x += e.vx;
        e.y += e.vy;
        if (e.type === 'leaf' || e.type === 'flower') e.rot += 0.02;
        if (e.type === 'snow') e.x += sin(frameCount * 0.02 + i) * 0.4;
        if (e.type === 'dream') {
            e.x += sin(frameCount * 0.015 + i * 0.3) * 0.5;
            e.y += cos(frameCount * 0.012 + i * 0.4) * 0.3;
        }
        e.life--;
        if (e.life <= 0 || e.y > height + 40|| e.x > width + 80) {
            effects.splice(i, 1);
        }
    }
}

function drawEffectParticles() {
    textAlign(CENTER, CENTER);
    noStroke();

    for (let i = 0; i < effects.length; i++) {
        let e = effects[i];
        let alpha = map(e.life, 0, e.maxLife * 0.25, 0, 255);
        alpha = min(alpha, 255);

        // 星星闪烁
        if (e.type === 'star') {
            alpha *= (sin(frameCount * 0.06 + i * 2) * 0.3 + 0.7);
        }

        fill(e.col[0], e.col[1], e.col[2], alpha);

        push();
        translate(e.x, e.y);
        if (e.type === 'flower' || e.type === 'leaf') rotate(e.rot);
        textSize(e.size);
        text(e.char, 0, 0);
        pop();
    }
}


// ============================================================
//   月亮
// ============================================================
function drawMoon() {
    if (moonUp < 0.03) return;

    let mx = width * 0.78;
    let my = lerp(riverY, height * 0.12, moonUp);

    noStroke();

    // 大光晕
    fill(230, 200, 60, moonUp * 12);
    ellipse(mx, my, 220, 220);
    fill(235, 210, 70, moonUp * 20);
    ellipse(mx, my, 130, 130);
    fill(240, 215, 80, moonUp * 35);
    ellipse(mx, my, 80, 80);

    // 月字
    fill(240, 220, 80, moonUp * 240);
    textAlign(CENTER, CENTER);
    textSize(48);
    text('月', mx, my);

    // 倒影
    let refY = riverY + (riverY - my) * 0.25;
    if (refY < riverY + riverH / 2) {
        fill(240, 220, 80, moonUp * 35);
        textSize(32);
        push();
        translate(mx + sin(frameCount * 0.02) * 4, refY);
        scale(1, -0.5);
        text('月', 0, 0);
        pop();
    }
}


// ============================================================
//   UI
// ============================================================
function drawUI() {
    let isDark = bgTint.a > 100;
    let tc = isDark ? 220 : 80;

    noStroke();
    fill(tc, tc, tc - 5, isDark ? 200 : 120);
    textAlign(CENTER, CENTER);
    textSize(15);
    textStyle(NORMAL);
    text('诗 词意 象 河 流', width / 2,30);

    let curDyn = getDynasty();
    fill(tc, tc, tc - 5, isDark ? 140 : 80);
    textSize(12);
    text(curDyn, width / 2, 50);

    if (!fishing) {
        let blink = sin(frameCount * 0.04) * 0.3 + 0.7;
        fill(tc, tc, tc - 5,40* blink);
        textSize(11);
        text('点击河中彩色字垂钓 ｜ ← →泛舟', width / 2, riverY + riverH / 2 + 35);
    }

    fill(tc, tc, tc - 5, isDark ? 120 : 70);
    textAlign(LEFT, CENTER);
    textSize(11);
    text('已得' + caughtIds.length + ' / ' + poems.length + ' 意象', 20, 30);
}

function getDynasty() {
    let t = (boatX - 200) / (worldW - 400);
    t = constrain(t, 0, 1);
    let best = '唐';
    let bestDist = 999;
    for (let i = 0; i < dynastyList.length; i++) {
        let dd = abs(t - dynastyList[i].t);
        if (dd < bestDist) {
            bestDist = dd;
            best = dynastyList[i].name;
        }
    }
    return best;
}


// ============================================================
//   时间轴
// ============================================================
function drawTimeline() {
    let tlL = 80;
    let tlR = width - 80;
    let tlY = height - 28;
    let isDark = bgTint.a > 100;
    let lc = isDark ? 140 : 200;

    stroke(lc, lc, lc - 5, 50);
    strokeWeight(1);
    line(tlL, tlY, tlR, tlY);
    noStroke();

    textAlign(CENTER, CENTER);
    let boatT = (boatX - 200) / (worldW - 400);

    for (let i = 0; i < dynastyList.length; i++) {
        let d = dynastyList[i];
        let x = tlL + d.t * (tlR - tlL);

        stroke(lc, lc, lc - 5, 40);
        strokeWeight(1);
        line(x, tlY - 3, x, tlY + 3);
        noStroke();

        let isActive = abs(d.t - boatT) < 0.07;
        let ac = isDark ? 220 : 80;
        let ic = isDark ? 100 : 170;
        fill(
            isActive ? ac : ic,
            isActive ? ac : ic,
            isActive ? ac - 5 : ic - 5,
            isActive ? 230 : 100
        );
        textSize(isActive ? 13 : 11);
        text(d.name, x, tlY + 16);
    }

    let handleT = constrain(boatT, 0, 1);
    let hx = tlL + handleT * (tlR - tlL);
    let hc = isDark ? 200 : 100;
    fill(hc, hc, hc - 10, 200);
    noStroke();
    triangle(hx - 4, tlY - 5, hx + 4, tlY - 5, hx, tlY);
}


// ============================================================
//   显示诗词卡片
// ============================================================
function showPoemCard(poem) {
    document.getElementById('card-keyword').textContent = poem.keyword;
    document.getElementById('card-keyword').style.color = poem.color;

    let html = '';
    for (let i = 0; i < poem.poem.length; i++) {
        let ch = poem.poem[i];
        if (ch === poem.keyword) {
            html += '<span style="color:' + poem.color + ';font-weight:700;">' + ch + '</span>';
        } else {
            html += ch;
        }
    }
    document.getElementById('card-poem').innerHTML = html;

    document.getElementById('card-meta').textContent =
        '〔' + poem.dynasty + '〕' + poem.poet + '《' + poem.title + '》';
    document.getElementById('card-translation').textContent = poem.translation;
    document.getElementById('card-freq').textContent = poem.frequency + ' 次';
    document.getElementById('card-emotion').textContent = poem.emotion;
    document.getElementById('card-color-dot').style.backgroundColor = poem.color;

    document.getElementById('poem-card').classList.remove('hidden');
}


// ============================================================
//   键盘
// ============================================================
function keyPressed() {
    if (keyCode === 37|| keyCode === 38|| keyCode === 39 || keyCode === 40 || keyCode === 32) {
        return false;
    }
}


// ============================================================
//   工具
// ============================================================
function hexToRgb(hex) {
    if (!hex) return { r: 128, g: 128, b: 128 };
    hex = hex.replace('#', '');
    return {
        r: parseInt(hex.substring(0, 2), 16) || 128,
        g: parseInt(hex.substring(2, 4), 16) || 128,
        b: parseInt(hex.substring(4, 6), 16) || 128
    };
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    riverY = height * 0.6;
}