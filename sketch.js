// ============================================================
//   诗词意象河流 — 点击垂钓版（修复版）
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

// 朝代
let dynastyList = [
    { name: '先秦', t: 0.03 },
    { name: '魏晋', t: 0.12 },
    { name: '唐', t: 0.35 },
    { name: '宋', t: 0.58 },
    { name: '元', t: 0.72 },
    { name: '明', t: 0.82 },
    { name: '清', t: 0.92 }
];

// 时间轴拖动
let tlDrag = false;

// 特效
let effects = [];
let bgDark = 0;
let moonUp = 0;
let umbrella = 0;
let activeEffect = '';
let effectTimer = 0;

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

    // loadJSON可能返回对象而非数组
    if (!Array.isArray(poems)) {
        let temp = [];
        for (let k in poems) temp.push(poems[k]);
        poems = temp;
    }

    worldW = max(5000, poems.length * 120+ 800);
    createBgChars();
    createFishes();

    // 开始按钮
    document.getElementById('start-btn').addEventListener('click', function () {
        gameStarted = true;
        document.getElementById('start-screen').classList.add('fade-out');
        setTimeout(function () {
            document.getElementById('start-screen').style.display = 'none';}, 1200);
    });

    // 关闭卡片
    document.getElementById('card-close').addEventListener('click', function () {
        document.getElementById('poem-card').classList.add('hidden');
        activeEffect = '';
    });
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

    let spacingX = 50;
    let spacingY = 38;
    let cols = Math.ceil(worldW / spacingX);
    let rows = Math.ceil(riverH / spacingY);

    for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
            if (random() < 0.35) continue;
            let idx = (col * rows + row) % allChars.length;
            bgChars.push({
                wx: col * spacingX + random(-6, 6),
                ry: -riverH / 2 + row * spacingY + random(-4, 4),
                ch: allChars[idx],
                alpha: random(25, 55),
                bob: random(0.008, 0.018),
                bobAmt: random(1, 3)
            });
        }
    }
}


// ───── 创建意象鱼 ─────
function createFishes() {
    fishes = [];
    let dynMap = {};
    for (let i = 0; i < dynastyList.length; i++) {
        dynMap[dynastyList[i].name] = dynastyList[i].t;
    }

    for (let i = 0; i < poems.length; i++) {
        let p = poems[i];
        let t = dynMap[p.dynasty];
        if (t === undefined) t = 0.5;
        let wx = 150 + (t + random(-0.04, 0.04)) * (worldW - 300);
        let fy = riverY + random(-riverH * 0.22, riverH * 0.22);

        fishes.push({
            poem: p,
            worldX: wx,
            y: fy,
            baseY: fy,
            swimSpd: random(0.15, 0.4),
            swimRange: random(15, 40),
            swimOff: random(1000),
            bobSpd: random(0.012, 0.025),
            bobAmt: random(2, 4),
            caught: false,
            catching: false,
            screenX: 0,
            screenY: 0
        });
    }
}


// ============================================================
//   draw
// ============================================================
function draw() {
    if (!gameStarted) return;

    // 背景
    let bgR = lerp(250, 15, bgDark / 255);
    let bgG = lerp(250, 15, bgDark / 255);
    let bgB = lerp(248, 35, bgDark / 255);
    background(bgR, bgG, bgB);

    updateBoat();
    updateFishPositions();
    updateFishing2();
    updateEffects();

    drawBgChars();
    drawFishes();
    drawFishingAnim();
    drawBoat();
    drawEffectParticles();
    drawMoon();
    drawUI();drawTimeline();

    //悬停检测
    checkHover();

    // 特效渐退
    if (activeEffect === '') {
        bgDark = lerp(bgDark, 0, 0.015);
        moonUp = lerp(moonUp, 0, 0.015);
        umbrella = lerp(umbrella, 0, 0.02);
    }

    // 特效计时
    if (activeEffect !== '') {
        effectTimer--;
        if (effectTimer <= 0) {
            activeEffect = '';
        }
    }
}


// ============================================================
//   小船
// ============================================================
function updateBoat() {
    if (!fishing) {
        if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
            boatX -= boatSpd;
        }
        if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
            boatX += boatSpd;
        }
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

    push();
    translate(sx, sy);

    // 水纹
    let waterAlpha = bgDark > 100 ? 60 : 30;
    fill(160, 160, 155, waterAlpha);
    textAlign(CENTER, CENTER);
    textSize(10);
    noStroke();
    for (let i = 1; i <= 2; i++) {
        let wx = sin(frameCount * 0.03+ i) * 4;
        text('〜', -18- i * 14+ wx, 12+ i * 2);
        text('〜', 18 + i * 14 - wx, 12 + i * 2);
    }

    // 舟
    let boatCol = bgDark > 100 ? 200 : 70;
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
//   更新鱼的屏幕坐标（每帧计算一次，供悬停和点击用）
// ============================================================
function updateFishPositions() {
    for (let i = 0; i < fishes.length; i++) {
        let f = fishes[i];
        if (f.catching) continue;

        let swim = sin((frameCount * 0.006 * f.swimSpd) + f.swimOff) * f.swimRange;
        f.screenX = (f.worldX + swim) - camX;
        f.y = f.baseY + sin(frameCount * f.bobSpd) * f.bobAmt;
        f.screenY = f.y;}
}


// ============================================================
//   河流背景文字
// ============================================================
function drawBgChars() {
    textAlign(CENTER, CENTER);
    noStroke();
    let textCol = bgDark > 100 ? 100 : 195;

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
            let glowAlpha = isHover ? 40 : 18;
            let pulse = sin(frameCount * 0.04 + f.swimOff) * 5;
            fill(c.r, c.g, c.b, glowAlpha + pulse);
            ellipse(sx, sy, glowSize + pulse, glowSize + pulse);

            // 关键词
            let fontSize = isHover ? 30 : 24;
            fill(c.r, c.g, c.b, 230);
            textSize(fontSize);
            textStyle(BOLD);
            text(f.poem.keyword, sx, sy);
            textStyle(NORMAL);

            // 悬停提示
            if (isHover) {
                noFill();
                stroke(c.r, c.g, c.b, 80);
                strokeWeight(1);
                ellipse(sx, sy, 58, 58);
                noStroke();

                fill(c.r, c.g, c.b, 160);
                textSize(11);
                text(f.poem.title, sx, sy - 36);

                fill(c.r, c.g, c.b, 100);
                textSize(10);
                text('〔' + f.poem.dynasty + '〕' + f.poem.poet, sx, sy + 36);
            }
        } else {
            // 已钓过
            fill(c.r, c.g, c.b, 30);
            textSize(14);
            text(f.poem.keyword, sx, sy);}
    }
}


// ============================================================
//   悬停检测
// ============================================================
function checkHover() {
    hoveredFish = null;

    //卡片打开时不检测
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

    // 时间轴拖动
    if (mouseY > height - 50) {
        tlDrag = true;
        doTlDrag();
        return;
    }

    //卡片打开时不触发
    if (!document.getElementById('poem-card').classList.contains('hidden')) return;

    // 正在钓鱼时不触发
    if (fishing) return;

    // 点击鱼
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
    boatX = 150 + t * (worldW - 300);
}


// ───── 开始钓鱼 ─────
function startFishing(fish) {
    fishing = true;
    fishTarget = fish;
    fish.catching = true;
    fishLineProgress = 0;

    // 气泡
    addEffect(fish.screenX, fish.screenY, 'bubble',6);
}


// ───── 更新钓鱼动画 ─────
function updateFishing2() {
    if (!fishing || !fishTarget) return;

    fishLineProgress += 0.015;

    if (fishLineProgress >= 2) {
        // 完成
        fishing = false;
        fishTarget.caught = true;
        fishTarget.catching = false;

        if (!caughtIds.includes(fishTarget.poem.id)) {
            caughtIds.push(fishTarget.poem.id);
        }

        showPoemCard(fishTarget.poem);
        triggerEffect(fishTarget.poem.effect);

        let sx = boatX - camX;
        addEffect(sx, riverY - 20, 'bubble', 10);

        fishTarget = null;
    }
}


// ───── 画钓鱼动画 ─────
function drawFishingAnim() {
    if (!fishing || !fishTarget) return;

    let bsx = boatX - camX;
    let bsy = riverY - 40+ sin(frameCount * 0.025) * 3;

    //鱼的位置
    let swim = sin((frameCount * 0.006 * fishTarget.swimSpd) + fishTarget.swimOff) * fishTarget.swimRange;
    let fx = (fishTarget.worldX + swim) - camX;
    let fy = fishTarget.baseY;

    let c = hexToRgb(fishTarget.poem.color);
    let isDark = bgDark > 100;
    let lineCol = isDark ? 180 : 120;

    if (fishLineProgress < 1) {
        //阶段1：鱼线从船伸向鱼
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

        // 鱼在原位
        fill(c.r, c.g, c.b, 220);
        textSize(24);
        textStyle(BOLD);
        text(fishTarget.poem.keyword, fx, fy);
        textStyle(NORMAL);

    } else {
        // 阶段2：鱼被拉回船
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
//   特效系统
// ============================================================
function triggerEffect(name) {
    activeEffect = name;
    effectTimer = 360;

    switch (name) {
        case 'moon':
            bgDark = 200;
            moonUp = 1;
            break;
        case 'flower':
        case 'spring':
            for (let i = 0; i < 50; i++)
                addEffect(random(width), random(-80, -10), 'flower', 1);
            break;
        case 'rain':
            bgDark = 80;
            umbrella = 1;
            for (let i = 0; i < 100; i++)
                addEffect(random(width), random(-height, 0), 'rain', 1);
            break;
        case 'snow':
            bgDark = 50;
            for (let i = 0; i < 60; i++)
                addEffect(random(width), random(-80, -10), 'snow', 1);
            break;
        case 'wind':
            for (let i = 0; i < 40; i++)
                addEffect(-30, random(height * 0.2, height * 0.7), 'wind', 1);
            break;
        case 'autumn':
        case 'willow':
            bgDark = 30;
            for (let i = 0; i < 40; i++)
                addEffect(random(width), random(-60, -10), 'leaf', 1);
            break;
        case 'star':
            bgDark = 180;
            for (let i = 0; i < 50; i++)
                addEffect(random(width), random(20, height * 0.4), 'star', 1);
            break;
        case 'dream':
        case 'wine':
            bgDark = 120;
            for (let i = 0; i < 30; i++)
                addEffect(random(width), random(height), 'dream', 1);
            break;
        case 'sword':
            for (let i = 0; i < 8; i++)
                addEffect(random(width * 0.2, width * 0.8), random(50, height * 0.3), 'sword', 1);
            break;
        case 'water':
            for (let i = 0; i < 25; i++)
                addEffect(random(width), riverY + random(-30, 30), 'bubble', 1);
            break;case 'bird':
            for (let i = 0; i < 10; i++)
                addEffect(random(-50, 0), random(50, height * 0.35), 'bird', 1);
            break;
        case 'mountain':
            bgDark = 30;
            break;
    }
}

function addEffect(x, y, type, count) {
    for (let i = 0; i < count; i++) {
        let p = {
            x: x + random(-8, 8),
            y: y + random(-8, 8),
            type: type,
            life: 300,
            maxLife: 300,
            vx: 0,
            vy: 0,
            size: 14,
            rot: random(TWO_PI),
            char: '',
            col: [150, 150, 150]
        };

        switch (type) {
            case 'bubble':
                p.vy = random(-2, -0.5);
                p.vx = random(-0.3, 0.3);
                p.life = 60;
                p.maxLife = 60;
                p.char = '。';
                p.size = random(8, 14);
                p.col = [120, 140, 160];
                break;
            case 'flower':
                p.vy = random(0.8, 2.0);
                p.vx = random(-1, 1);
                p.char = random(['花', '瓣', '落', '飞', '红', '粉']);
                p.col = [199, 92, 92];
                p.size = random(12, 20);
                break;
            case 'rain':
                p.vy = random(5, 10);
                p.vx = random(-0.5, 0.5);
                p.char = '雨';
                p.col = [74, 143, 168];
                p.size = random(12, 18);
                p.life = 200;
                p.maxLife = 200;
                break;
            case 'snow':
                p.vy = random(0.4, 1.5);
                p.vx = random(-0.5, 0.5);
                p.char = random(['雪', '霜', '冰', '寒', '白']);
                p.col = [140, 155, 175];
                p.size = random(12, 18);
                break;
            case 'wind':
                p.vx = random(4, 9);
                p.vy = random(-0.5, 0.5);
                p.char = random(['风', '吹', '飘', '动']);
                p.col = [120, 150, 170];
                p.size = random(14, 20);
                break;
            case 'leaf':
                p.vy = random(0.6, 1.8);
                p.vx = random(-1.2, 1.2);
                p.char = random(['叶', '落', '枫', '柳', '黄']);
                p.col = [184, 134, 74];
                p.size = random(13, 19);
                break;
            case 'star':
                p.vy = 0;
                p.vx = 0;
                p.char = random(['星', '辰', '光', '亮', '✦']);
                p.col = [200, 190, 100];
                p.size = random(12, 22);
                p.life = 250;
                p.maxLife = 250;
                break;
            case 'dream':
                p.vy = random(-0.6, 0.6);
                p.vx = random(-0.6, 0.6);
                p.char = random(['梦', '幻', '蝶', '影', '迷', '醉']);
                p.col = [155, 120, 190];
                p.size = random(14, 22);
                break;
            case 'sword':
                p.vy = random(3, 7);
                p.vx = random(-1, 1);
                p.char = random(['剑', '刃', '锋', '斩']);
                p.col = [160, 165, 180];
                p.size = random(16, 24);
                p.life = 80;
                p.maxLife = 80;
                break;
            case 'bird':
                p.vx = random(2, 5);
                p.vy = random(-1, 0.5);
                p.char = random(['鸟', '雀', '鸣', '飞', '翔']);
                p.col = [120, 100, 75];
                p.size = random(14, 20);
                break;
        }
        effects.push(p);
    }
}

function updateEffects() {
    if (activeEffect ==='rain' && frameCount % 2 === 0)
        addEffect(random(width), -10, 'rain', 3);
    if (activeEffect === 'snow' && frameCount % 5 === 0)
        addEffect(random(width), -10, 'snow', 1);
    if ((activeEffect === 'flower' || activeEffect === 'spring') && frameCount % 8 === 0)
        addEffect(random(width), -10, 'flower', 1);
    if (activeEffect === 'wind' && frameCount % 4 === 0)
        addEffect(-30, random(height * 0.2, height * 0.7), 'wind', 1);
    if (activeEffect === 'bird' && frameCount % 15 === 0)
        addEffect(-30, random(50, height * 0.35), 'bird', 1);

    for (let i = effects.length - 1; i >= 0; i--) {
        let e = effects[i];
        e.x += e.vx;
        e.y += e.vy;
        if (e.type === 'leaf' || e.type === 'flower') e.rot += 0.015;
        if (e.type === 'snow') e.x += sin(frameCount * 0.02 + i) * 0.3;
        e.life--;
        if (e.life <= 0 || e.y > height + 30|| e.x > width + 60) {
            effects.splice(i, 1);
        }
    }
}

function drawEffectParticles() {
    textAlign(CENTER, CENTER);
    noStroke();
    for (let i = 0; i < effects.length; i++) {
        let e = effects[i];
        let alpha = map(e.life, 0, e.maxLife * 0.3, 0, 255);
        alpha = min(alpha, 255);
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

    let mx = width * 0.8;
    let my = lerp(riverY, height * 0.12, moonUp);

    noStroke();
    fill(200, 160, 20, moonUp * 15);
    ellipse(mx, my, 180, 180);
    fill(210, 170, 30, moonUp * 25);
    ellipse(mx, my, 100, 100);

    fill(210, 170, 30, moonUp * 240);
    textAlign(CENTER, CENTER);
    textSize(44);
    text('月', mx, my);

    //倒影
    let refY = riverY + (riverY - my) * 0.25;
    if (refY < riverY + riverH / 2) {
        fill(210, 170, 30, moonUp * 30);
        textSize(30);
        push();
        translate(mx + sin(frameCount * 0.02) * 3, refY);
        scale(1, -0.5);
        text('月', 0, 0);
        pop();
    }
}


// ============================================================
//   UI
// ============================================================
function drawUI() {
    let isDark = bgDark > 80;
    let tc = isDark ? 210 : 80;

    noStroke();
    fill(tc, tc, tc - 5, isDark ? 200 : 120);
    textAlign(CENTER, CENTER);
    textSize(15);
    textStyle(NORMAL);
    text('诗 词意 象 河 流', width / 2,30);

    // 当前朝代
    let curDyn = getDynasty();
    fill(tc, tc, tc - 5, isDark ? 140 : 80);
    textSize(12);
    text(curDyn, width / 2, 50);

    // 操作提示
    if (!fishing) {
        let blink = sin(frameCount * 0.04) * 0.3 + 0.7;
        fill(tc, tc, tc - 5, 35* blink);
        textSize(11);
        text('点击河中彩色字垂钓 ｜ ← →泛舟', width / 2, riverY + riverH / 2 + 35);
    }

    // 收藏计数
    fill(tc, tc, tc - 5, isDark ? 120 : 70);
    textAlign(LEFT, CENTER);
    textSize(11);
    text('已得' + caughtIds.length + ' / ' + poems.length + ' 意象', 20, 30);
}

function getDynasty() {
    let t = (boatX - 150) / (worldW - 300);
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
    let isDark = bgDark > 80;
    let lc = isDark ? 120 : 200;

    stroke(lc, lc, lc - 5, 50);
    strokeWeight(1);
    line(tlL, tlY, tlR, tlY);
    noStroke();

    textAlign(CENTER, CENTER);
    let boatT = (boatX - 150) / (worldW - 300);

    for (let i = 0; i < dynastyList.length; i++) {
        let d = dynastyList[i];
        let x = tlL + d.t * (tlR - tlL);

        stroke(lc, lc, lc - 5, 40);
        strokeWeight(1);
        line(x, tlY - 3, x, tlY + 3);
        noStroke();

        let isActive = abs(d.t - boatT) < 0.06;
        let ac = isDark ? 200 : 80;
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

    // 手柄
    let handleT = constrain(boatT, 0, 1);
    let hx = tlL + handleT * (tlR - tlL);
    let hc = isDark ? 180 : 100;
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
    if (keyCode === 37 || keyCode === 38 || keyCode === 39 || keyCode === 40 || keyCode === 32) {
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