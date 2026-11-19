// «Куча Монет: Кликер» — step 2: economy and the shop panel.
// Canvas 320x180 in game pixels, shown at an integer scale with no smoothing.
// Coins are BigInt (full digits, no abbreviations).
(function () {
  'use strict';

  const VERSION = '1.0.195';
  const W = 320;
  const H = 180;
  const COIN_R = 42;            // radius used for the shadow and the layout
  const HIT_R = 67;             // click zone: cookie half-width (37) + 30 px margin = 134 px across
  const COIN_Y = 104;           // cookie centre (moved down to make room under the counter)
  const COIN_X_CLOSED = 160;
  const COIN_X_OPEN = 80;       // centre of the free left half when the shop is open
  const COUNTER_LABEL_Y = 28;   // «ПРЯНИКОВ» cap line (5 px below the shop button)
  const COUNTER_NUM_Y = 38;     // big number cap line
  const COUNTER_AUTO_Y = 58;    // small line: automatic coins per second
  const FLOOR_Y = 160;          // the bottom strip is now only 20 px tall
  // top row: НАСТРОЙКИ | ДОСТИЖЕНИЯ | ПЕРЕРОЖДЕНИЕ | МАГАЗИН
  // 4 px from the screen edges and 4 px between buttons, 19 px tall, widths fitted to the text
  const TOP_Y0 = 3, TOP_Y1 = 21, TOP_GAP = 3, TOP_MARGIN = 3;   // 18 px tall; 1 px less from the top, the sides and between buttons
  const TOP_BUTTONS = [
    { id: 'settings', w: 70 },
    { id: 'achievements', w: 79 },
    { id: 'rebirth', w: 93 },
    { id: 'shop', w: 63 },   // stretched so its right edge is 3 px from the screen edge, like the settings button on the left
  ];
  function topRect(id) {
    let x = TOP_MARGIN;
    for (const b of TOP_BUTTONS) {
      if (b.id === id) return [x, x + b.w, TOP_Y0, TOP_Y1];
      x += b.w + TOP_GAP;
    }
    return null;
  }
  const [BTN_X0, BTN_X1, BTN_Y0, BTN_Y1] = topRect('shop');
  const PX0 = 160;              // panel = exactly 50% of the screen width
  const PX1 = 320;              // panel right edge
  const LIST_TOP_BASE = 38;     // below the two tab rows
  // the premium tab has 4 section buttons (2 rows) above its list
  const listTop = () => (tab === 'premium' ? 66 : LIST_TOP_BASE);
  // the tabs with the buy-amount row (КЛИК, ТЕХНИКА) keep the close button higher; the other tabs get it lower and a bigger list
  const hasBuyRow = () => tab === 'click' || tab === 'tech';
  const closeY = () => (hasBuyRow() ? 140 : 158);
  const listBottom = () => closeY() - 4;
  const ROW_H = 31;             // three text lines per row
  const PANEL_SPEED = 7;        // 1 = full slide per ~0.15 s
  const COST_GROWTH = 1.2;     // price = base * 1.15^owned

  const COL = {
    bg: '#221e40',
    floor: '#2e2854',
    shadow: '#141228',
    outline: '#6b3e12',
    gold: '#ffd84a',
    rim: '#fff3a0',
    rimDark: '#b8860b',
    ring: '#e2b028',
    emblem: '#d6a01e',
    text: '#fff6d6',
    hint: '#aaa0dc',
    btnFrame: '#e6e8ef',        // light silver frame
    btnFrameDk: '#9ea3b5',      // its shadow edge
    btnFill: '#2a2650',
    btnHi: '#3d3775',
    btnText: '#f4f5fa',
    dim: '#8a80b8',
    panel: '#1e1a38',
    panelEdge: '#6e64a0',
    row: '#2c2650',
    rowHi: '#3a3264',
    tabOn: '#5c5096',
    tabOff: '#282248',
    track: '#141228',
    thumb: '#6e64a0',
  };

  // ---------- data (placeholder names; numbers are first-pass balance) ----------
  // КЛИК: each adds `add` coins per click for every bought one (order = by click income)
  const CLICK_UPGRADES = [
    { name: 'СКАЛКА', base: 50n, add: 1n },
    { name: 'ТЕСТО', base: 100n, add: 2n },
    { name: 'ШОКОЛАД', base: 200n, add: 4n },
    { name: 'МУКА', base: 400n, add: 8n },
    { name: 'ЯЙЦО', base: 750n, add: 15n },
    { name: 'МЁД', base: 1500n, add: 30n },
    { name: 'СЛИВКИ', base: 3500n, add: 70n },
    { name: 'КОРИЦА', base: 7500n, add: 150n },
    { name: 'ИМБИРЬ', base: 15000n, add: 300n },
    { name: 'ГЛАЗУРЬ', base: 37500n, add: 750n },
  ];
  // ТЕХНИКА: each gives `rate` coins per second for every bought one
  const TECHNIKA = [
    { name: 'МИКСЕР', base: 60n, rate: 1 },
    { name: 'ПЕЧЬ', base: 240n, rate: 4 },
    { name: 'ХОЛОДИЛЬНИК', base: 600n, rate: 10 },
    { name: 'ПЛИТА', base: 1500n, rate: 25 },
    { name: 'КОФЕМАШИНА', base: 3600n, rate: 60 },
    { name: 'КОНВЕКТОМАТ', base: 7500n, rate: 125 },
    { name: 'ШОКОЛАДНЫЙ ФОНТАН', base: 18000n, rate: 300 },
    { name: 'ТЕСТОМЕС', base: 42000n, rate: 700 },
    { name: 'КОНВЕЙЕР', base: 90000n, rate: 1500 },
    { name: 'ФАБРИКА ПРЯНИКОВ', base: 210000n, rate: 3500 },
  ];
  // ПРОКАЧКИ: 4 levels per technika, listed level by level. Level k doubles that technika (2, 4, 8, 16).
  // Cost = 10 x technika base for level 1, then x8 per level. Each level needs the previous one.
  const PROK_NAMES = [
    ['СЕРЕБРЯНЫЙ ВЕНЧИК', 'ЗОЛОТОЙ ВЕНЧИК', 'ПЛАТИНОВЫЙ ВЕНЧИК', 'ТИТАНОВЫЙ ВЕНЧИК'],
    ['СЕРЕБРЯНЫЙ ПРОТИВЕНЬ', 'ЗОЛОТОЙ ПРОТИВЕНЬ', 'ПЛАТИНОВЫЙ ПРОТИВЕНЬ', 'ТИТАНОВЫЙ ПРОТИВЕНЬ'],
    ['СЕРЕБРЯНЫЙ ХЛАДАГЕНТ', 'ЗОЛОТОЙ ХЛАДАГЕНТ', 'ПЛАТИНОВЫЙ ХЛАДАГЕНТ', 'ТИТАНОВЫЙ ХЛАДАГЕНТ'],
    ['СЕРЕБРЯНАЯ ЗАЖИГАЛКА', 'ЗОЛОТАЯ ЗАЖИГАЛКА', 'ПЛАТИНОВАЯ ЗАЖИГАЛКА', 'ТИТАНОВАЯ ЗАЖИГАЛКА'],
    ['СЕРЕБРЯНЫЙ ФИЛЬТР', 'ЗОЛОТОЙ ФИЛЬТР', 'ПЛАТИНОВЫЙ ФИЛЬТР', 'ТИТАНОВЫЙ ФИЛЬТР'],
    ['СЕРЕБРЯНЫЙ ВЕНТИЛЯТОР', 'ЗОЛОТОЙ ВЕНТИЛЯТОР', 'ПЛАТИНОВЫЙ ВЕНТИЛЯТОР', 'ТИТАНОВЫЙ ВЕНТИЛЯТОР'],
    ['СЕРЕБРЯНАЯ НАСАДКА', 'ЗОЛОТАЯ НАСАДКА', 'ПЛАТИНОВАЯ НАСАДКА', 'ТИТАНОВАЯ НАСАДКА'],
    ['СЕРЕБРЯНЫЙ КРЮК', 'ЗОЛОТОЙ КРЮК', 'ПЛАТИНОВЫЙ КРЮК', 'ТИТАНОВЫЙ КРЮК'],
    ['СЕРЕБРЯНЫЙ РОЛИК', 'ЗОЛОТОЙ РОЛИК', 'ПЛАТИНОВЫЙ РОЛИК', 'ТИТАНОВЫЙ РОЛИК'],
    ['СЕРЕБРЯНЫЙ СТАНОК', 'ЗОЛОТОЙ СТАНОК', 'ПЛАТИНОВЫЙ СТАНОК', 'ТИТАНОВЫЙ СТАНОК'],
  ];
  const PROKACHKI = [];
  for (let k = 0; k < 4; k++) {
    for (let j = 0; j < TECHNIKA.length; j++) {
      PROKACHKI.push({
        name: PROK_NAMES[j][k],
        tech: j,
        level: k,
        cost: TECHNIKA[j].base * 10n * (8n ** BigInt(k)),
      });
    }
  }
  // ПРЕМИУМ (ян, пока без оплаты: кнопки заглушки) и бусты за рекламу (10 минут)
  const PREMIUM_ITEMS = [
    { kind: 'premium', id: 'double', name: '2Х ДОХОД', line: 'НАВСЕГДА', price: '40 ЯН' },
    { kind: 'premium', id: 'rebirth2', name: '2Х БОНУС ПЕРЕРОЖДЕНИЯ', line: 'НАВСЕГДА', price: '40 ЯН' },
    { kind: 'premium', id: 'discount', name: 'СКИДКА 50% НА ВСЕ', line: 'КРОМЕ ПРЕМИУМА', price: '40 ЯН' },
    { kind: 'premium', id: 'triple', name: '3Х ДОХОД', line: 'НАВСЕГДА', price: '65 ЯН' },
    { kind: 'premium', id: 'autoclick', name: 'АВТО-КЛИК', line: '10 В СЕКУНДУ', price: '25 ЯН' },
    { kind: 'premium', id: 'bundle', name: 'ПАКЕТ ВСЁ ВМЕСТЕ', line: 'НАВСЕГДА', price: '120 ЯН' },
    { kind: 'premium', id: 'reb1', add: 1, name: '+1 ПЕРЕРОЖДЕНИЕ', line: 'ВЫШЕ ДОХОД', price: '7 ЯН' },
    { kind: 'premium', id: 'reb2', add: 2, name: '+2 ПЕРЕРОЖДЕНИЯ', line: 'ВЫШЕ ДОХОД', price: '13 ЯН' },
    { kind: 'premium', id: 'reb5', add: 5, name: '+5 ПЕРЕРОЖДЕНИЙ', line: 'ВЫШЕ ДОХОД', price: '25 ЯН' },
    { kind: 'premium', id: 'reb10', add: 10, name: '+10 ПЕРЕРОЖДЕНИЙ', line: 'ВЫШЕ ДОХОД', price: '45 ЯН' },
    { kind: 'ad', id: 'double', name: '2Х ДОХОД', line: '10 МИНУТ', price: 'РЕКЛАМА' },
    { kind: 'ad', id: 'discount', name: 'СКИДКА 50% НА ВСЕ', line: '10 МИНУТ', price: 'РЕКЛАМА' },
    { kind: 'premium', id: 'skin_royal', name: 'КОРОЛЕВСКИЙ ПРЯНИК', line: 'ЗОЛОТО И КОРОНА', price: '7 ЯН' },
    { kind: 'premium', id: 'skin_ghost', name: 'ПРИЗРАЧНЫЙ ПРЯНИК', line: 'ДУХИ И ТУМАН', price: '7 ЯН' },
    { kind: 'premium', id: 'skin_neontube', name: 'НЕОНОВЫЙ ПРЯНИК', line: 'ТРУБКА И СВЕЧЕНИЕ', price: '7 ЯН' },
    { kind: 'premium', id: 'skin_crystal', name: 'КРИСТАЛЛ ПРЯНИК', line: 'ЛЁД И СНЕЖИНКИ', price: '7 ЯН' },
    { kind: 'premium', id: 'skin_volcano', name: 'ВУЛКАНИЧЕСКИЙ ПРЯНИК', line: 'ЛАВА И ИСКРЫ', price: '7 ЯН' },
    { kind: 'premium', id: 'skin_solar', name: 'СОЛНЕЧНЫЙ ПРЯНИК', line: '8 ПЛАНЕТ ВОКРУГ', price: '7 ЯН' },
    { kind: 'premium', id: 'skin_starry', name: 'ЗВЁЗДНЫЙ ПРЯНИК', line: 'ЗВЁЗДЫ И ЛУНА', price: '7 ЯН' },
    { kind: 'premium', id: 'skin_caramel', name: 'КАРАМЕЛЬНЫЙ ПРЯНИК', line: 'КАПЛИ И ЛУЖИЦА', price: '7 ЯН' },
    { kind: 'premium', id: 'skin_gzhel', name: 'ГЖЕЛЬСКИЙ ПРЯНИК', line: 'СИНИЕ УЗОРЫ', price: '7 ЯН' },
    { kind: 'premium', id: 'skin_rainbow', name: 'РАДУЖНЫЙ ПРЯНИК', line: 'ДУГА И КОНФЕТТИ', price: '7 ЯН' },
    { kind: 'premium', id: 'skin_neon', name: 'КОСМИЧЕСКИЙ ПРЯНИК', line: 'ЗВЁЗДЫ И ИСКРЫ', price: '7 ЯН' },
    { kind: 'premium', id: 'skin_sea', name: 'МОРСКОЙ ПРЯНИК', line: 'ПУЗЫРИ И РЫБКА', price: '7 ЯН' },
    { kind: 'premium', id: 'skin_halloween', name: 'ХЭЛЛОУИНСКИЙ ПРЯНИК', line: 'ЛЕТУЧИЕ МЫШИ', price: '7 ЯН' },
    { kind: 'premium', id: 'skin_easter', name: 'ПАСХАЛЬНЫЙ ПРЯНИК', line: 'ЯЙЦА И ЛЕПЕСТКИ', price: '7 ЯН' },
    { kind: 'premium', id: 'skin_zefir', name: 'ЗЕФИРНЫЙ ПРЯНИК', line: 'ОБЛАКО И СЕРДЦА', price: '7 ЯН' },
    { kind: 'premium', id: 'skin_newyear', name: 'НОВОГОДНИЙ ПРЯНИК', line: 'ЁЛКИ И ОЛЕНЬ', price: '7 ЯН' },
    { kind: 'premium', id: 'skins_all', name: 'ВСЕ ПРЕМИУМ СКИНЫ', line: 'СЕЙЧАС: 1 СКИН', price: '30 ЯН' },
  ];
  const AD_BOOST_SECONDS = 600;
  // which skin each premium shop item shows in its purchase preview (a new skin: add it here too)
  const PREMIUM_SKIN_OF = { skin_solar: 'solar', skin_neon: 'neon', skin_volcano: 'volcano', skin_neontube: 'neontube', skin_crystal: 'crystal', skin_royal: 'royal', skin_ghost: 'ghost', skin_rainbow: 'rainbow', skin_starry: 'starry', skin_newyear: 'newyear', skin_zefir: 'zefir', skin_caramel: 'caramel', skin_gzhel: 'gzhel', skin_halloween: 'halloween', skin_easter: 'easter', skin_sea: 'sea', skins_all: 'neon' };
  // every premium skin in SKINS (including the ones added later) becomes owned with the bundle
  function unlockAllPremiumSkins() {
    for (const k of SKINS) if (k.premium) skinOwned[k.id] = true;
  }
  // every premium skin: the bundle needs all of them
  const PREMIUM_SKIN_IDS = ['royal', 'ghost', 'neontube', 'crystal', 'volcano', 'solar', 'starry', 'caramel', 'gzhel', 'rainbow', 'neon', 'sea', 'halloween', 'easter', 'zefir', 'newyear'];
  // what each premium purchase does, for the confirmation and the "purchased" windows
  const PREMIUM_INFO = {
    double: { name: '2Х ДОХОД', lines: ['ДВОЙНОЙ ДОХОД ПРЯНИКОВ', 'УМНОЖАЕТСЯ С 3Х, НАВСЕГДА'] },
    reb1: { name: '+1 ПЕРЕРОЖДЕНИЕ', lines: ['+1 К ПЕРЕРОЖДЕНИЯМ', 'ВЫШЕ ДОХОД'] },
    reb2: { name: '+2 ПЕРЕРОЖДЕНИЯ', lines: ['+2 К ПЕРЕРОЖДЕНИЯМ', 'ВЫШЕ ДОХОД'] },
    reb5: { name: '+5 ПЕРЕРОЖДЕНИЙ', lines: ['+5 К ПЕРЕРОЖДЕНИЯМ', 'ВЫШЕ ДОХОД'] },
    reb10: { name: '+10 ПЕРЕРОЖДЕНИЙ', lines: ['+10 К ПЕРЕРОЖДЕНИЯМ', 'ВЫШЕ ДОХОД'] },
    bundle: { name: 'ПАКЕТ ВСЁ ВМЕСТЕ', lines: ['2Х, 3Х, АВТО-КЛИК, СКИДКА', 'НАВСЕГДА'] },
    triple: { name: '3Х ДОХОД', lines: ['ТРОЙНОЙ ДОХОД', 'УМНОЖАЕТСЯ С 2Х, НАВСЕГДА'] },
    autoclick: { name: 'АВТО-КЛИК', lines: ['10 В СЕКУНДУ', 'НАВСЕГДА'] },
    rebirth2: { name: '2Х БОНУС ПЕРЕРОЖДЕНИЯ', lines: ['КАЖДОЕ ПЕРЕРОЖДЕНИЕ ДАЁТ 4Х', 'ВМЕСТО 2Х, НАВСЕГДА'] },
    discount: { name: 'СКИДКА 50% НА ВСЕ', lines: ['ВСЕ УЛУЧШЕНИЯ ДЕШЕВЛЕ ВДВОЕ', 'КРОМЕ ПРЕМИУМА, НАВСЕГДА'] },
    skin_neon: { name: 'КОСМИЧЕСКИЙ ПРЯНИК', lines: ['ЗВЁЗДЫ И ИСКРЫ', 'НАВСЕГДА'] },
    skin_volcano: { name: 'ВУЛКАНИЧЕСКИЙ ПРЯНИК', lines: ['ЛАВА И ИСКРЫ', 'НАВСЕГДА'] },
    skin_neontube: { name: 'НЕОНОВЫЙ ПРЯНИК', lines: ['ТРУБКА И СВЕЧЕНИЕ', 'НАВСЕГДА'] },
    skin_crystal: { name: 'КРИСТАЛЛ ПРЯНИК', lines: ['ЛЁД И СНЕЖИНКИ', 'НАВСЕГДА'] },
    skin_royal: { name: 'КОРОЛЕВСКИЙ ПРЯНИК', lines: ['ЗОЛОТО И КОРОНА', 'НАВСЕГДА'] },
    skin_ghost: { name: 'ПРИЗРАЧНЫЙ ПРЯНИК', lines: ['ДУХИ И ТУМАН', 'НАВСЕГДА'] },
    skin_rainbow: { name: 'РАДУЖНЫЙ ПРЯНИК', lines: ['ДУГА И КОНФЕТТИ', 'НАВСЕГДА'] },
    skin_starry: { name: 'ЗВЁЗДНЫЙ ПРЯНИК', lines: ['ЗВЁЗДЫ И ЛУНА', 'НАВСЕГДА'] },
    skin_newyear: { name: 'НОВОГОДНИЙ ПРЯНИК', lines: ['ЁЛКИ И ОЛЕНЬ', 'НАВСЕГДА'] },
    skin_zefir: { name: 'ЗЕФИРНЫЙ ПРЯНИК', lines: ['ОБЛАКО И СЕРДЦА', 'НАВСЕГДА'] },
    skin_caramel: { name: 'КАРАМЕЛЬНЫЙ ПРЯНИК', lines: ['КАПЛИ И ЛУЖИЦА', 'НАВСЕГДА'] },
    skin_gzhel: { name: 'ГЖЕЛЬСКИЙ ПРЯНИК', lines: ['СИНИЕ УЗОРЫ', 'НАВСЕГДА'] },
    skin_halloween: { name: 'ХЭЛЛОУИНСКИЙ ПРЯНИК', lines: ['ЛЕТУЧИЕ МЫШИ', 'НАВСЕГДА'] },
    skin_easter: { name: 'ПАСХАЛЬНЫЙ ПРЯНИК', lines: ['ЯЙЦА И ЛЕПЕСТКИ', 'НАВСЕГДА'] },
    skin_solar: { name: 'СОЛНЕЧНЫЙ ПРЯНИК', lines: ['8 ПЛАНЕТ ВОКРУГ', 'НАВСЕГДА'] },
    skin_sea: { name: 'МОРСКОЙ ПРЯНИК', lines: ['ПУЗЫРИ И РЫБКА', 'НАВСЕГДА'] },
    skins_all: { name: 'ВСЕ ПРЕМИУМ СКИНЫ', lines: ['СРАЗУ ВСЕ СКИНЫ', 'ВСЕ 16 ПРЯНИКОВ'] },
  };
  // for each technika, the global PROKACHKI indexes of its 4 upgrades (level 1..4)
  const PROK_BY_TECH = TECHNIKA.map((_, j) => PROKACHKI.map((p, g) => (p.tech === j ? g : -1)).filter((g) => g >= 0));

  const canvas = document.getElementById('game');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // ---------- fit to window at an integer scale ----------
  function fit() {
    const s = Math.max(1, Math.floor(Math.min(window.innerWidth / W, window.innerHeight / H)));
    canvas.style.width = W * s + 'px';
    canvas.style.height = H * s + 'px';
  }
  window.addEventListener('resize', fit);
  fit();

  // ---------- pixel font ----------
  function glyphWidth(ch) {
    return ch === ' ' ? FONT_SPACE_W : FONT[ch].rows[0].length;
  }
  function textWidth(str, sc) {
    let total = 0;
    for (const ch of str) total += glyphWidth(ch) * sc + sc;
    return total - sc;
  }
  // small 5 px pixel font (3 px wide glyphs) for the small counter line: digits, +, В, С, Е, К and space
  const SMALL_FONT = {
    '0': ['###', '#.#', '#.#', '#.#', '###'],
    '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '2': ['###', '..#', '###', '#..', '###'],
    '3': ['###', '..#', '###', '..#', '###'],
    '4': ['#.#', '#.#', '###', '..#', '..#'],
    '5': ['###', '#..', '###', '..#', '###'],
    '6': ['###', '#..', '###', '#.#', '###'],
    '7': ['###', '..#', '..#', '..#', '..#'],
    '8': ['###', '#.#', '###', '#.#', '###'],
    '9': ['###', '#.#', '###', '..#', '###'],
    '+': ['...', '.#.', '###', '.#.', '...'],
    'В': ['##.', '#.#', '##.', '#.#', '##.'],
    'С': ['.##', '#..', '#..', '#..', '.##'],
    'Е': ['###', '#..', '##.', '#..', '###'],
    'К': ['#.#', '#.#', '##.', '#.#', '#.#'],
    ' ': ['..', '..', '..', '..', '..'],
  };
  function smallTextWidth(str) {
    let w = 0;
    for (const ch of str) w += SMALL_FONT[ch][0].length + 1;
    return w - 1;
  }
  function drawSmallText(str, cx, y, color) {
    const x0 = cx - Math.floor(smallTextWidth(str) / 2);
    ctx.fillStyle = color;
    let x = x0;
    for (const ch of str) {
      const rows = SMALL_FONT[ch];
      for (let j = 0; j < rows.length; j++) {
        for (let i = 0; i < rows[j].length; i++) {
          if (rows[j][i] === '#') ctx.fillRect(x + i, y + j, 1, 1);
        }
      }
      x += rows[0].length + 1;
    }
  }

  // centres a string inside the box [x0,x1) x [y0,y1) using the real glyph widths and cap height
  function drawTextBox(str, sc, x0, x1, y0, y1, color) {
    const left = x0 + Math.floor((x1 - x0 - textWidth(str, sc)) / 2);
    const top = y0 + Math.floor((y1 - y0 - 8 * sc) / 2);
    drawText(str, sc, left, top, color, 'left');
  }

  // align: 'center' (x is the middle) or 'left' (x is the left edge)
  function drawText(str, sc, x, yCap, color, align) {
    const total = textWidth(str, sc);
    // whole pixels only: a half-pixel start (e.g. a centre at 273.5) blurs every glyph edge
    let cx = Math.round(align === 'left' ? x : x - Math.floor(total / 2));
    yCap = Math.round(yCap);
    ctx.fillStyle = color;
    for (const ch of str) {
      if (ch !== ' ') {
        const g = FONT[ch];
        for (let j = 0; j < g.rows.length; j++) {
          const row = g.rows[j];
          const gy = yCap + (j - g.above) * sc;
          for (let i = 0; i < row.length; i++) {
            if (row[i] === '#') ctx.fillRect(cx + i * sc, gy, sc, sc);
          }
        }
      }
      cx += glyphWidth(ch) * sc + sc;
    }
  }

  // ---------- coin sprite ----------
  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi) inside = !inside;
    }
    return inside;
  }
  // rx, ry: radii in game pixels. Returns an offscreen canvas with the coin.
  function makeCoin(rx, ry, withStar) {
    const size = Math.ceil(Math.max(rx, ry) * 2);
    const cv = document.createElement('canvas');
    cv.width = size;
    cv.height = size;
    const g = cv.getContext('2d');
    const c = (size - 1) / 2;
    const squash = ry / rx;
    const outer = rx * 0.38;
    const innerR = outer * 0.45;
    const star = [];
    for (let k = 0; k < 10; k++) {
      const r = k % 2 === 0 ? outer : innerR;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      star.push([c + r * Math.cos(a), c + r * Math.sin(a) * squash]);
    }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - c) / rx;
        const dy = (y - c) / ry;
        if (dx * dx + dy * dy > 1) continue;
        const ix = (x - c) / (rx - 2);
        const iy = (y - c) / (ry - 2);
        let col;
        if (ix * ix + iy * iy > 1) {
          col = COL.outline;
        } else {
          const light = (c - x) * 0.6 + (c - y) * 0.8;
          if (light > rx * 0.55) col = COL.rim;
          else if (light < -rx * 0.45) col = COL.rimDark;
          else col = COL.gold;
          const rxx = (x - c) / (rx * 0.72);
          const ryy = (y - c) / (ry * 0.72);
          const ring = rxx * rxx + ryy * ryy;
          if (ring >= 0.9 && ring <= 1.1) col = COL.ring;
          if (withStar && pointInPoly(x, y, star)) col = COL.emblem;
        }
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
    return cv;
  }
  // the clickable object is the plain gingerbread C (original colours); three frames
  const COOKIE_SIZE = 74;
  let cookieImg = null;
  let FRAME = null;
  function makeFrames() {
    const scaled = (w, h) => {
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(cookieImg, 0, 0, w, h);
      // measure the visible pixels so the drawn C is centred, not its empty sprite box
      const a = g.getImageData(0, 0, w, h).data;
      let minx = w, maxx = -1, miny = h, maxy = -1;
      for (let yy = 0; yy < h; yy++) {
        for (let xx = 0; xx < w; xx++) {
          if (a[(yy * w + xx) * 4 + 3] > 0) {
            if (xx < minx) minx = xx;
            if (xx > maxx) maxx = xx;
            if (yy < miny) miny = yy;
            if (yy > maxy) maxy = yy;
          }
        }
      }
      cv.shiftX = (minx + maxx + 1) / 2 - w / 2;
      cv.shiftY = (miny + maxy + 1) / 2 - h / 2;
      cv.alpha = a;   // the cookie's own shape, for hiding things behind it
      return cv;
    };
    return {
      rest: scaled(COOKIE_SIZE, COOKIE_SIZE),
      squash: scaled(80, 66),   // squashed on click
      bounce: scaled(76, 76),   // springs back
    };
  }
  // skins: the gingerbread image for each skin; the chosen one is loaded and the frames rebuilt
  const SKINS = [
    { id: 'classic', name: 'КЛАССИЧЕСКИЙ', src: 'art/cookie-plain.png', ready: true },
    { id: 'banana', name: 'БАНАНОВЫЙ', src: 'art/cookie-banana.png', ready: true },
    { id: 'chocolate', name: 'ШОКОЛАДНЫЙ', src: 'art/cookie-chocolate.png', ready: true },
    { id: 'vanilla', name: 'ВАНИЛЬНЫЙ', src: 'art/cookie-vanilla.png', ready: true },
    { id: 'strawberry', name: 'КЛУБНИЧНЫЙ', src: 'art/cookie-strawberry.png', ready: true },
    { id: 'mint', name: 'МЯТНЫЙ', src: 'art/cookie-mint.png', ready: true },
    { id: 'ice', name: 'ЛЕДЯНОЙ', src: 'art/cookie-ice.png', ready: true },
    { id: 'gold', name: 'ЗОЛОТОЙ', src: 'art/cookie-gold.png', ready: true },
    { id: 'royal', name: 'КОРОЛЕВСКИЙ', src: 'art/cookie-royal.png', ready: true, premium: true },
    { id: 'ghost', name: 'ПРИЗРАЧНЫЙ', src: 'art/cookie-ghost.png', ready: true, premium: true },
    { id: 'neontube', name: 'НЕОНОВЫЙ', src: 'art/cookie-neontube.png', ready: true, premium: true },
    { id: 'crystal', name: 'КРИСТАЛЛ', src: 'art/cookie-crystal.png', ready: true, premium: true },
    { id: 'volcano', name: 'ВУЛКАНИЧЕСКИЙ', src: 'art/cookie-volcano.png', ready: true, premium: true },
    { id: 'solar', name: 'СОЛНЕЧНАЯ СИСТЕМА', src: 'art/cookie-solar.png', ready: true, premium: true },
    { id: 'starry', name: 'ЗВЁЗДНАЯ НОЧЬ', src: 'art/cookie-starry.png', ready: true, premium: true },
    { id: 'caramel', name: 'КАРАМЕЛЬНЫЙ', src: 'art/cookie-caramel.png', ready: true, premium: true },
    { id: 'gzhel', name: 'ГЖЕЛЬ', src: 'art/cookie-gzhel.png?v=1', ready: true, premium: true },
    { id: 'rainbow', name: 'РАДУЖНЫЙ', src: 'art/cookie-rainbow.png?v=2', ready: true, premium: true },
    { id: 'neon', name: 'КОСМИЧЕСКИЙ', src: 'art/cookie-neon.png', ready: true, premium: true },
    { id: 'sea', name: 'МОРСКОЙ', src: 'art/cookie-sea.png', ready: true, premium: true },
    { id: 'halloween', name: 'ХЭЛЛОУИН', src: 'art/cookie-halloween.png?v=1', ready: true, premium: true },
    { id: 'easter', name: 'ПАСХАЛЬНЫЙ', src: 'art/cookie-easter.png?v=1', ready: true, premium: true },
    { id: 'zefir', name: 'ЗЕФИРНЫЙ', src: 'art/cookie-zefir.png', ready: true, premium: true },
    { id: 'newyear', name: 'НОВОГОДНИЙ', src: 'art/cookie-newyear.png?v=5', ready: true, premium: true },
  ];
  // skins are owned: the plain one from the start, the others come from the daily reward (day 1 gives skin 2, day 2 skin 3, ...)
  const skinOwned = { classic: true };
  const skinAdViews = {};        // ads watched towards each skin (3 for a usual skin, 8 for a premium one)
  const skinAdNeed = (k) => (k.premium ? 8 : 3);
  const skinThumbs = {};
  SKINS.forEach((k) => { if (k.src) { const im = new Image(); im.src = k.src; skinThumbs[k.id] = im; } });
  let skinId = 'classic';
  function loadSkin(id) {
    const skin = SKINS.find((k) => k.id === id);
    if (!skin || !skin.ready || !skinOwned[id]) return;
    skinId = id;
    const img = new Image();
    img.onload = () => { if (skinId === id) { cookieImg = img; FRAME = makeFrames(); } };   // a late older image must not replace the chosen skin
    img.src = skin.src;
  }
  loadSkin('classic');

  // ---------- economy ----------
  let coins = 0n;
  let clickOwned = CLICK_UPGRADES.map(() => 0);
  let techOwned = TECHNIKA.map(() => 0);
  let prokOwned = PROKACHKI.map(() => false);
  let premiumOwned = { double: false, triple: false, autoclick: false, rebirth2: false, discount: false };
  let adBoost = { double: 0, discount: 0 };   // seconds left, not saved
  let adWatched = { double: false, discount: false };   // which rewarded ads were watched (saved)
  // перерождение: income is multiplied by 2 for each rebirth (4 with premium); progress resets, extras stay
  let rebirths = 0;              // how many rebirths were made (saved)
  let cycleEarned = 0n;          // coins earned since the last rebirth (saved)
  let rebirthOpen = false;       // the rebirth window (what it gives, the count, the confirm button)
  let progWin = null;            // progress window: {tab: 'stats' | 'ach' | 'top'}
  let shopReturn = false;        // the shop was open when another menu opened: it comes back when that menu closes
  let skinWin = false;           // the appearance window (ВНЕШНИЙ ВИД)
  let totalEarned = 0n;          // coins earned in all time (saved)
  let playerClicks = 0;          // taps on the cookie by the player (saved)
  let playSec = 0;               // seconds played (saved)
  // daily reward: 7 days in a row, one claim per Moscow day, needs 5 minutes played that day
  let dailyDay = 0;              // the day number claimed last (0 = never; 1..7)
  let dailyDate = '';            // the Moscow date of the last claim (YYYY-MM-DD)
  let dailySec = 0;              // seconds played on dailySecDate
  let dailySecDate = '';
  const DAILY_NEED = 300;        // 5 minutes
  let dailyPreview = null;       // the day (1..7) whose skin is shown in the preview, or null for the grid
  let totalBought = 0;           // technika and upgrade purchases (saved)
  let premiumWin = null;         // premium purchase window: {mode: 'confirm' | 'pending' | 'done' | 'error', idx, msg}
  // coins needed in one cycle before the next rebirth (rebirth 1..12); after that x2.28 each time
  const REBIRTH_NEED = [250000000n, 815000000n, 1956000000n, 4586000000n, 9032000000n, 21165000000n,
    43790000000n, 84790000000n, 151640000000n, 244250000000n, 624670000000n, 1423200000000n];
  function rebirthNeed() {
    if (rebirths < REBIRTH_NEED.length) return REBIRTH_NEED[rebirths];
    let v = REBIRTH_NEED[REBIRTH_NEED.length - 1];
    for (let i = REBIRTH_NEED.length; i <= rebirths; i++) v = (v * 228n) / 100n;
    return v;
  }
  let autoAcc = 0;               // fractional coins from technika

  function clickPower() {
    let p = 1n;
    CLICK_UPGRADES.forEach((u, i) => { p += u.add * BigInt(clickOwned[i]); });
    return p;
  }
  // how many times a technika's output is multiplied by its prokachki (2 per level owned)
  function techMult(j) {
    let m = 1;
    PROKACHKI.forEach((p, i) => { if (p.tech === j && prokOwned[i]) m *= 2; });
    return m;
  }
  // each rebirth adds +100% to the income multiplier (+200% with the rebirth bonus): 1, 2, 3, 4...
  function rebirthMult() {
    return Math.pow(premiumOwned.rebirth2 ? 4 : 2, rebirths);
  }
  // premium 2x and ad 2x stack, rebirths add to them
  function incomeMult() {
    const premiumMult = (premiumOwned.double ? 2 : 1) * (premiumOwned.triple ? 3 : 1);   // 2x and 3x stack: both give 6x
    return premiumMult * (adBoost.double > 0 ? 2 : 1) * (questBoost > 0 ? 2 : 1) * rebirthMult();
  }
  function discountOn() {
    return premiumOwned.discount || adBoost.discount > 0;
  }
  function autoPerSec() {
    let r = 0;
    TECHNIKA.forEach((t, j) => { r += t.rate * techOwned[j] * techMult(j) * 1; });
    return r * incomeMult() * (glazeTech > 0 ? 2 : 1);
  }
  // one tap: its value times the income multipliers
  function clickGain() {
    return clickPower() * BigInt(incomeMult());
  }
  function priceOf(base, owned) {
    return BigInt(Math.floor(Number(base) * Math.pow(COST_GROWTH, owned)));
  }
  // price after the 50% discount (premium items never get it)
  function finalPrice(price) {
    return discountOn() ? price / 2n : price;
  }
  // a prokachka level needs the technika at this level (number of technika bought) and the previous level
  const PROK_TECH_LEVEL = [20, 35, 50, 65];
  const TECH_MAX = 100;         // every technika stops at level 100
  function prokTechReady(i) {
    const p = PROKACHKI[i];
    return techOwned[p.tech] >= PROK_TECH_LEVEL[p.level];
  }
  function prokUnlocked(i) {
    const p = PROKACHKI[i];
    if (!prokTechReady(i)) return false;
    return p.level === 0 || prokOwned[PROKACHKI.findIndex((q) => q.tech === p.tech && q.level === p.level - 1)];
  }
  function priceNow(tab, index) {
    if (tab === 'click') return finalPrice(priceOf(CLICK_UPGRADES[index].base, clickOwned[index]));
    if (tab === 'tech') return finalPrice(priceOf(TECHNIKA[index].base, techOwned[index]));
    if (tab === 'prok') return finalPrice(PROKACHKI[index].cost);
    return 0n;
  }
  function buy(tab, index) {
    if (tab === 'click' || tab === 'tech') {
      // buys as many as the amount allows and the coins pay for (fewer if the coins run out)
      const cap = tab === 'tech' ? TECH_MAX - techOwned[index] : Infinity;
      const limit = Math.min(buyMode === 'max' ? BUY_MAX_STEPS : buyMode, cap);
      let bought = 0;
      for (let k = 0; k < limit; k++) {
        const cost = priceNow(tab, index);
        if (coins < cost) break;
        coins -= cost;
        if (tab === 'click') clickOwned[index] += 1;
        else techOwned[index] += 1;
        bought++;
        totalBought++;
      }
      if (bought > 0) sfxBuy();
      return bought > 0;
    }
    if (tab === 'premium' || tab === 'ad') {
      // placeholders: payments and the ad SDK are not connected yet
      const it = PREMIUM_ITEMS[index];
      if (it.kind === 'ad') {
        // ad reward placeholder: gives the boost right away, so it can be checked in the game
        adBoost[it.id] = AD_BOOST_SECONDS;
        adWatched[it.id] = true;
        sfxBuy();
        return true;
      }
      return false;
    }
    if (tab === 'prok' && !prokUnlocked(index)) return false;
    if (tab === 'prok' && prokOwned[index]) return false;
    if ((tab === 'click' || tab === 'tech') && listLocked(tab, index)) return false;
    const cost = priceNow(tab, index);
    if (coins < cost) return false;
    coins -= cost;
    if (tab === 'click') clickOwned[index] += 1;
    else if (tab === 'tech') techOwned[index] += 1;
    else prokOwned[index] = true;
    totalBought++;
    sfxBuy();
    return true;
  }

  // ---------- UI state ----------
  let tab = 'click';            // 'click' | 'tech' | 'prok' | 'premium'
  let prokSel = null;           // in ПРОКАЧКИ: null = list of technika, else the technika index whose 4 upgrades are shown
  let panelOpen = false;
  let settingsOpen = false;
  const settings = { sound: 0.8, music: 0.5, colorblind: false, animBg: true, shake: false, skin: 'classic' };   // sound: no effects yet; music: 0..1
  let resetStage = 0;          // reset needs three presses
  let sliderDrag = null;       // 'sound' | 'music' while a slider is held
  let panelT = 0;               // 0 = closed, 1 = open (animated)
  let scroll = 0;               // list scroll in game px
  let drag = null;              // {y0, s0, moved, tab}

  let animT = 1;                // seconds since last coin click
  let everTapped = false;       // the player has tapped the cookie at least once
  let shakeT = 0;
  const popups = [];
  const sparks = [];

  function coinX() {
    return COIN_X_CLOSED + (COIN_X_OPEN - COIN_X_CLOSED) * panelT;
  }

  function spawnClick(gx, gy) {
    sfxClick();
    const gain = clickGain() * (glazeClick > 0 ? 2n : 1n);
    coins += gain;
    cycleEarned += gain;
    totalEarned += gain;
    playerClicks += 1;
    if (ev && ev.type === 'quest' && !ev.done) {   // every tap on the cookie counts for the quest
      ev.taps += 1;
      if (ev.taps >= 250) { ev.done = 'win'; questBoost = 60; }   // 250 taps in time: the result comes at once
    }
    animT = 0;
    everTapped = true;
    if (settings.shake) shakeT = 0.12;   // screen shake is off unless the player turns it on
    popups.push({ x: gx, y: gy - 10, t: 0, text: '+' + String(gain) });   // at the tapped pixel, 10 px above it
    for (let k = 0; k < 8; k++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 80;
      sparks.push({ x: gx, y: gy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, t: 0 });
    }
  }

  // ---------- shop tabs: four equal tabs across the panel (35 px each, 2 px apart) ----------
  // two rows of two full-width tabs: КЛИК | ТЕХНИКА, ПРОКАЧКИ | ПРЕМИУМ
  const TABS = [
    { id: 'click', label: 'КЛИК' },
    { id: 'tech', label: 'ТЕХНИКА' },
    { id: 'prok', label: 'ПРОКАЧКИ' },
    { id: 'premium', label: 'ПРЕМИУМ' },
  ];
  // rebirth button: shows what is still needed, the name when ready, and asks for a second tap to confirm
  function rebirthLabel() {
    const need = rebirthNeed();
    if (cycleEarned >= need) return 'ПЕРЕРОЖДЕНИЕ';
    return 'ЕЩЁ ' + fmt(need - cycleEarned);
  }
  // the button opens the rebirth window; the window explains it and holds the only confirm button
  // only one menu is open at a time: opening one closes the others, so nothing old reopens later
  function closeMenus(except) {
    if (except !== 'skin') { skinWin = false; skinPreview = null; }
    if (except !== 'shop') { if (panelOpen) shopReturn = true; panelOpen = false; }
    if (except !== 'settings') { settingsOpen = false; resetStage = 0; }
    if (except !== 'rebirth') rebirthOpen = false;
    if (except !== 'progress') { progWin = null; dailyPreview = null; }
    if (except !== 'premium') premiumWin = null;
  }
  function handleRebirthTap() { closeMenus('rebirth'); rebirthOpen = true; }
  function doRebirth() {
    rebirths += 1;
    coins = 0n;
    clickOwned = clickOwned.map(() => 0);
    techOwned = techOwned.map(() => 0);
    prokOwned = prokOwned.map(() => false);
    adBoost = { double: 0, discount: 0 };
    autoAcc = 0;
    cycleEarned = 0n;
    rebirthOpen = false;
    shopReturn = false;
    scroll = 0;
    saveGame();
  }

  // ---------- random events: every 4-7 minutes one of three ----------
  // 1. appetite (АППЕТИТ): pies on the left of the counter, cake on the right. One of them glows for 30 s;
  //    tapping the glowing one gives an effect for 30 s: pies = clicks x2, cake = technika x2.
  // 2. quest: tap 250 times in 60 s, then all income x2 for 1 minute.
  // 3. cooking minute: the cookie clicks by itself 25 times a second for 60 s (no window).
  let ev = null;                 // current event with a window or a glow (appetite / quest)
  let evTimer = 240 + Math.random() * 180;
  let glazeClick = 0, glazeTech = 0, glazeName = '';   // effects from appetite, seconds left
  let questBoost = 0;            // seconds of x2 income from the quest
  let autoTapAcc = 0;            // fractional taps of the auto-click bonus
  let minuteAcc = 0;             // fractional coins from the cooking minute
  let minuteLeft = 0;            // seconds left of the cooking minute
  const APPETITE_T = 30;         // how long the glowing plate stays
  const PIE_BOX = [206, 160, 265, 178];   // the pies on the bread board (the board moved right, next to the cake)
  const CAKE_BOX = [268, 152, 314, 176];  // the cake on its plate, moved right by CAKE_DX in the background
  function spawnEvent() {
    const r = Math.random();
    if (r < 1 / 3) ev = { type: 'appetite', t: 0, pies: Math.random() < 0.5 };
    else if (r < 2 / 3) ev = { type: 'quest', t: 60, taps: 0, done: null };
    else minuteLeft = 60;
  }
  function tryHitAppetite(gx, gy) {
    if (!ev || ev.type !== 'appetite') return false;
    const box = ev.pies ? PIE_BOX : CAKE_BOX;
    if (!inRect(gx, gy, box[0], box[1], box[2], box[3])) return false;
    if (ev.pies) { glazeClick = 30; glazeName = 'ПИРОЖКИ'; }
    else { glazeTech = 30; glazeName = 'ТОРТ'; }
    ev = null;
    sfxBuy();
    return true;
  }
  function updateEvents(dt) {
    glazeClick = Math.max(0, glazeClick - dt);
    glazeTech = Math.max(0, glazeTech - dt);
    questBoost = Math.max(0, questBoost - dt);
    if (minuteLeft > 0) updateMinute(dt);
    if (!ev) {
      evTimer -= dt;
      // the appetite event waits until every menu (the shop too) is closed
      const inMenu = settingsOpen || rebirthOpen || panelOpen || !!progWin || skinWin || !!premiumWin;
      if (evTimer <= 0 && !inMenu) {
        spawnEvent();
        evTimer = 240 + Math.random() * 180;
      }
      return;
    }
    if (ev.type === 'appetite') {
      ev.t += dt;
      if (ev.t >= APPETITE_T) ev = null;
      return;
    }
    if (ev.done) { ev.doneT = (ev.doneT || 0) + dt; if (ev.doneT > 2.5) ev = null; return; }
    ev.t -= dt;
    if (ev.t <= 0) {
      ev.t = 0;
      ev.done = ev.taps >= 250 ? 'win' : 'fail';
      if (ev.done === 'win') questBoost = 60;
    }
  }
  // cooking minute: the cookie clicks by itself 25 times a second. No window, the player can keep buying.
  // These virtual clicks are not counted as player clicks; they only show crumbs and "+N" popups.
  function updateMinute(dt) {
    minuteLeft = Math.max(0, minuteLeft - dt);
    const perClick = clickGain() * (glazeClick > 0 ? 2n : 1n);
    if (premiumOwned.autoclick) {
      // the auto-click bonus: ten taps a second, each one paying out like a tap of the player
      autoTapAcc += 10 * dt;
      while (autoTapAcc >= 1) {
        autoTapAcc -= 1;
        const pay = clickGain() * (glazeClick > 0 ? 2n : 1n);
        coins += pay;
        cycleEarned += pay;
        totalEarned += pay;
      }
    }
    minuteAcc += 25 * dt;                             // 25 virtual presses a second
    while (minuteAcc >= 1) {
      // every virtual press pays out, shows its own "+N" and crumbs
      minuteAcc -= 1;
      coins += perClick;
      cycleEarned += perClick;
      totalEarned += perClick;
      popups.push({ x: coinX() + (Math.random() * 60 - 30), y: 96, t: 0, text: '+' + fmt(perClick) });   // middle of the screen, away from the counter
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 60;
      sparks.push({ x: coinX(), y: COIN_Y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, t: 0 });
    }
    if (minuteLeft <= 0) minuteAcc = 0;
  }
  // the glowing dish: a blinking frame around all of it and the words СЪЕШЬ МЕНЯ above it
  function drawAppetite() {
    const box = ev.pies ? PIE_BOX : CAKE_BOX;
    if (Math.sin(cookT * 8) > 0) {
      const [x0, y0, x1, y1] = [box[0] - 2, box[1] - 2, box[2] + 2, box[3] + 2];
      fillRect(x0, y0, x1 - x0, 1, COL.gold);
      fillRect(x0, y1 - 1, x1 - x0, 1, COL.gold);
      fillRect(x0, y0, 1, y1 - y0, COL.gold);
      fillRect(x1 - 1, y0, 1, y1 - y0, COL.gold);
    }
    drawText('ПОПРОБУЙ!', 1, (box[0] + box[2]) / 2, box[1] - 10, COL.gold, 'center');
  }
  // temporary boosts: the far left corner of the floor strip, vertically centred in it
  // the bonuses that go into the menu: every active one, with its time left (except the 10-minute ad bonus and the shop bonuses)
  function menuLabels() {
    const out = [];
    if (ev && ev.type === 'quest') {
      out.push(ev.done ? 'КВЕСТ: ' + (ev.done === 'win' ? 'ГОТОВО!' : 'НЕ УСПЕЛИ') : 'КВЕСТ ' + ev.taps + '/250 ' + Math.ceil(ev.t) + 'С');
    }
    if (glazeClick > 0) out.push('КЛИК ПРЯНИКА 2Х ' + Math.ceil(glazeClick) + 'С');
    if (glazeTech > 0) out.push(glazeName + ' ТЕХНИКА 2Х ' + Math.ceil(glazeTech) + 'С');
    if (minuteLeft > 0) out.push('КУЛИНАРНАЯ МИНУТА ' + Math.ceil(minuteLeft) + 'С');
    return out;
  }
  // the 10-minute 2x ad bonus, with its countdown
  function adLabel() {
    const s = Math.ceil(adBoost.double), ss = s % 60;
    return '2Х ДОХОД ' + Math.floor(s / 60) + ':' + (ss < 10 ? '0' : '') + ss;
  }
  // everything the menu window lists, each one on its own line (the multiplier on the row is the product of these)
  function windowList() {
    const list = menuLabels();
    if (premiumOwned.double) list.push('2Х ДОХОД НАВСЕГДА');
    if (premiumOwned.triple) list.push('3Х ДОХОД НАВСЕГДА');
    if (adBoost.double > 0) list.push('2Х РЕКЛАМА ' + adLabel().replace('2Х ДОХОД ', ''));
    return list;
  }
  // the bonus row at the height of КЛИКАЙ, centred under it: the framed button with the number of active bonuses (0 when none),
  // then one multiplier for the premium 2x and 3x and the 10-minute ad 2x, multiplied together (for example Х12)
  const MENU_BTN_W = 20, MENU_BTN_Y = [145, 159];   // 3 px lower than before
  const MENU_BTN_X = TOP_MARGIN;                   // the left edge, with the same margin from the wall as the НАСТРОЙКИ button
  function multiplierBonus() {
    return (premiumOwned.double ? 2 : 1) * (premiumOwned.triple ? 3 : 1) * (adBoost.double > 0 ? 2 : 1);
  }
  function drawBoostLine() {
    const n = windowList().length;
    const mult = multiplierBonus();
    const multText = mult > 1 ? 'Х' + mult : '';
    const total = MENU_BTN_W + (multText ? 4 + textWidth(multText, 1) : 0);
    drawTopButton(String(n), MENU_BTN_X, MENU_BTN_X + MENU_BTN_W, MENU_BTN_Y[0], MENU_BTN_Y[1]);   // the same frame as the top buttons
    if (multText) drawText(multText, 1, MENU_BTN_X + MENU_BTN_W + 4, 149, accent(), 'left');
  }
  // the menu that opens on that button; a tap anywhere closes it
  let boostMenuOpen = false;
  function drawBoostMenu() {
    const list = windowList();
    fillRect(0, 0, W, H, 'rgba(10, 8, 24, 0.6)');
    fillRect(REB_X0, REB_Y0, REB_X1 - REB_X0, REB_Y1 - REB_Y0, COL.panel);
    fillRect(REB_X0, REB_Y0, REB_X1 - REB_X0, 1, COL.panelEdge);
    fillRect(REB_X0, REB_Y1 - 1, REB_X1 - REB_X0, 1, COL.panelEdge);
    fillRect(REB_X0, REB_Y0, 1, REB_Y1 - REB_Y0, COL.panelEdge);
    fillRect(REB_X1 - 1, REB_Y0, 1, REB_Y1 - REB_Y0, COL.panelEdge);
    drawTextBox('АКТИВНЫЕ БОНУСЫ', 1, REB_X0, REB_X1, REB_Y0 + 6, REB_Y0 + 16, COL.text);
    list.forEach((t, i) => drawText(t, 1, 60, 40 + i * 14, accent(), 'left'));
    settingsButton(60, 156, 260, 170, 'ЗАКРЫТЬ');
  }

  // ---------- quest window ----------
  function drawEventWin() {
    fillRect(0, 0, W, H, 'rgba(10, 8, 24, 0.6)');
    fillRect(REB_X0, REB_Y0, REB_X1 - REB_X0, REB_Y1 - REB_Y0, COL.panel);
    fillRect(REB_X0, REB_Y0, REB_X1 - REB_X0, 1, COL.panelEdge);
    fillRect(REB_X0, REB_Y1 - 1, REB_X1 - REB_X0, 1, COL.panelEdge);
    fillRect(REB_X0, REB_Y0, 1, REB_Y1 - REB_Y0, COL.panelEdge);
    fillRect(REB_X1 - 1, REB_Y0, 1, REB_Y1 - REB_Y0, COL.panelEdge);
    if (ev.type === 'quest') {
      drawTextBox('КВЕСТ', 1, REB_X0, REB_X1, REB_Y0 + 6, REB_Y0 + 16, COL.text);
      if (ev.done) {
        drawTextBox(ev.done === 'win' ? 'ГОТОВО!' : 'НЕ УСПЕЛИ', 1, 60, 260, 40, 52, accent());
        drawText(ev.done === 'win' ? 'ДОХОД 2Х НА 1 МИНУТУ' : 'ПОПРОБУЙТЕ ЕЩЁ РАЗ', 1, 60, 70, COL.text, 'left');
        settingsButton(60, 156, 260, 170, 'ОК');
        return;
      }
      drawText('НАЖМИ 250 РАЗ ЗА МИНУТУ', 1, 60, 26, COL.text, 'left');
      drawText('ОСТАЛОСЬ: ' + Math.ceil(ev.t) + ' СЕК', 1, 60, 40, dimTone(), 'left');
      drawText('НАЖАТИЙ: ' + ev.taps + ' / 250', 1, 60, 52, accent(), 'left');
      settingsButton(60, 70, 260, 116, 'ЖМИ СЮДА');
      return;
    }
    drawTextBox('КУЛИНАРНАЯ МИНУТА', 1, REB_X0, REB_X1, REB_Y0 + 6, REB_Y0 + 16, COL.text);
    if (ev.done) {
      drawText('ПЕЧЕНЬКА ЗАКОНЧИЛА', 1, 60, 40, COL.text, 'left');
      settingsButton(60, 156, 260, 170, 'ОК');
      return;
    }
    drawText('ПЕЧЕНЬКА САМА НАЖИМАЕТСЯ', 1, 60, 26, COL.text, 'left');
    drawText('25 РАЗ В СЕКУНДУ', 1, 60, 36, COL.text, 'left');
    drawText('ОСТАЛОСЬ: ' + Math.ceil(ev.t) + ' СЕК', 1, 60, 52, accent(), 'left');
    drawText('ЗАРАБОТАНО: ' + fmt(cycleEarned), 1, 60, 66, dimTone(), 'left');
  }

  // Payment goes through Yandex Payments; until it is connected, payProduct() reports that it is not available.
  // TEST MODE: while the game is not released, every premium item is free. Set to false before release.
  const TEST_FREE_PREMIUM = true;
  function payProduct(id) {
    if (TEST_FREE_PREMIUM) return Promise.resolve({ ok: true });
    return Promise.resolve({ ok: false, msg: 'ОПЛАТА ПОКА НЕДОСТУПНА' });
  }
  function startPremiumPurchase() {
    const it = PREMIUM_ITEMS[premiumWin.idx];
    premiumWin = { mode: 'pending', idx: premiumWin.idx };
    payProduct(it.id).then((res) => {
      if (res.ok) {
        if (it.add) rebirths += it.add;   // a rebirth pack adds its rebirths; progress is not reset
        else premiumOwned[it.id] = true;
        // the bundle gives everything in it at once
        if (it.id === 'bundle') for (const k of ['double', 'triple', 'autoclick', 'discount']) premiumOwned[k] = true;
        if (it.id === 'skins_all') unlockAllPremiumSkins();
        else if (it.id.startsWith('skin_')) skinOwned[it.id.slice(5)] = true;
        saveGame();
        premiumWin = { mode: 'done', idx: premiumWin.idx || 0 };
        premiumWin.idx = PREMIUM_ITEMS.findIndex((x) => x.kind === 'premium' && x.id === it.id);
        sfxBuy();
      } else {
        premiumWin = { mode: 'error', idx: PREMIUM_ITEMS.findIndex((x) => x.kind === 'premium' && x.id === it.id), msg: res.msg };
      }
    });
  }
  function handlePremiumWinDown(gx, gy) {
    const m = premiumWin.mode;
    if (m === 'confirm') {
      if (inRect(gx, gy, 60, 140, 260, 155)) startPremiumPurchase();
      else if (inRect(gx, gy, 60, 156, 260, 171)) premiumWin = null;
      return;
    }
    if (m === 'done' || m === 'error') {
      if (inRect(gx, gy, 60, 156, 260, 171)) premiumWin = null;
    }
  }
  function drawPremiumWin() {
    fillRect(0, 0, W, H, 'rgba(10, 8, 24, 0.6)');
    fillRect(REB_X0, REB_Y0, REB_X1 - REB_X0, REB_Y1 - REB_Y0, COL.panel);
    fillRect(REB_X0, REB_Y0, REB_X1 - REB_X0, 1, COL.panelEdge);
    fillRect(REB_X0, REB_Y1 - 1, REB_X1 - REB_X0, 1, COL.panelEdge);
    fillRect(REB_X0, REB_Y0, 1, REB_Y1 - REB_Y0, COL.panelEdge);
    fillRect(REB_X1 - 1, REB_Y0, 1, REB_Y1 - REB_Y0, COL.panelEdge);
    const it = PREMIUM_ITEMS[premiumWin.idx];
    const info = PREMIUM_INFO[it.id];
    const m = premiumWin.mode;
    if (m === 'confirm' || m === 'pending') {
      drawTextBox('ПОКУПКА', 1, REB_X0, REB_X1, REB_Y0 + 6, REB_Y0 + 16, COL.text);
      const previewSkin = PREMIUM_SKIN_OF[it.id];
      const isSkin = !!previewSkin;
      // a skin item shows the skin itself on the left: the neon one glows, pulsing
      const tx = isSkin ? 148 : 60;
      if (isSkin) {
        const thumb = skinThumbs[previewSkin];
        const glow = 0.5 + 0.5 * Math.sin(cookT * 3);
        ctx.save();
        // the glow of the previewed skin: orange for the volcanic one, pink for the neon one
        ctx.shadowColor = skinGlow(previewSkin, (0.55 + 0.4 * glow).toFixed(2));
        ctx.shadowBlur = previewSkin === 'volcano' ? 6 + 10 * glow : 4 + 6 * glow;
        if (thumb && thumb.complete && thumb.naturalWidth) ctx.drawImage(thumb, 66, 32, 74, 74);
        ctx.restore();
        fxMask = thumbMask(thumb, 66, 32);
        drawSkinFxAt(previewSkin, 103, 69, 40, 33);   // the same effects as the appearance preview
        fxMask = null;
      }
      drawText(info.name, 1, tx, 30, accent(), 'left');
      drawText('ЧТО ДАЁТ:', 1, tx, 46, dimTone(), 'left');
      drawText(info.lines[0], 1, tx, 56, COL.text, 'left');
      drawText(info.lines[1], 1, tx, 66, COL.text, 'left');
      drawText('ЦЕНА: ' + it.price, 1, tx, 86, COL.text, 'left');
      if (m === 'confirm') {
        settingsButton(60, 140, 260, 154, 'КУПИТЬ ЗА ' + it.price);
        settingsButton(60, 156, 260, 170, 'ОТМЕНА');
      } else {
        drawTextBox('ОПЛАТА...', 1, 60, 260, 140, 154, COL.text);
      }
      return;
    }
    if (m === 'done') {
      drawTextBox('КУПЛЕНО', 1, REB_X0, REB_X1, REB_Y0 + 6, REB_Y0 + 16, accent());
      drawText('НАЗВАНИЕ:', 1, 60, 26, dimTone(), 'left');
      drawText(info.name, 1, 60, 36, COL.text, 'left');
      drawText('ДЕЙСТВИЕ:', 1, 60, 52, dimTone(), 'left');
      drawText(info.lines[0], 1, 60, 62, COL.text, 'left');
      drawText(info.lines[1], 1, 60, 72, COL.text, 'left');
      drawText('ТЕПЕРЬ ЭТО У ВАС НАВСЕГДА', 1, 60, 92, accent(), 'left');
      settingsButton(60, 156, 260, 170, 'ОК');
      return;
    }
    // error
    drawTextBox('ОШИБКА', 1, REB_X0, REB_X1, REB_Y0 + 6, REB_Y0 + 16, COL.text);
    drawText(info.name, 1, 60, 30, COL.text, 'left');
    drawText(premiumWin.msg || 'ПОКУПКА НЕ ПРОШЛА', 1, 60, 56, COL.text, 'left');
    drawText('ПОПРОБУЙТЕ ПОЗЖЕ', 1, 60, 70, dimTone(), 'left');
    settingsButton(60, 156, 260, 170, 'ОК');
  }

  // ---------- appearance window (ВНЕШНИЙ ВИД): choose the gingerbread skin ----------
  // the button at the bottom: a framed button like the top row, with 2 px between the letters and the frame
  const SKIN_BTN_LABEL = 'ВНЕШНИЙ ВИД';
  const SKIN_BTN_W = textWidth(SKIN_BTN_LABEL, 1) + 2 * (2 + 2);
  const SKIN_BTN_X0 = 160 - Math.floor(SKIN_BTN_W / 2);   // whole pixels, so the frame is as sharp as the top buttons
  const SKIN_BTN = [SKIN_BTN_X0, 159, SKIN_BTN_X0 + SKIN_BTN_W, 177];   // 18 px tall; 3 px to the bottom edge, like the top buttons have at the top
  // the appearance window: a list of skins; tapping a skin opens its preview (its look and name), where it can be worn
  let skinPreview = null;        // id of the skin shown in the preview, or null for the list
  function handleSkinDown(gx, gy) {
    if (skinPreview) {
      const k = SKINS.find((s) => s.id === skinPreview);
      if (k && !skinOwned[k.id]) {
        if (k.premium && inRect(gx, gy, 60, 130, 155, 144)) { watchSkinAd(k.id); return; }     // ЗА 8 РЕКЛАМ
        if (k.premium && inRect(gx, gy, 165, 130, 260, 144)) {                                  // В МАГАЗИНЕ: the premium skins in the shop
          closeMenus('shop');
          skinWin = false;
          skinPreview = null;
          tab = 'premium';
          premiumSection = 'skins';
          scroll = 0;
          panelOpen = true;
          shopReturn = false;
          // straight to this skin's purchase window
          const pi = PREMIUM_ITEMS.findIndex((x) => x.id === 'skin_' + k.id);
          if (pi >= 0) premiumWin = { mode: 'confirm', idx: pi };
          return;
        }
        if (!k.premium && inRect(gx, gy, 60, 130, 155, 144)) { watchSkinAd(k.id); return; }    // ЗА 3 РЕКЛАМЫ
        // В НАГРАДАХ opens the rewards on this skin's day
        const day = SKINS.indexOf(k);
        if (!k.premium && day >= 1 && day <= 7 && inRect(gx, gy, 165, 130, 260, 144)) {
          closeMenus('progress');
          skinWin = false;
          skinPreview = null;
          progWin = { tab: 'daily', page: 0 };
          dailyPreview = day;
          return;
        }
      }
      if (k && skinOwned[k.id] && inRect(gx, gy, 60, 130, 260, 144)) {       // НАДЕТЬ
        settings.skin = k.id;
        loadSkin(k.id);
        saveGame();
        skinPreview = null;
        return;
      }
      if (inRect(gx, gy, 60, 156, 260, 170)) skinPreview = null;            // НАЗАД to the list
      return;
    }
    if (inRect(gx, gy, 60, 156, 260, 170)) {          // ЗАКРЫТЬ
      skinWin = false;
      skinPreview = null;
      panelOpen = shopReturn;
      shopReturn = false;
      return;
    }
    SKINS.forEach((k, i) => {
      const [cx, cy] = skinCellXY(i);
      if (inRect(gx, gy, cx - 2, cy - 2, cx + SKIN_CELL + 2, cy + SKIN_CELL + 2)) { skinPreview = k.id; if (k.id === 'ghost') ghostTimer = 0.5; }
    });
  }
  // an ad for a skin: the ad SDK is not connected yet, so the view counts right away
  function watchSkinAd(id) {
    const k = SKINS.find((s) => s.id === id);
    if (!k || skinOwned[id]) return;
    skinAdViews[id] = (skinAdViews[id] || 0) + 1;
    if (skinAdViews[id] >= skinAdNeed(k)) { skinOwned[id] = true; skinAdViews[id] = 0; sfxBuy(); }
    saveGame();
  }
  // the reindeer: it comes out of nothing (transparent to solid), flies across the cookie with its sleigh, and fades away
  // a fir tree with three tiers: each tier has a dark edge, snow along its lower edge, and ornaments
  // a fir tree from a pixel map, 15 px wide and 19 px tall: a pointed top, three stepped tiers that widen downwards,
  // dark green edges, snow on the branch tips, red / blue / gold ornaments, a blinking star, and a trunk
  const TREE_MAP = [
    '       s       ',
    '       G       ',
    '      GGG      ',
    '     GGWGG     ',
    '    GGGGGWG    ',
    '     GGGGG     ',
    '    GGOGGGG    ',
    '   GGGGGGGGG   ',
    '  GGGGGGGGGGG  ',
    '   GGGBGGGGG   ',
    ' GGGGGGGGGGGGG ',
    'GGWGGGGGGGGGWGG',
    'GGGGGGGGGGGGGGG',
    '     TTTTT     ',
    '     TTTTT     ',
  ];
  const TREE_COL = { G: '#2E8B3E', D: '#1F5A2A', W: '#FFFFFF', O: '#FF3A3A', B: '#4AB8FF', Y: '#FFD84A', T: '#6B4A2A' };
  function drawTree(tx, base) {
    const top = base - TREE_MAP.length;
    TREE_MAP.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        let ch = row[x];
        if (ch === ' ') continue;
        if (ch === 's') {
          if (Math.sin(cookT * 6) > 0) fillRect(tx - 7 + x, top + y, 1, 1, '#FFD84A');   // the star blinks
          continue;
        }
        if (ch === 'G' && (x === 0 || row[x - 1] === ' ')) ch = 'D';                    // dark edge on the left of each tier
        fillRect(tx - 7 + x, top + y, 1, 1, TREE_COL[ch]);
      }
    });
  }
  // one painted egg, centred on (x, y): pastel with a white stripe
  function drawEgg(x, y, col) {
    fillRect(x, y - 2, 1, 1, col);
    fillRect(x - 1, y - 1, 3, 3, col);
    fillRect(x - 1, y, 3, 1, '#FFFFFF');
    fillRect(x, y + 2, 1, 1, col);
  }
  // a carved pumpkin standing on the floor at (px, base); its face glows when the candle is lit
  function drawPumpkin(px, base, s, lit) {
    const R = (v) => Math.round(v * s);
    const top = base - R(9);
    for (let y = 0; y < R(9); y++) for (let x = -R(6); x <= R(6); x++) {
      const ex = x / R(6), ey = (y - R(4.5)) / R(4.5);
      if (ex * ex + ey * ey <= 1) {
        const rib = x % 3 === 0 && Math.abs(ex) > 0.3;
        fillRect(px + x, top + y, 1, 1, rib ? '#B84E0C' : ey > 0.3 ? '#D9701A' : '#FF8A2A');
      }
    }
    fillRect(px, top - 2, 1, 2, '#3A7A2A');                 // stem
    fillRect(px + 1, top - 2, 2, 1, '#4E9A3A');             // leaf
    const face = lit ? '#FFD84A' : '#2A1200';
    fillRect(px - R(3), top + R(3), 2, 2, face);            // eyes
    fillRect(px + R(2), top + R(3), 2, 2, face);
    fillRect(px - R(3), top + R(6), R(6), 1, face);         // mouth
    fillRect(px - R(2), top + R(7), 1, 1, face);            // teeth
    fillRect(px + 1, top + R(7), 1, 1, face);
    if (lit) {
      ctx.globalAlpha = 0.4;
      fillRect(px - R(4), top + R(2), R(8), R(6), '#FFE27A');   // the light through the face
      ctx.globalAlpha = 1;
    }
  }
  // a snowman, drawn at (sx, base); big or small
  function drawSnowman(sx, base, big) {
    const s = big ? 1 : 0.75;
    const R = (v) => Math.round(v * s);
    fillRect(sx - R(4), base - R(6), R(9), R(6), '#FFFFFF');
    fillRect(sx - R(3), base - R(11), R(7), R(5), '#FFFFFF');
    fillRect(sx - R(2), base - R(15), R(5), R(4), '#FFFFFF');
    fillRect(sx - R(3), base - R(17), R(7), R(2), '#2A2A2A');       // hat brim
    fillRect(sx - R(2), base - R(22), R(5), R(5), '#2A2A2A');       // hat
    fillRect(sx - 1, base - R(13), 1, 1, '#2A2A2A');                 // eyes
    fillRect(sx + 1, base - R(13), 1, 1, '#2A2A2A');
    fillRect(sx - 1, base - R(9), 1, 1, '#2A2A2A');                  // buttons
    fillRect(sx + 2, base - R(11), 2, 1, '#FF8A1A');                 // carrot nose
    const wave = Math.round(Math.sin(cookT * 4));
    fillRect(sx - R(3), base - R(14) + 3, R(7), 1, '#D83A3A');        // scarf (3 px lower)
    fillRect(sx + R(3) + wave, base - R(13) + 3, 2, 2, '#D83A3A');    // the scarf end waves (3 px lower)
  }
  // the reindeer: it comes out of nothing (transparent to solid), flies across the cookie with its sleigh, and fades away
  // the reindeer: it comes out of nothing (transparent to solid), flies across the cookie with its sleigh, and fades away
  // the reindeer: it comes out of nothing (transparent to solid), flies across the cookie with its sleigh, and fades away
  // the fish: swim from one end of the cookie to the other, wobbling, then fade away; three shapes
  function drawFishes() {
    for (const f of fishes) {
      const k = f.t / 2.2;
      // from one end of the cookie to the other, in the direction of its swim
      const u = k * 2 - 1;
      const px_ = Math.round(f.ax + u * f.dir * f.rx * 1.1), py_ = Math.round(f.ay + f.dy + Math.sin(f.t * 7) * 1.5);
      const alpha = Math.min(1, f.t / 0.3) * Math.min(1, (2.2 - f.t) / 0.3);
      ctx.globalAlpha = Math.max(0, alpha);
      const P = (lx, ly) => [px_ + lx * f.dir, py_ + ly];
      const put = (lx, ly, w, h, col) => { const [x, y] = P(lx, ly); fillRect(f.dir > 0 ? x : x - w + 1, y, w, h, col); };
      const tw = Math.round(Math.sin(f.t * 12));
      if (f.type === 0) {
        // round fish: a short oval body and a small tail
        put(-4 + tw, -1, 2, 3, f.col);
        put(-2, -2, 5, 5, f.col);
        put(-1, 2, 3, 1, '#FFFFFF');
        put(1, -1, 1, 1, '#1A1A2A');
      } else if (f.type === 1) {
        // long fish: a slim body and a forked tail that wiggles
        put(-6 + tw, -2, 2, 1, f.col);
        put(-6 + tw, 2, 2, 1, f.col);
        put(-5, -1, 1, 3, f.col);
        put(-4, -1, 8, 3, f.col);
        put(-2, 1, 6, 1, '#FFFFFF');
        put(2, -1, 1, 1, '#1A1A2A');
      } else {
        // angelfish: a tall body with long fins on the top and bottom
        put(-5 + tw, -1, 2, 3, f.col);
        put(-3, -4, 4, 9, f.col);
        put(-1, -6, 2, 2, f.col);
        put(-1, 4, 2, 2, f.col);
        put(0, 1, 1, 1, '#1A1A2A');
        put(-2, -2, 1, 5, '#FFFFFF');
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawDeers() {
    for (const d of deers) {
      const k = d.t / 4;
      const inPreview = d.ax === 160 && d.ay === 67;
      const span = inPreview ? 90 : 120;
      const u = k * 2 - 1;
      const bob = Math.round(Math.sin(d.t * 10) * 1);
      const px_ = Math.round(d.ax + u * span), py_ = Math.round(d.ay + d.dy + bob);
      const ux = 1, uy = 0.08 * (d.dy >= 0 ? 1 : -1);
      const n = Math.hypot(ux, uy), fx = ux / n, fy = uy / n;
      const alpha = Math.min(1, d.t / 0.8) * Math.min(1, (4 - d.t) / 0.8);
      ctx.globalAlpha = Math.max(0, alpha);
      const SC = 0.7;   // the reindeer is drawn at 70% of its size
      const P = (lx, ly) => [Math.round(px_ + fx * lx * SC - fy * ly * SC), Math.round(py_ + fy * lx * SC + fx * ly * SC)];
      const put = (lx, ly, w, h, col) => { const [x, y] = P(lx, ly); fillRect(x, y, Math.max(1, Math.round(w * SC)), Math.max(1, Math.round(h * SC)), col); };
      const sb = Math.round(Math.sin(d.t * 12 + 1) * 0.8);
      // the sleigh: a bigger gold body with a red rim, a curled front, runners, and a gift with a bow
      put(-38, -3 + sb, 17, 1, '#D83A3A');
      put(-38, -2 + sb, 17, 4, '#D4A02A');
      put(-40, -5 + sb, 2, 3, '#D4A02A');
      put(-40, -6 + sb, 1, 1, '#D83A3A');
      put(-38, 2 + sb, 19, 1, '#B8B8B8');
      put(-40, 1 + sb, 2, 1, '#B8B8B8');
      put(-36, -7 + sb, 5, 4, '#D83A3A');
      put(-34, -7 + sb, 1, 4, '#FFD84A');
      put(-36, -4 + sb, 5, 1, '#FFD84A');
      put(-35, -9 + sb, 1, 2, '#FFD84A');
      put(-33, -9 + sb, 1, 2, '#FFD84A');
      put(-30, -4 + sb, 4, 1, '#FFFFFF');
      // the rope from the reindeer to the sleigh
      put(-18, -1, 10, 1, '#6B3A18');
      // trailing sparkles
      for (let s = 1; s <= 3; s++) {
        ctx.globalAlpha = (alpha * 0.6) / s;
        put(-43 - s * 3, -1 + (s % 2), 1, 1, '#FFFFFF');
      }
      ctx.globalAlpha = Math.max(0, alpha);
      // the reindeer: body with a lighter belly, neck, head with a snout, an eye, a red nose, ears, antlers, a tail, legs
      put(-6, -3, 9, 4, '#9A5A2A');
      put(-6, 1, 9, 1, '#C98A4A');
      put(2, -6, 3, 4, '#9A5A2A');
      put(4, -8, 5, 4, '#9A5A2A');
      put(8, -6, 2, 2, '#C98A4A');
      put(9, -5, 1, 1, '#FF3A3A');
      put(6, -7, 1, 1, '#2A1A0A');
      put(4, -10, 1, 2, '#5A3A1A');
      const sway = Math.round(Math.sin(d.t * 6));
      put(5 + sway, -13, 1, 3, '#5A3A1A');
      put(3 + sway, -14, 1, 2, '#5A3A1A');
      put(7 + sway, -14, 1, 2, '#5A3A1A');
      put(4 + sway, -15, 1, 1, '#5A3A1A');
      put(-7, -2, 1, 2, '#FFFFFF');
      // legs: two pixels thick, tapering to dark hooves; they trot in pairs, and each one hangs from the body or chest
      const trot = Math.sin(d.t * 14) > 0;
      const legs = [[-5, trot ? 4 : 3], [-2, trot ? 3 : 4], [1, trot ? 4 : 3], [3, trot ? 3 : 4]];
      for (const [lx, len] of legs) {
        put(lx, 2, 2, len - 1, '#6B3A18');
        put(lx, 2 + len - 1, 2, 1, '#2A1A0A');
      }
      // the chest joins the front legs to the body
      put(0, -1, 5, 3, '#9A5A2A');
      put(0, 1, 5, 1, '#C98A4A');
    }
    ctx.globalAlpha = 1;
  }
  // the new year snow: falls over the whole background, drifting from side to side
  function drawSnowFull() {
    for (let i = 0; i < 46; i++) {
      const speed = 10 + (i % 5) * 4;
      const x = ((i * 53) % 330) - 5 + Math.sin(cookT * 1.5 + i) * 3;
      const y = ((cookT * speed + i * 29) % 190) - 5;
      const big = i % 4 === 0;
      ctx.globalAlpha = 0.5 + 0.4 * ((i % 3) / 2);
      fillRect(Math.round(x), Math.round(y), big ? 2 : 1, big ? 2 : 1, i % 5 === 0 ? '#CFEFFF' : '#FFFFFF');
    }
    ctx.globalAlpha = 1;
  }
  // the ghosts of the ghost skin: a 9x9 pixel ghost, see-through, rising and wobbling as it fades out
  function drawGhosts() {
    for (const gh of ghostSprites) {
      const T = 2.6;
      const k = gh.t / T;
      // it orbits the cookie, a little closer and then further out, and rises slowly
      const ang = gh.ang0 + gh.dir * gh.t * gh.spin;
      const r = 40;
      const size = gh.big ? 11 : 9;
      // a small sideways sway of 2 px on top of the orbit
      const sway = Math.round(Math.sin(gh.t * 12) * 2);
      const x = Math.round(gh.ax + Math.cos(ang) * r - size / 2) + sway, y = Math.round(gh.ay + Math.sin(ang) * r * 0.7 - size / 2 - k * 8);
      const fade = Math.min(1, gh.t / 0.3) * Math.max(0, 1 - Math.max(0, gh.t - (T - 0.6)) / 0.6);
      ctx.globalAlpha = fade * 0.6;
      const col = gh.col || '#E6FFF0';
      // the body: a round top and a wavy hem that flutters
      const w = size, h = size - 3;
      fillRect(x + 2, y, w - 4, 1, col);
      fillRect(x + 1, y + 1, w - 2, h - 2, col);
      fillRect(x, y + 2, w, h - 3, col);
      const flutter = Math.floor(gh.t * 8) % 2;
      for (let i = 0; i < w; i += 2) fillRect(x + i + (flutter && i % 4 === 0 ? 1 : 0), y + h - 1, 1, 2, col);
      // the eyes: open, and a blink now and then; a little mouth "o" when it is excited
      const blink = Math.floor(gh.t * 2.5) % 7 === 6;
      const ey = y + Math.round(h / 2) - 1;
      if (blink) {
        fillRect(x + 2, ey + 1, 2, 1, '#1B3B2A');
        fillRect(x + w - 4, ey + 1, 2, 1, '#1B3B2A');
      } else {
        fillRect(x + 2, ey, 2, 2, '#1B3B2A');
        fillRect(x + w - 4, ey, 2, 2, '#1B3B2A');
      }
      if (gh.big) fillRect(x + Math.floor(w / 2) - 1, ey + 3, 2, 1, '#1B3B2A');
      // sparkles trail behind it
      if (flutter) fillRect(x + w + 2, y + 1, 1, 1, '#B8FFC8');
    }
    ctx.globalAlpha = 1;
  }
  // a real feather, drawn pixel by pixel along its angle: a pale shaft, vanes that bulge and taper, and a flame colour
  // a feather: a pale shaft curved towards (tx, ty) by `bend` px in the middle, with vanes that swell and taper.
  // It is drawn with fine steps and every pixel only once, so no empty pixels slip through.
  function drawFeather(x0, y0, ang, L, alpha, tx, ty, bend) {
    // a fluffy flaming feather: a pale shaft curved towards (tx, ty), wide vanes with barbs that flicker,
    // colours from red at the base through orange to yellow at the tip, and small flames flicking off the edges
    const dx = Math.cos(ang), dy = Math.sin(ang), px_ = -dy, py_ = dx;
    const seen = new Set();
    ctx.globalAlpha = alpha;
    const put = (x, y, col) => {
      const key = x + ',' + y;
      if (seen.has(key)) return;
      seen.add(key);
      fillRect(x, y, 1, 1, col);
    };
    for (let t = 0; t <= L; t += 0.5) {
      const f = t / L;
      const bow = Math.sin(Math.PI * f) * bend;
      const cxp = x0 - dx * L / 2 + dx * t + tx * bow;
      const cyp = y0 - dy * L / 2 + dy * t + ty * bow;
      // fluffy: the vanes are wide in the middle and their barbs make notches that move with time
      const notch = ((Math.floor(t * 2) + Math.floor(cookT * 10)) % 3 === 0) ? 1 : 0;
      const w = Math.sin(Math.PI * f) * 7 + notch * 0.5;
      const flick = Math.sin(cookT * 14 + t * 1.3) > 0;
      for (let j = -w; j <= w; j += 0.5) {
        const x = Math.round(cxp + px_ * j), y = Math.round(cyp + py_ * j);
        const side = j < 0 ? -1 : 1;
        let col;
        if (Math.abs(j) < 0.5) col = '#FFF6C8';                                  // the shaft
        else if (f < 0.35) col = side < 0 ? '#E0301A' : '#FF5A1A';                // red at the base
        else if (f < 0.7) col = flick ? '#FF8A1A' : '#FF6A1A';                  // orange through the middle
        else col = flick ? '#FFE27A' : '#FFD04A';                               // yellow at the tip
        put(x, y, col);
      }
      // small flames flicking off the outer edge of the vanes
      if (f > 0.4 && Math.sin(cookT * 11 + t * 2.1) > 0.4) {
        const fx = Math.round(cxp + px_ * (w + 1)), fy = Math.round(cyp + py_ * (w + 1));
        put(fx, fy - 1, '#FFD04A');
      }
    }
    ctx.globalAlpha = 1;
  }
  // the shape of the cookie on screen, so a planet on the far side of its orbit disappears exactly behind it
  let fxMask = null;   // {data, w, h, ox, oy}: the cookie's alpha and where it sits on screen
  function maskHit(x, y) {
    const lx = x - fxMask.ox, ly = y - fxMask.oy;
    if (lx < 0 || ly < 0 || lx >= fxMask.w || ly >= fxMask.h) return false;
    return fxMask.data[(ly * fxMask.w + lx) * 4 + 3] > 0;
  }
  const thumbMaskCache = new Map();
  function thumbMask(img, ox, oy) {
    if (!img || !img.complete || !img.naturalWidth) return null;
    let data = thumbMaskCache.get(img);
    if (!data) {
      const cv = document.createElement('canvas');
      cv.width = 74; cv.height = 74;
      const c2 = cv.getContext('2d');
      c2.drawImage(img, 0, 0, 74, 74);
      data = c2.getImageData(0, 0, 74, 74).data;
      thumbMaskCache.set(img, data);
    }
    return { data, w: 74, h: 74, ox, oy };
  }
  // the main colour of each cookie, used for the +N popups
  function skinMainColor(id) {
    const map = {
      classic: '#C5763A', banana: '#F6D454', chocolate: '#7A4A2A', vanilla: '#F0D8A0', strawberry: '#E6829A',
      mint: '#96D2B4', ice: '#AADCF5', gold: '#F0BE3C', neon: '#8A5AC8', neontube: '#00E6D0', volcano: '#FF7A14',
      crystal: '#96E6FF', royal: '#FFCD3C', ghost: '#AAE6BE', starry: '#9AA6FF', newyear: '#B42828', solar: '#FFC850',
      sea: '#3C8CD2', zefir: '#FFB4D0', caramel: '#DC8C28', gzhel: '#2A5AC8', halloween: '#E0802A', easter: '#F7B6D2',
    };
    if (id === 'rainbow') return 'hsl(' + Math.round((cookT * 60) % 360) + ', 90%, 65%)';
    return map[id] || '#C5763A';
  }
  // the glow colour of each premium skin (a and the strength of it)
  function skinGlow(id, a) {
    if (id === 'volcano') return 'rgba(255, 130, 20, ' + a + ')';
    if (id === 'neontube') return 'rgba(0, 255, 230, ' + a + ')';
    if (id === 'crystal') return 'rgba(120, 220, 255, ' + a + ')';
    if (id === 'royal') return 'rgba(255, 205, 60, ' + a + ')';
    if (id === 'ghost') return 'rgba(140, 255, 170, ' + a + ')';
    if (id === 'rainbow') return 'hsla(' + Math.round((cookT * 60) % 360) + ', 100%, 60%, ' + a + ')';
    if (id === 'starry') return 'rgba(150, 170, 255, ' + a + ')';
    if (id === 'newyear') return 'rgba(255, 210, 120, ' + a + ')';
    if (id === 'solar') return 'rgba(255, 210, 90, ' + a + ')';
    if (id === 'zefir') return 'rgba(255, 150, 200, ' + a + ')';
    if (id === 'caramel') return 'rgba(255, 170, 40, ' + a + ')';
    if (id === 'gzhel') return 'rgba(60, 110, 220, ' + a + ')';
    if (id === 'halloween') return 'rgba(255, 120, 30, ' + a + ')';
    if (id === 'easter') return 'rgba(255, 170, 210, ' + a + ')';
    if (id === 'sea') return 'rgba(60, 160, 255, ' + a + ')';
    return 'rgba(255, 60, 220, ' + a + ')';
  }
  // the effects of the new skins, drawn around a picture at (cx, cy); echo() draws a faded copy of the picture (ghost)
  const NEW_FX_IDS = ['solar', 'crystal', 'royal', 'ghost', 'rainbow', 'starry', 'newyear', 'zefir', 'caramel', 'sea', 'gzhel', 'halloween', 'easter'];
  function drawNewFx(id, cx, cy, rx, ry, echo) {
    if (id === 'crystal') {
      // a glint runs round the rim, and snowflakes fall from the top
      const gi = (cookT / 1.6) % 1, ga = gi * 2 * Math.PI;
      const gx = Math.round(cx + Math.cos(ga) * rx * 0.95), gy = Math.round(cy + Math.sin(ga) * ry * 0.95);
      fillRect(gx - 2, gy, 5, 1, '#E8FAFF');
      fillRect(gx, gy - 2, 1, 5, '#E8FAFF');
      // three big faceted crystals stick out of the rim, each with a light and a dark side, shimmering
      [[-1.9, 11], [-1.25, 13], [1.1, 10]].forEach(([ang, L0], i) => {
        const L = L0 + Math.sin(cookT * 2 + i) * 0.6;
        const bx = cx + Math.cos(ang) * rx * 0.85, by = cy + Math.sin(ang) * ry * 0.85;
        const dx = Math.cos(ang), dy = Math.sin(ang);
        const px_ = -dy, py_ = dx;                          // across the crystal
        for (let s = 0; s <= L; s++) {
          const half = Math.max(0, Math.round(4 * (1 - s / L)));   // tapers to the tip
          for (let j = -half; j <= half; j++) {
            const x = Math.round(bx + dx * s + px_ * j), y = Math.round(by + dy * s + py_ * j);
            const lit = j < 0 ? 1 : 0;                         // the left facet is lit
            const col = s > L - 2 ? '#FFFFFF' : lit ? '#BDEFFF' : '#5FB8E8';
            fillRect(x, y, 1, 1, col);
          }
        }
      });
      for (let i = 0; i < 5; i++) {
        const life = (cookT * 0.25 + i * 0.2) % 1;
        const fx = Math.round(cx - rx * 1.3 + i * rx * 0.65 + Math.sin(cookT + i) * 3);
        const fy = Math.round(cy - ry * 1.2 + life * ry * 2.4);
        ctx.globalAlpha = 1 - life * 0.5;
        fillRect(fx, fy - 1, 1, 3, '#D8F4FF');
        fillRect(fx - 1, fy, 3, 1, '#D8F4FF');
        ctx.globalAlpha = 1;
      }
    } else if (id === 'royal') {
      // a little gold crown bobs above, and a golden ring swells and fades every 2.5 s
      const bob = Math.round(Math.sin(cookT * 7) * 1.5);
      const x0 = Math.round(cx - 5), y0 = Math.round(cy - ry - 8 + bob);
      fillRect(x0, y0 + 2, 11, 2, '#FFD84A');
      fillRect(x0, y0, 2, 3, '#FFD84A');
      fillRect(x0 + 4, y0 - 1, 2, 4, '#FFD84A');
      fillRect(x0 + 8, y0, 2, 3, '#FFD84A');
      fillRect(x0 + 4, y0 - 1, 2, 1, '#E0364A');
      // the golden ring is a fast burst (0.7 s), and comes again every 4 seconds
      const ph = cookT % 4;
      if (ph < 0.7) {
        const t = ph / 0.7, rr = rx * (0.8 + t * 0.55);
        ctx.globalAlpha = 1 - t;
        for (let k = 0; k < 16; k++) {
          const a = (k * 2 * Math.PI) / 16;
          fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.85), 1, 1, '#FFE27A');
        }
        ctx.globalAlpha = 1;
      }
    } else if (id === 'ghost') {
      // two faded echoes drift beside the picture, and pale wisps rise from it
      if (echo) {
        for (let n = 0; n < 2; n++) {
          ctx.globalAlpha = 0.2;
          echo(n ? 4 : -4);
        }
        ctx.globalAlpha = 1;
      }
      for (let i = 0; i < 4; i++) {
        const life = (cookT * 0.9 + i * 0.25) % 1;
        ctx.globalAlpha = 1 - life;
        fillRect(Math.round(cx - rx + i * rx * 0.6 + Math.sin(cookT * 3 + i) * 2), Math.round(cy + ry - life * ry * 2), 1, 1, '#B8FFC8');
        ctx.globalAlpha = 1;
      }
    } else if (id === 'rainbow') {
      // a rainbow arch above the cookie, its colours turning, and confetti dots around the rim
      for (let k = 0; k < 11; k++) {
        const a = -Math.PI * 0.85 + k * (Math.PI * 0.7 / 10);
        const rr = rx + 4 + (k % 2);
        fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.9 - 4), 2, 2, 'hsl(' + Math.round((k * 36 + cookT * 90) % 360) + ', 100%, 65%)');
      }
      for (let i = 0; i < 8; i++) {
        const a = i * 0.8 + cookT * 0.7;
        fillRect(Math.round(cx + Math.cos(a) * (rx - 2)), Math.round(cy + Math.sin(a) * (ry - 2)), 1, 1, 'hsl(' + Math.round((i * 45 + cookT * 120) % 360) + ', 100%, 70%)');
      }
      // rainbow rays: eight short rays out from the cookie, their colours turning and flickering
      for (let i = 0; i < 8; i++) {
        const a = i * (Math.PI / 4) - cookT * 0.5;
        const flick = 0.5 + 0.5 * Math.sin(cookT * 6 + i);
        ctx.globalAlpha = 0.5 + 0.5 * flick;
        for (let s = 0; s < 4; s++) {
          const rr = rx + 6 + s * 2 + flick * 2;
          fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.9), 1, 1, 'hsl(' + Math.round((i * 45 + cookT * 150) % 360) + ', 100%, 65%)');
        }
      }
      ctx.globalAlpha = 1;
      // a confetti burst every 3 seconds, from a new side each time
      const bt = (cookT % 3) / 3, bside = Math.floor(cookT / 3) * 1.9;
      if (bt < 0.6) {
        for (let i = 0; i < 6; i++) {
          const a = bside + i * (Math.PI / 3) * 0.9;
          const d = bt * 60;
          ctx.globalAlpha = 1 - bt / 0.6;
          fillRect(Math.round(cx + Math.cos(a) * (rx * 0.6 + d)), Math.round(cy + Math.sin(a) * (ry * 0.6 + d)), 2, 2, 'hsl(' + Math.round((i * 60 + cookT * 200) % 360) + ', 100%, 70%)');
        }
        ctx.globalAlpha = 1;
      }
    } else if (id === 'starry') {
      // six stars twinkle around, and a crescent moon drifts above the top right
      const sp = [[-rx - 4, -ry + 4], [rx + 2, -ry - 2], [-rx + 6, ry + 4], [rx + 6, ry - 6], [-rx - 8, 2], [rx + 10, 6], [-rx - 2, -ry - 6], [rx - 6, ry + 8]];
      // a faint constellation that blinks slowly
      if (Math.sin(cookT * 0.7) > -0.3) {
        for (const [a, b] of [[0, 6], [6, 1], [1, 5], [4, 2]]) {
          for (let s = 1; s < 8; s++) {
            const x = Math.round(cx + sp[a][0] + (sp[b][0] - sp[a][0]) * s / 8), y = Math.round(cy + sp[a][1] + (sp[b][1] - sp[a][1]) * s / 8);
            ctx.globalAlpha = 0.35;
            fillRect(x, y, 1, 1, '#B9C8FF');
            ctx.globalAlpha = 1;
          }
        }
      }
      for (let i = 0; i < sp.length; i++) {
        if (Math.sin(cookT * 3 + i * 2.1) > 0.2) {
          const tx = Math.round(cx + sp[i][0]), ty = Math.round(cy + sp[i][1]);
          fillRect(tx - 1, ty, 3, 1, '#FFFFFF');
          fillRect(tx, ty - 1, 1, 3, '#FFFFFF');
        }
      }
      // a shooting star crosses the top left every 6 seconds
      const st = cookT % 6;
      if (st < 0.7) {
        const hx = cx - rx - 14 + st * 70, hy = cy - ry - 12 + st * 40;
        for (let s = 0; s < 10; s++) {
          ctx.globalAlpha = (1 - s / 10) * (1 - st / 0.7);
          fillRect(Math.round(hx - s * 2), Math.round(hy - s), 2, 1, s < 2 ? '#FFFFFF' : '#A9C4FF');
        }
        ctx.globalAlpha = 1;
      }
      const mx = Math.round(cx + rx * 0.7), my = Math.round(cy - ry - 8 + Math.sin(cookT * 0.5) * 2);
      for (let y = -3; y <= 3; y++) {
        for (let x = -3; x <= 3; x++) {
          const inOuter = x * x + y * y <= 9;
          const inCut = (x - 1.5) * (x - 1.5) + (y + 1) * (y + 1) <= 6;
          if (inOuter && !inCut) fillRect(mx + x, my + y, 1, 1, '#FFF3B0');
        }
      }
    } else if (id === 'newyear') {
      // falling snow, trees with a blinking star and a garland of lights, a snowman with a waving scarf, gifts
      const base = Math.round(cy + ry + 3);
      const trees = [Math.round(cx - rx * 0.8), Math.round(cx - rx * 0.4)];
      for (const tx of trees) drawTree(tx, base);
      fillRect(trees[0], base - 19, 1, 2, Math.sin(cookT * 6) > 0 ? '#FFD84A' : '#FFFFFF');   // the star blinks
      const gcols = ['#FF3A3A', '#3AFF6A', '#FFD84A', '#4AB8FF'];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const lx = Math.round(trees[0] + (trees[1] - trees[0]) * t);
        const ly = Math.round(base - 14 + Math.sin(t * Math.PI) * 3);
        ctx.globalAlpha = Math.sin(cookT * 5 + i) > 0 ? 1 : 0.3;
        fillRect(lx, ly, 1, 1, gcols[i % gcols.length]);
      }
      ctx.globalAlpha = 1;
      drawSnowman(Math.round(cx + rx * 0.95), base, true);
      drawSnowman(Math.round(cx + rx * 1.55), base, false);
      // gifts of different colours and sizes, in a row on the floor
      const gifts = [
        [cx - rx * 1.5, 6, '#D83A3A', '#FFD84A'],
        [cx - rx * 1.25, 8, '#3A7AD8', '#F4F4F4'],
        [cx - rx * 1.02, 5, '#3AAA5A', '#FF5A8A'],
        [cx - rx * 0.78, 7, '#9A3AD8', '#FFD84A'],
      ];
      for (const [gxf, size, col, ribbon] of gifts) {
        const gx = Math.round(gxf), gy = base - size;
        fillRect(gx, gy, size, size, col);
        fillRect(gx + Math.floor(size / 2) - 0, gy, 1, size, ribbon);      // the ribbon across the box
        fillRect(gx, gy + Math.floor(size / 2), size, 1, ribbon);
        fillRect(gx + Math.floor(size / 2) - 1, gy - 2, 1, 2, ribbon);     // the bow
        fillRect(gx + Math.floor(size / 2) + 1, gy - 2, 1, 2, ribbon);
        if (Math.sin(cookT * 7 + gx) > 0.6) fillRect(gx + 1, gy + 1, 1, 1, '#FFFFFF');   // a glint on the box
      }
    } else if (id === 'solar') {
      // a sun in the middle, and eight planets orbiting it on tilted tracks: each one moves at its own speed
      const PL = [
        { r: 1.2, s: 2.2, c: '#A9A9A9', n: 1 },                          // Mercury
        { r: 1.32, s: 1.7, c: '#F3E1A0', n: 1 },                         // Venus
        { r: 1.46, s: 1.4, c: '#3A8CFF', n: 1, g: '#4CD67A' },            // Earth
        { r: 1.6, s: 1.1, c: '#E0553A', n: 1 },                          // Mars
        { r: 1.8, s: 0.6, c: '#E9A46A', n: 3, bands: true },              // Jupiter
        { r: 2.0, s: 0.45, c: '#E8D08A', n: 2, ring: true },             // Saturn
        { r: 2.2, s: 0.3, c: '#7FE8F0', n: 2 },                          // Uranus
        { r: 2.4, s: 0.22, c: '#3A5AE0', n: 2 },                         // Neptune
      ];
      PL.forEach((pl, i) => {
        const ax = rx * pl.r, ay = ry * pl.r * 0.42;
        // the track, a faint dotted ellipse
        ctx.globalAlpha = 0.15;
        for (let k = 0; k < 48; k += 2) {
          const t = (k / 48) * 2 * Math.PI;
          fillRect(Math.round(cx + Math.cos(t) * ax), Math.round(cy + Math.sin(t) * ay), 1, 1, '#FFFFFF');
        }
        ctx.globalAlpha = 1;   // the track was faint; the planets are solid
        // the planet, on its track; on the far side of its orbit it passes behind the cookie
        const a = cookT * pl.s + i * 0.8;
        const px2 = Math.round(cx + Math.cos(a) * ax), py2 = Math.round(cy + Math.sin(a) * ay);
        const behind = Math.sin(a) < 0;
        const pp = (x, y, col) => {
          if (behind) {
            const hidden = fxMask ? maskHit(x, y) : (((x - cx) / (rx * 0.92)) ** 2 + ((y - cy) / (ry * 0.92)) ** 2 <= 1);
            if (hidden) return;
          }
          fillRect(x, y, 1, 1, col);
        };
        for (let dx = -pl.n; dx < pl.n; dx++) for (let dy = -pl.n; dy < pl.n; dy++) pp(px2 + dx, py2 + dy, pl.c);
        if (pl.g) pp(px2 - 1, py2 - 1, pl.g);
        if (pl.bands) for (let dx = -pl.n; dx < pl.n; dx++) pp(px2 + dx, py2, '#C77A4A');
        if (pl.ring) for (let dx = -pl.n - 2; dx < pl.n + 2; dx++) pp(px2 + dx, py2, '#D8C27A');
      });
      ctx.globalAlpha = 1;
    } else if (id === 'zefir') {
      // marshmallows of five shapes, bigger and shaded (a white shine, a deeper pink on the shadow side), all running round the rim the same way
      const SHAPES = {
        bigRound: ['...XXXXX...', '..XXXXXXX..', '.XXXXXXXXX.', 'XXXXXXXXXXX', 'XXXXXXXXXXX', 'XXXXXXXXXXX', 'XXXXXXXXXXX', '.XXXXXXXXX.', '..XXXXXXX..', '...XXXXX...'],
        round: ['..XXXXX..', '.XXXXXXX.', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..'],
        tube: ['XXXXX', 'XXXXX', 'XXXXX', 'XXXXX', 'XXXXX', 'XXXXX', 'XXXXX', 'XXXXX', 'XXXXX', 'XXXXX'],
        pillow: ['.XXXXXXX.', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.'],
        heart: ['..XXX...XXX..', '.XXXXX.XXXXX.', 'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX', '.XXXXXXXXXXX.', '..XXXXXXXXX..', '...XXXXXXX...', '....XXXXX....', '.....XXX.....', '......X......'],
        star: ['...X...', '...X...', 'XXXXXXX', '.XXXXX.', '..XXX..', '.XX.XX.', 'XX...XX'],
      };
      // where each marshmallow starts: an angle along the rim (0 = right, -PI/2 = top) and its shape
      const PLACES = [
        ['bigRound', -1.75], ['round', -1.15], ['heart', -0.25], ['pillow', 0.45],
        ['star', 2.2], ['heart', Math.PI], ['round', -2.5],
      ];
      const puffs = [];
      PLACES.forEach(([kind], i) => {
        // all of them run round the rim in the same direction, at equal distances from each other
        const t = -Math.PI / 2 + i * (Math.PI * 2 / PLACES.length) + cookT * 0.6;
        const rows = SHAPES[kind];
        const mh = rows.length, mw = rows[0].length;
        const px = Math.round(cx + Math.cos(t) * rx * 0.97 - mw / 2);
        const py = Math.round(cy + Math.sin(t) * ry * 0.97 - mh / 2);
        const on = (x, y) => y >= 0 && y < mh && x >= 0 && x < rows[y].length && rows[y][x] === 'X';
        for (let y = 0; y < mh; y++) for (let x = 0; x < rows[y].length; x++) {
          if (!on(x, y)) continue;
          const edge = !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1);
          let col = '#FFD6EA';
          if (edge) col = '#FF9CC8';
          else if (x <= mw * 0.35 && y <= mh * 0.35) col = '#FFFFFF';   // the shine, top left
          else if (x >= mw * 0.7 || y >= mh * 0.7) col = '#FFB8D8';     // the shadow side, bottom right
          fillRect(px + x, py + y, 1, 1, col);
        }
        puffs.push([px, py, mw, mh]);
      });
      // hearts float up out of the round marshmallows
      for (const i of [0, 1, 6]) {
        const [px, py, mw] = puffs[i];
        const life = (cookT * 0.3 + i * 0.17) % 1;
        const hx = px + Math.floor(mw / 2) - 1, hy = Math.round(py - 2 - life * 22);
        ctx.globalAlpha = 1 - life;
        fillRect(hx, hy, 1, 1, '#FF5FA8'); fillRect(hx + 2, hy, 1, 1, '#FF5FA8');
        fillRect(hx, hy + 1, 3, 1, '#FF5FA8'); fillRect(hx + 1, hy + 2, 1, 1, '#FF5FA8');
        ctx.globalAlpha = 1;
      }
      // sugar sparkles twinkle round the rim
      for (let i = 0; i < 5; i++) {
        const t = i * 1.26 + 0.4;
        const tw = Math.sin(cookT * 4 + i * 2.1);
        if (tw > 0.2) {
          const sx = Math.round(cx + Math.cos(t) * rx * 1.08), sy = Math.round(cy + Math.sin(t) * ry * 1.08);
          ctx.globalAlpha = (tw - 0.2) / 0.8;
          fillRect(sx, sy, 1, 1, '#FFFFFF');
          fillRect(sx - 1, sy, 1, 1, '#FFD6EA'); fillRect(sx + 1, sy, 1, 1, '#FFD6EA');
          fillRect(sx, sy - 1, 1, 1, '#FFD6EA'); fillRect(sx, sy + 1, 1, 1, '#FFD6EA');
          ctx.globalAlpha = 1;
        }
      }
      // soft drips of melted marshmallow run down the bottom edge
      for (let i = 0; i < 4; i++) {
        const a = Math.PI * (0.3 + i * 0.13);
        const sx = Math.round(cx + Math.cos(a) * rx * 0.85), sy = Math.round(cy + Math.sin(a) * ry * 0.85);
        const phase = (cookT * 0.18 + i * 0.27) % 1;
        const len = 1 + Math.round(phase * 7);
        ctx.globalAlpha = 1 - phase * 0.4;
        for (let y = 0; y < len; y++) fillRect(sx, sy + y, 1, 1, y === len - 1 ? '#FFFFFF' : '#FFE4F0');
        if (phase > 0.7) fillRect(sx - 1, sy + len, 3, 1, '#FFD6EA');
        ctx.globalAlpha = 1;
      }
      // pink fluff drifts up and away from the cookie
      for (let i = 0; i < 4; i++) {
        const life = (cookT * 0.25 + i * 0.25) % 1;
        const t = -Math.PI / 2 + i * 1.57 + Math.sin(cookT + i) * 0.3;
        const fx = Math.round(cx + Math.cos(t) * (rx + life * 10)), fy = Math.round(cy + Math.sin(t) * (ry + life * 14) - life * 6);
        ctx.globalAlpha = (1 - life) * 0.8;
        fillRect(fx, fy, 2, 2, '#FFD6EA');
        ctx.globalAlpha = 1;
      }
    } else if (id === 'easter') {
      // painted eggs roll round the rim, and little petals drift down past the cookie
      const EG = ['#FF9EC4', '#9EE6C8', '#FFE27A', '#C6B4FF'];
      // sixteen eggs travel round the cookie: four rings, each one tilted at its own angle, turning at its own speed and way round
      const EGG_RINGS = [
        { a: 1.06, b: 0.92, rot: 0.2, sp: 0.55, dir: 1 },
        { a: 1.28, b: 1.07, rot: -0.7, sp: 0.42, dir: -1 },
        { a: 1.5, b: 1.2, rot: 1.1, sp: 0.36, dir: 1 },
        { a: 1.72, b: 1.32, rot: -1.5, sp: 0.3, dir: -1 },
      ];
      const eggPts = [];
      EGG_RINGS.forEach((ring, r) => {
        for (let k = 0; k < 4; k++) {
          const t = cookT * ring.sp * ring.dir + k * (Math.PI / 2) + r * 0.6;
          const x0 = Math.cos(t) * rx * ring.a, y0 = Math.sin(t) * ry * ring.b;
          eggPts.push({ x: x0 * Math.cos(ring.rot) - y0 * Math.sin(ring.rot), y: x0 * Math.sin(ring.rot) + y0 * Math.cos(ring.rot), col: EG[(r * 4 + k) % EG.length] });
        }
      });
      // if two eggs ever meet, they are pushed apart so they never overlap
      for (let i = 0; i < eggPts.length; i++) for (let j = i + 1; j < eggPts.length; j++) {
        const a = eggPts[i], b = eggPts[j];
        const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
        if (dist < 6 && dist > 0.001) {
          const nx = dx / dist, ny = dy / dist, push = (6 - dist) / 2;
          a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
        }
      }
      for (const egg of eggPts) drawEgg(Math.round(cx + egg.x), Math.round(cy + egg.y), egg.col);
      for (let i = 0; i < 6; i++) {
        const life = (cookT * 0.2 + i / 6) % 1;
        const px = Math.round(cx + Math.sin(cookT * 1.3 + i * 2) * rx * 0.9), py = Math.round(cy - ry + life * (ry * 2 + 20));
        ctx.globalAlpha = 1 - life * 0.6;
        fillRect(px, py, 2, 1, '#FFD6EA');
        fillRect(px, py + 1, 1, 1, '#FF9CC8');
        ctx.globalAlpha = 1;
      }
    } else if (id === 'halloween') {
      // pumpkins with glowing faces stand on the floor, a moon glows above, and bats fly round the cookie
      const base = Math.round(cy + ry + 3);
      const glow = Math.sin(cookT * 7) > -0.2;   // the candles inside flicker
      drawPumpkin(Math.round(cx - rx * 1.45), base, 0.75, glow);
      drawPumpkin(Math.round(cx - rx * 0.95), base, 1, !glow);
      drawPumpkin(Math.round(cx + rx * 1.0), base, 1, glow);
      drawPumpkin(Math.round(cx + rx * 1.5), base, 0.75, !glow);
      // the moon: a crescent that glows and breathes
      const mx = Math.round(cx + rx * 1.15), my = Math.round(cy - ry - 14);
      const mg = 0.6 + 0.4 * Math.sin(cookT * 2);
      for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
        if (x * x + y * y <= 36 && (x - 3) * (x - 3) + (y + 1) * (y + 1) > 25) {
          ctx.globalAlpha = mg;
          fillRect(mx + x, my + y, 1, 1, '#FFF3B0');
        }
      }
      // four bats flap round the cookie, with tiny orange eyes
      for (let i = 0; i < 4; i++) {
        const t = cookT * (0.6 + i * 0.15) + i * 1.6;
        const bx = Math.round(cx + Math.cos(t) * (rx + 16)), by = Math.round(cy + Math.sin(t) * (ry + 12) * 0.7 - 8);
        const up = Math.sin(cookT * 10 + i) > 0;
        const wy = up ? by - 2 : by + 1;
        const dark = '#1E1A22';
        fillRect(bx, by, 1, 2, dark);
        fillRect(bx - 1, by - 1, 1, 1, dark); fillRect(bx + 1, by - 1, 1, 1, dark);   // ears
        fillRect(bx - 4, wy, 3, 1, dark); fillRect(bx + 2, wy, 3, 1, dark);            // wings
        fillRect(bx - 3, wy + 1, 2, 1, dark); fillRect(bx + 2, wy + 1, 2, 1, dark);
        fillRect(bx, by, 1, 1, '#FF7A1A');   // eyes
      }
    } else if (id === 'gzhel') {
      // blue sparks twinkle along the rim, and cobalt dots flash on the edge
      for (let i = 0; i < 6; i++) {
        const t = i * 1.05 + cookT * 0.3;
        const sx = Math.round(cx + Math.cos(t) * rx * 1.04), sy = Math.round(cy + Math.sin(t) * ry * 1.04);
        const tw = Math.sin(cookT * 5 + i * 1.7);
        if (tw > 0.3) {
          ctx.globalAlpha = (tw - 0.3) / 0.7;
          fillRect(sx, sy, 1, 1, '#FFFFFF');
          fillRect(sx - 1, sy, 1, 1, '#2A5AC8'); fillRect(sx + 1, sy, 1, 1, '#2A5AC8');
          fillRect(sx, sy - 1, 1, 1, '#2A5AC8'); fillRect(sx, sy + 1, 1, 1, '#2A5AC8');
          ctx.globalAlpha = 1;
        }
      }
      for (let i = 0; i < 3; i++) {
        const t = Math.PI * (0.25 + i * 0.5);
        const bx = Math.round(cx + Math.cos(t) * rx * 0.98), by = Math.round(cy + Math.sin(t) * ry * 0.98);
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(cookT * 4 + i);
        fillRect(bx, by, 2, 2, '#2A5AC8');
        ctx.globalAlpha = 1;
      }
    } else if (id === 'caramel') {
      // eight drips of caramel start on the lower edge of the cookie and run down; each one grows, then drops a bead
      for (let i = 0; i < 8; i++) {
        const a = Math.PI * (0.15 + i * 0.1);                         // angles along the bottom of the cookie
        const sx = Math.round(cx + Math.cos(a) * rx * 0.9), sy = Math.round(cy + Math.sin(a) * ry * 0.9);
        const phase = (cookT * 0.22 + i * 0.13) % 1;
        const len = 2 + Math.round(phase * 9);
        ctx.globalAlpha = 1 - phase * 0.3;
        for (let y = 0; y < len; y++) fillRect(sx, sy + y, 1, 1, y === 0 ? '#FFD070' : '#FFB02E');   // the drip, from the cookie down
        if (phase > 0.55) fillRect(sx - 1, sy + len, 3, 2, '#FFB02E');   // a bead forming at the tip
      }
      ctx.globalAlpha = 1;
      // a pool of caramel under the cookie, pulsing
      const pw = Math.round(12 + Math.sin(cookT * 2) * 2);
      ctx.globalAlpha = 0.6;
      for (let x = -pw; x <= pw; x++) fillRect(Math.round(cx + x), Math.round(cy + ry + 6), 1, 2, '#E08A20');
      ctx.globalAlpha = 1;
    } else if (id === 'sea') {
      // bubbles of three sizes rise from the bottom, wobbling sideways, each one with a shine; they grow a little as they rise
      for (let i = 0; i < 9; i++) {
        const life = (cookT * (0.2 + (i % 3) * 0.07) + i * 0.11) % 1;
        const size = i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2;
        const bx = Math.round(cx - rx * 1.1 + ((i * 29) % Math.round(rx * 2.2)) + Math.sin(cookT * 2 + i) * 2);
        const by = Math.round(cy + ry - life * ry * 2.6);
        ctx.globalAlpha = 0.85 - life * 0.5;
        fillRect(bx, by, size, size, '#CFF4FF');
        fillRect(bx + 1, by + 1, size - 2, size - 2, '#E6FAFF');
        fillRect(bx, by, 1, 1, '#FFFFFF');                      // the shine
      }
      ctx.globalAlpha = 1;
    }
  }
  // the premium effects around a picture (the same look as in the game, a little smaller)
  function drawSkinFxAt(id, cx, cy, rx, ry) {
    if (NEW_FX_IDS.includes(id)) { drawNewFx(id, cx, cy, rx, ry, null); return; }
    if (id === 'neontube') {
      const arcT = cookT % 2.2;
      if (arcT < 0.15) {
        const a0 = Math.floor(cookT / 2.2) * 2.39;
        for (let k = 0; k < 9; k++) {
          const a = a0 + k * 0.14;
          const off = k % 2 ? 2.5 : -1.5;
          fillRect(Math.round(cx + Math.cos(a) * (rx - 4 + off)), Math.round(cy + Math.sin(a) * (ry - 3 + off)), 2, 2, k % 3 ? '#FFFFFF' : '#7DF9FF');
        }
      }
      return;
    }
    if (id === 'neon') {
      const cols = ['#FF5FDC', '#7DF9FF', '#FFFFFF'];
      for (let i = 0; i < 6; i++) {
        const a = cookT * 1.4 + (i * 2 * Math.PI) / 6;
        fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 2, 2, cols[i % 3]);
      }
      for (let i = 0; i < 4; i++) {
        if (Math.sin(cookT * 4 + i * 1.7) > 0.3) {
          const tx = Math.round(cx + [-rx - 6, rx + 4, -rx + 2, rx - 2][i]), ty = Math.round(cy + [-ry - 4, -ry + 2, ry + 2, ry + 4][i]);
          fillRect(tx, ty, 3, 1, '#FFFFFF');
          fillRect(tx + 1, ty - 1, 1, 3, '#FFFFFF');
        }
      }
    } else if (id === 'volcano') {
      for (let i = 0; i < 6; i++) {
        const life = ((cookT * 0.8 + i * 0.167) % 1);
        const ex = Math.round(cx - rx + i * (2 * rx / 5) + Math.sin(cookT * 5 + i * 2) * 2);
        const ey = Math.round(cy + ry - life * ry * 2);
        fillRect(ex, ey, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1, i % 2 ? '#FFD35A' : '#FF6A1A');
      }
      for (let i = 0; i < 3; i++) {
        const life = ((cookT * 0.35 + i * 0.33) % 1);
        ctx.globalAlpha = 0.5 * (1 - life);
        fillRect(Math.round(cx - 12 + i * 12 + life * 4), Math.round(cy - ry - 2 - life * 16), 3, 2, '#6B5E66');
        ctx.globalAlpha = 1;
      }
    }
  }
  // the ad button shows how many ads are still left for this skin, and counts down with each view
  function adButtonLabel(k) {
    const left = Math.max(0, skinAdNeed(k) - (skinAdViews[k.id] || 0));
    const word = left === 1 ? 'РЕКЛАМУ' : left >= 2 && left <= 4 ? 'РЕКЛАМЫ' : 'РЕКЛАМ';
    return 'ЗА ' + left + ' ' + word;
  }
  function drawSkinPreview() {
    const k = SKINS.find((s) => s.id === skinPreview);
    drawTextBox(k.name, 1, REB_X0, REB_X1, REB_Y0 + 6, REB_Y0 + 16, accent());
    const thumb = skinThumbs[k.id];
    const fx = k.id === 'neon' || k.id === 'volcano' || k.id === 'neontube' || NEW_FX_IDS.includes(k.id);
    if (fx) {
      // the glow of the picture: pink for the neon, orange for the volcanic one, pulsing
      const pulse = 0.5 + 0.5 * Math.sin(cookT * (k.id === 'volcano' ? 9 : 3));
      ctx.save();
      ctx.shadowColor = skinGlow(k.id, (0.5 + 0.4 * pulse).toFixed(2));
      ctx.shadowBlur = 4 + 8 * pulse;
    }
    const pSway = k.id === 'ghost' ? Math.round(Math.sin(cookT * 1.8) * 2) : 0;   // the same 2 px sway in the preview
    if (thumb && thumb.complete && thumb.naturalWidth) ctx.drawImage(thumb, 160 - 37 + pSway, 30, 74, 74);
    if (fx) { ctx.restore(); fxMask = thumbMask(thumb, 123, 30); drawSkinFxAt(k.id, 160, 67, 40, 33); fxMask = null; }
    if (k.id === 'ghost') drawGhosts();
    if (k.id === 'newyear') drawDeers();
    if (k.id === 'sea') drawFishes();
    const owned = !!skinOwned[k.id];
    if (owned) {
      drawText(settings.skin === k.id ? 'СЕЙЧАС НАДЕТ' : 'ПОЛУЧЕН', 1, 160, 114, COL.text, 'center');
      if (settings.skin !== k.id) settingsButton(60, 130, 260, 144, 'НАДЕТЬ');
    } else {
      drawText('У ВАС НЕТ ЭТОГО СКИНА, ПОЛУЧИТЬ:', 1, 160, 114, dimTone(), 'center');
      if (k.premium) {
        // the same two buttons as a daily skin: watch the ads, or buy it in the shop
        settingsButton(60, 130, 155, 144, adButtonLabel(k));
        settingsButton(165, 130, 260, 144, 'В МАГАЗИНЕ');
      } else {
        settingsButton(60, 130, 155, 144, adButtonLabel(k));
        settingsButton(165, 130, 260, 144, 'В НАГРАДАХ');
      }
    }
    settingsButton(60, 156, 260, 170, 'НАЗАД');
  }
  // the skin pictures grid: 6 per row, 24 px pictures, 28 px apart (24 skins fit in 4 rows)
  const SKIN_CELL = 24;
  function skinCellXY(i) {
    const col = i % 6, row = Math.floor(i / 6);
    return [60 + col * 34, 28 + row * 28];
  }
  function drawSkinWin() {
    fillRect(0, 0, W, H, 'rgba(10, 8, 24, 0.6)');
    fillRect(REB_X0, REB_Y0, REB_X1 - REB_X0, REB_Y1 - REB_Y0, COL.panel);
    fillRect(REB_X0, REB_Y0, REB_X1 - REB_X0, 1, COL.panelEdge);
    fillRect(REB_X0, REB_Y1 - 1, REB_X1 - REB_X0, 1, COL.panelEdge);
    fillRect(REB_X0, REB_Y0, 1, REB_Y1 - REB_Y0, COL.panelEdge);
    fillRect(REB_X1 - 1, REB_Y0, 1, REB_Y1 - REB_Y0, COL.panelEdge);
    if (skinPreview) { drawSkinPreview(); return; }
    drawTextBox('ВНЕШНИЙ ВИД', 1, REB_X0, REB_X1, REB_Y0 + 6, REB_Y0 + 16, COL.text);
    // the skins as pictures: 5 per row; the ones not owned yet are dim; the worn one has a gold frame
    SKINS.forEach((k, i) => {
      const [cx, cy] = skinCellXY(i);
      const chosen = settings.skin === k.id;
      const owned = !!skinOwned[k.id];
      if (chosen) fillRect(cx - 2, cy - 2, SKIN_CELL + 4, SKIN_CELL + 4, accent());
      fillRect(cx - 1, cy - 1, SKIN_CELL + 2, SKIN_CELL + 2, COL.tabOff);
      const thumb = skinThumbs[k.id];
      if (thumb && thumb.complete && thumb.naturalWidth) {
        ctx.globalAlpha = owned ? 1 : 0.28;                 // not owned: dim
        ctx.drawImage(thumb, cx, cy, SKIN_CELL, SKIN_CELL);
        ctx.globalAlpha = 1;
      }
    });
    drawText('НАЖМИ НА СКИН', 1, 160, 142, dimTone(), 'center');
    settingsButton(60, 156, 260, 170, 'ЗАКРЫТЬ');
  }

  // ---------- progress window: statistics, achievements, leaderboards (after the Yandex SDK) ----------
  // achievements in groups: each has a progress value and a goal
  const ACH = [];
  const addAch = (name, value, goal) => ACH.push({ name, value, goal });
  [100, 1000, 5000, 10000, 25000].forEach((g) =>
    addAch('СДЕЛАТЬ ' + g + ' КЛИКОВ ВРУЧНУЮ', () => playerClicks, g));
  [1e6, 1e9, 1e12].forEach((g) =>
    addAch('ЗАРАБОТАТЬ ' + fmt(BigInt(g)), () => Number(totalEarned), g));
  [1, 10, 25, 50, 100, 200, 300, 500, 1000, 2500, 5000, 10000].forEach((g) =>
    addAch('КУПИТЬ ВСЕГО ' + g + ' ТЕХНИКИ', () => techOwned.reduce((x, y) => x + y, 0), g));
  [1, 5, 10, 20, 40].forEach((g) =>
    addAch('КУПИТЬ ' + g + ' ПРОКАЧЕК', () => prokOwned.filter(Boolean).length, g));
  [1, 2, 3, 5, 10, 20, 30, 40, 50].forEach((g) =>
    addAch('СДЕЛАТЬ ПЕРЕРОЖДЕНИЙ: ' + g, () => rebirths, g));
  [10, 25, 50, 100].forEach((g) =>
    addAch('ТЕХНИКА ДОСТИГЛА УРОВНЯ ' + g, () => Math.max(...techOwned), g));
  [100, 1000, 2500, 5000, 10000].forEach((g) =>
    addAch('КУПИТЬ УЛУЧШЕНИЙ КЛИКА: ' + g, () => clickOwned.reduce((x, y) => x + y, 0), g));
  // playing time, in minutes
  [[10, '10 МИНУТ'], [30, '30 МИНУТ'], [60, '1 ЧАС'], [120, '2 ЧАСА'], [240, '4 ЧАСА'],
    [600, '10 ЧАСОВ'], [1440, '24 ЧАСА'], [3000, '50 ЧАСОВ'], [6000, '100 ЧАСОВ']].forEach(([g, label]) =>
    addAch('ИГРАТЬ ' + label, () => playSec / 60, g));
  [10, 100, 1000].forEach((g) =>
    addAch('СДЕЛАТЬ ' + g + ' ПОКУПОК', () => totalBought, g));
  [100, 1000, 10000, 100000].forEach((g) =>
    addAch('ДОХОД ' + g + ' В СЕКУНДУ', () => autoPerSec(), g));
  const PROG_TABS = ['stats', 'ach', 'top', 'daily'];
  const ACH_PER_PAGE = 6, ACH_PAGES = Math.ceil(ACH.length / 6);   // 6 per page
  // the progress window is wider than the others, so the three tab names fit on one row
  const PROG_X0 = 6, PROG_X1 = 314;
  const PROG_TAB_X = [10, 92, 174, 242];
  const PROG_TAB_W = [80, 80, 66, 60];
  function progTabRect(i) {
    return [PROG_TAB_X[i], 16, PROG_TAB_X[i] + PROG_TAB_W[i], 28];
  }
  function fmtTime(sec) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = Math.floor(sec % 60);
    return h > 0 ? h + 'Ч ' + m + 'М' : m + 'М ' + x + 'С';
  }
  function handleProgDown(gx, gy) {
    for (let i = 0; i < PROG_TABS.length; i++) {
      const [x0, y0, x1, y1] = progTabRect(i);
      if (inRect(gx, gy, x0, y0, x1, y1)) { progWin.tab = PROG_TABS[i]; dailyPreview = null; return; }
    }
    if (progWin.tab === 'daily') {
      if (dailyPreview) {
        // in the preview only НАЗАД works here; the window's ЗАКРЫТЬ below still closes it
        if (inRect(gx, gy, 60, 138, 260, 152)) { dailyPreview = null; return; }
      } else {
        const cellW = 38, cellGap = 2, x0 = Math.round((W - (7 * cellW + 6 * cellGap)) / 2);
        for (let k = 1; k <= 7; k++) {
          const cx = x0 + (k - 1) * (cellW + cellGap);
          if (inRect(gx, gy, cx, 46, cx + cellW, 94)) { dailyPreview = k; return; }   // tap a day: its skin and its day number
        }
        if (dailyCanClaim() && inRect(gx, gy, 100, 112, 220, 126)) { dailyClaim(); return; }
      }
    }
    if (progWin.tab === 'ach') {
      if (inRect(gx, gy, 16, 136, 76, 150)) progWin.page = Math.max(0, (progWin.page || 0) - 1);
      if (inRect(gx, gy, 244, 136, 304, 150)) progWin.page = Math.min(ACH_PAGES - 1, (progWin.page || 0) + 1);
    }
    if (inRect(gx, gy, 16, 156, 304, 170)) { progWin = null; panelOpen = shopReturn; shopReturn = false; }   // back to the shop only if it was open before
  }
  // ---------- daily reward ----------
  // the Moscow date (UTC+3) as YYYY-MM-DD, with an optional shift in days
  function mskDate(shiftDays) {
    return new Date(Date.now() + 3 * 3600e3 + (shiftDays || 0) * 86400e3).toISOString().slice(0, 10);
  }
  // the day that the next claim gives: the streak goes on if yesterday was claimed, else it starts again at 1
  function dailyNext() {
    const today = mskDate(), yesterday = mskDate(-1);
    if (dailyDate === today) return { next: dailyDay, claimed: true };
    if (dailyDate === yesterday) return { next: (dailyDay % 7) + 1, claimed: false };
    return { next: 1, claimed: false };
  }
  function dailyCanClaim() {
    const s = dailyNext();
    return !s.claimed && dailySecDate === mskDate() && dailySec >= DAILY_NEED;
  }
  function dailyClaim() {
    if (!dailyCanClaim()) return;
    const s = dailyNext();
    const skin = SKINS[s.next];                  // day 1 gives skin 2 in the list, ..., day 7 gives skin 8
    if (skin && !skinOwned[skin.id]) skinOwned[skin.id] = true;   // already owned: nothing to give
    dailyDay = s.next;
    dailyDate = mskDate();
    saveGame();
  }
  // the preview of one day: its skin, the day number and whether it is already owned
  function drawDailyPreview() {
    const k = dailyPreview, s = dailyNext();
    const skin = SKINS[k];
    if (!skin) return;
    const have = !!skinOwned[skin.id];
    drawText(skin.name, 1, 160, 30, accent(), 'center');
    drawText('НА ' + k + ' ДЕНЬ', 1, 160, 40, dimTone(), 'center');
    const thumb = skinThumbs[skin.id];
    if (thumb && thumb.complete && thumb.naturalWidth) ctx.drawImage(thumb, 160 - 37, 48, 74, 74);
    const status = have ? 'УЖЕ ЕСТЬ' : (k === s.next && !s.claimed) ? 'ПОЛУЧИШЬ ЗА НАГРАДУ' : 'ПОЗЖЕ';
    drawText(status, 1, 160, 126, have ? COL.text : dimTone(), 'center');
    settingsButton(60, 138, 260, 152, 'НАЗАД');
  }
  function drawDaily() {
    if (dailyPreview) { drawDailyPreview(); return; }
    const s = dailyNext();
    const cellW = 38, cellGap = 2, x0 = Math.round((W - (7 * cellW + 6 * cellGap)) / 2);
    drawTextBox('НАГРАДА ЗА ДЕНЬ', 1, PROG_X0, PROG_X1, 32, 42, COL.text);
    for (let k = 1; k <= 7; k++) {
      const cx = x0 + (k - 1) * (cellW + cellGap);
      const skin = SKINS[k];
      const have = !!(skin && skinOwned[skin.id]);
      const done = k < s.next || (s.claimed && k === s.next);
      const current = k === s.next;
      fillRect(cx, 46, cellW, 48, current ? COL.tabOn : COL.tabOff);
      drawText(String(k), 1, cx + cellW / 2, 50, have ? COL.text : dimTone(), 'center');
      const thumb = skin && skinThumbs[skin.id];
      if (thumb && thumb.complete && thumb.naturalWidth) {
        ctx.globalAlpha = have ? 1 : 0.4;
        ctx.drawImage(thumb, cx + 7, 63, 24, 24);
        ctx.globalAlpha = 1;
      }
      if (done) fillRect(cx, 46, cellW, 1, dimTone());
    }
    const mins = Math.max(0, Math.ceil((DAILY_NEED - (dailySecDate === mskDate() ? dailySec : 0)) / 60));
    if (s.claimed) drawText('ПРИХОДИ ЗАВТРА', 1, 160, 102, dimTone(), 'center');
    else if (dailyCanClaim()) drawText('НАГРАДА ГОТОВА', 1, 160, 102, accent(), 'center');
    else drawText('ИГРАЙ ЕЩЁ ' + mins + ' МИН', 1, 160, 102, COL.text, 'center');
    if (dailyCanClaim()) settingsButton(100, 112, 220, 126, 'ЗАБРАТЬ');
    const next = SKINS[s.next];
    if (next) {
      const line = 'ДЕНЬ ' + s.next + ': ' + next.name + (skinOwned[next.id] ? ' (УЖЕ ЕСТЬ)' : '');
      drawText(line, 1, 160, 140, dimTone(), 'center');
    }
  }
  function drawProgWin() {
    fillRect(0, 0, W, H, 'rgba(10, 8, 24, 0.6)');          // dim the game behind
    fillRect(PROG_X0, REB_Y0, PROG_X1 - PROG_X0, REB_Y1 - REB_Y0, COL.panel);
    fillRect(PROG_X0, REB_Y0, PROG_X1 - PROG_X0, 1, COL.panelEdge);
    fillRect(PROG_X0, REB_Y1 - 1, PROG_X1 - PROG_X0, 1, COL.panelEdge);
    fillRect(PROG_X0, REB_Y0, 1, REB_Y1 - REB_Y0, COL.panelEdge);
    fillRect(PROG_X1 - 1, REB_Y0, 1, REB_Y1 - REB_Y0, COL.panelEdge);
    drawTextBox('ПРОГРЕСС', 1, PROG_X0, PROG_X1, REB_Y0 + 1, REB_Y0 + 11, COL.text);
    const labels = ['СТАТИСТИКА', 'ДОСТИЖЕНИЯ', 'ТАБЛИЦЫ', 'НАГРАДЫ'];
    labels.forEach((label, i) => {
      const [x0, y0, x1, y1] = progTabRect(i);
      fillRect(x0, y0, x1 - x0, y1 - y0, progWin.tab === PROG_TABS[i] ? COL.tabOn : COL.tabOff);
      drawTextBox(label, 1, x0, x1, y0, y1, COL.text);
      if (PROG_TABS[i] === 'daily' && dailyCanClaim() && Math.sin(cookT * 6) > 0) blinkDot(x1 - 6, y0 + 2);
    });
    const tab = progWin.tab;
    if (tab === 'stats') {
      const rows = [
        ['ВСЕГО ЗАРАБОТАНО', fmt(totalEarned)],
        ['ПЕРЕРОЖДЕНИЙ', String(rebirths)],
        ['КЛИКОВ ВРУЧНУЮ', String(playerClicks)],
        ['ПОКУПОК', String(totalBought)],
        ['ТЕХНИКИ КУПЛЕНО', String(techOwned.reduce((a, b) => a + b, 0))],
        ['ПРОКАЧЕК КУПЛЕНО', String(prokOwned.filter(Boolean).length)],
        ['ДОХОД ЗА КЛИК', fmt(clickGain())],
        ['ДОХОД В СЕКУНДУ', fmt(BigInt(Math.floor(autoPerSec())))],
        ['МНОЖИТЕЛЬ', String(incomeMult()) + 'Х'],
        ['ВРЕМЯ В ИГРЕ', fmtTime(playSec)],
      ];
      rows.forEach(([name, value], i) => {
        const y = 43 + i * 10;   // 15 px under the tabs, 16 px above the button
        drawText(name, 1, 16, y, dimTone(), 'left');
        drawText(value, 1, 304 - textWidth(value, 1), y, COL.text, 'left');
      });
    } else if (tab === 'ach') {
      const page = progWin.page || 0;
      for (let k = 0; k < ACH_PER_PAGE; k++) {
        const a = ACH[page * ACH_PER_PAGE + k];
        if (!a) break;
        const y = 38 + k * 16;   // 10 px under the tabs, 11 px above the buttons
        const v = a.value();
        const done = v >= a.goal;
        drawText(a.name, 1, 16, y, COL.text, 'left');
        if (done) {
          drawText('ВЫПОЛНЕН', 1, 304 - textWidth('ВЫПОЛНЕН', 1), y, accent(), 'left');   // yellow, like the bonus lines
        } else {
          const prog = fmt(BigInt(Math.floor(v))) + '/' + fmt(BigInt(a.goal));
          drawText(prog, 1, 304 - textWidth(prog, 1), y, dimTone(), 'left');
        }
      }
      settingsButton(16, 136, 76, 150, 'НАЗАД');
      settingsButton(244, 136, 304, 150, 'ДАЛЕЕ');
      drawText('СТР ' + (page + 1) + '/' + ACH_PAGES, 1, 113, 140, COL.text, 'center');
      const gotCount = ACH.filter((a) => a.value() >= a.goal).length;
      drawText('ПОЛУЧЕНО ' + gotCount + '/' + ACH.length, 1, 193, 140, accent(), 'center');
    } else if (tab === 'daily') {
      drawDaily();
    } else {
      drawText('ТАБЛИЦЫ ЛИДЕРОВ', 1, 16, 60, COL.text, 'left');
      drawText('ПОЯВЯТСЯ ПОСЛЕ', 1, 16, 74, dimTone(), 'left');
      drawText('ПОДКЛЮЧЕНИЯ ЯНДЕКС ИГР', 1, 16, 84, dimTone(), 'left');
    }
    settingsButton(16, 156, 304, 170, 'ЗАКРЫТЬ');
  }

  // ---------- rebirth window ----------
  const REB_X0 = 50, REB_X1 = 270, REB_Y0 = 4, REB_Y1 = 176;   // same frame as the settings window: 4 px above, 6 px below the last button
  function handleRebirthDown(gx, gy) {
    const ready = cycleEarned >= rebirthNeed();
    if (inRect(gx, gy, 60, 140, 260, 154)) {
      if (ready) doRebirth();
      return;
    }
    if (inRect(gx, gy, 60, 156, 260, 170)) { rebirthOpen = false; shopReturn = false; }
  }
  // the description sits exactly halfway between the title and the button under it
  const REB_DY = 17;
  function drawRebirth() {
    fillRect(0, 0, W, H, 'rgba(10, 8, 24, 0.6)');          // dim the game behind
    fillRect(REB_X0, REB_Y0, REB_X1 - REB_X0, REB_Y1 - REB_Y0, COL.panel);
    fillRect(REB_X0, REB_Y0, REB_X1 - REB_X0, 1, COL.panelEdge);
    fillRect(REB_X0, REB_Y1 - 1, REB_X1 - REB_X0, 1, COL.panelEdge);
    fillRect(REB_X0, REB_Y0, 1, REB_Y1 - REB_Y0, COL.panelEdge);
    fillRect(REB_X1 - 1, REB_Y0, 1, REB_Y1 - REB_Y0, COL.panelEdge);
    drawTextBox('ПЕРЕРОЖДЕНИЕ', 1, REB_X0, REB_X1, REB_Y0 + 6, REB_Y0 + 16, COL.text);

    const need = rebirthNeed();
    const ready = cycleEarned >= need;
    const per = premiumOwned.rebirth2 ? 4 : 2;
    const nowMult = Math.pow(per, rebirths);
    const afterMult = Math.pow(per, rebirths + 1);
    drawText('ПЕРЕРОЖДЕНИЙ СЕЙЧАС: ' + rebirths, 1, 60, 22 + REB_DY, COL.text, 'left');
    drawText('ДОХОД: ' + nowMult + 'Х, ПОСЛЕ: ' + afterMult + 'Х', 1, 60, 32 + REB_DY, accent(), 'left');
    drawText('СБРОСИТСЯ: ПРЯНИКИ, ТЕХНИКА,', 1, 60, 46 + REB_DY, COL.text, 'left');
    drawText('ПРОКАЧКИ, УЛУЧШЕНИЯ', 1, 60, 56 + REB_DY, COL.text, 'left');
    drawText('ОСТАНЕТСЯ: ПРЕМИУМ, РЕКЛАМА,', 1, 60, 70 + REB_DY, COL.text, 'left');
    drawText('НАСТРОЙКИ', 1, 60, 80 + REB_DY, COL.text, 'left');
    drawText('НАКОПЛЕНО: ' + fmt(cycleEarned) + ' / ' + fmt(need), 1, 60, 96 + REB_DY, ready ? accent() : COL.text, 'left');
    settingsButton(60, 140, 260, 154, ready ? 'ПЕРЕРОЖДЕНИЕ' : 'ЕЩЁ ' + fmt(need - cycleEarned));
    settingsButton(60, 156, 260, 170, 'ЗАКРЫТЬ');
  }

  // short form for the shop: from millions 1.01М, billions МЛД, trillions ТРЛ. The top counter is not shortened.
  function fmt(v) {
    const n = BigInt(v);
    if (n < 1000000n) return n.toString();
    const x = Number(n);
    if (x < 1e9) return (x / 1e6).toFixed(2) + 'М';
    if (x < 1e12) return (x / 1e9).toFixed(2) + 'МЛД';
    return (x / 1e12).toFixed(2) + 'ТРЛ';
  }

  // ---------- buy amount: 1, 10, 100 or МАКС (only for КЛИК and ТЕХНИКА, which can be bought many times) ----------
  let buyMode = 1;              // 1 | 10 | 100 | 'max'
  const BUY_MODES = [
    { mode: 1, label: '1Х' },
    { mode: 10, label: '10Х' },
    { mode: 100, label: '100Х' },
    { mode: 'max', label: 'МАКС' },
  ];
  const BUY_MAX_STEPS = 5000;   // safety cap for МАКС
  function buyRect(i) {
    const x = PX0 + 6 + i * 37;
    return [x, 158, x + 35, 172];
  }
  // a click upgrade or a technika opens after 5 of the one before it (the first one is always open)
  const UNLOCK_PREV = 5;
  function listLocked(tabId, i) {
    if (i === 0) return false;
    const own = tabId === 'click' ? clickOwned : techOwned;
    return own[i - 1] < UNLOCK_PREV;
  }
  // what one tap buys in a repeatable tab: how many (n) and the total price; canOne = the first one is affordable
  function plan(tab, i) {
    if ((tab === 'click' || tab === 'tech') && listLocked(tab, i)) return { n: 0, cost: 0n, canOne: false };
    const base = tab === 'click' ? CLICK_UPGRADES[i].base : TECHNIKA[i].base;
    const owned = tab === 'click' ? clickOwned[i] : techOwned[i];
    const cap = tab === 'tech' ? TECH_MAX - owned : Infinity;     // technika stops at its maximum level
    const limit = Math.min(buyMode === 'max' ? BUY_MAX_STEPS : buyMode, cap);
    if (limit <= 0) return { n: 0, cost: 0n, canOne: false };
    let n = 0, sum = 0n;
    for (let k = 0; k < limit; k++) {
      const p = finalPrice(priceOf(base, owned + k));
      if (buyMode === 'max' && coins < sum + p) break;   // МАКС: stop at what the coins can pay
      sum += p;
      n++;
    }
    const canOne = coins >= finalPrice(priceOf(base, owned));
    if (n === 0) return { n: 0, cost: finalPrice(priceOf(base, owned)), canOne };
    return { n, cost: sum, canOne };
  }

  // the blinking dot: a tab has something new to buy (never bought and affordable), or, for ПРЕМИУМ,
  // some rewarded ad is still not watched
  function tabHasNew(id) {
    if (id === 'click') return CLICK_UPGRADES.some((u, i) => clickOwned[i] === 0 && !listLocked('click', i) && coins >= priceNow('click', i));
    if (id === 'tech') return TECHNIKA.some((t, j) => techOwned[j] === 0 && !listLocked('tech', j) && coins >= priceNow('tech', j));
    if (id === 'prok') return PROKACHKI.some((p, g) => !prokOwned[g] && prokUnlocked(g) && coins >= priceNow('prok', g));
    if (id === 'premium') return !(adWatched.double && adWatched.discount);
    return false;
  }
  function tabRect(i) {
    const col = i % 2, row = Math.floor(i / 2);
    const x = PX0 + 6 + col * 75;
    const y = 4 + row * 16;
    return [x, y, x + 73, y + 14];
  }

  // ---------- list helpers ----------
  // premium tab sections: adverts, permanent bonuses, skins, backgrounds (not yet)
  const PREMIUM_SECTIONS = [
    { id: 'ads', label: 'БЕСПЛАТНО' },
    { id: 'bonus', label: 'БОНУСЫ' },
    { id: 'skins', label: 'СКИНЫ' },
    { id: 'bg', label: 'ФОНЫ' },
  ];
  let premiumSection = 'bonus';
  function premiumItemsFor(sec) {
    if (sec === 'ads') return PREMIUM_ITEMS.filter((x) => x.kind === 'ad');
    // the bonuses from the cheapest to the most expensive, top to bottom
    if (sec === 'bonus') return PREMIUM_ITEMS.filter((x) => x.kind === 'premium' && ['double', 'triple', 'rebirth2', 'discount', 'autoclick', 'bundle', 'reb1', 'reb2', 'reb5', 'reb10'].includes(x.id)).sort((a, b) => {
      // the bonuses by price, then the bundle, then the rebirth packs by price
      const grp = (x) => (x.add ? 2 : x.id === 'bundle' ? 1 : 0);
      return grp(a) - grp(b) || parseInt(a.price, 10) - parseInt(b.price, 10);
    });
    // the bundle of all premium skins always comes first
    if (sec === 'skins') {
      // after the bundle nothing is left to buy: the section is empty ("ТОВАРОВ НЕТ")
      if (premiumOwned.skins_all) return [];
      // a bought skin leaves the shop
      return PREMIUM_ITEMS.filter((x) => x.id === 'skins_all' || (x.id.startsWith('skin_') && !premiumOwned[x.id]))
        .sort((a, b) => (a.id === 'skins_all' ? -1 : b.id === 'skins_all' ? 1 : 0));
    }
    return [{ kind: 'soon', id: 'bg', name: 'НОВЫЕ ФОНЫ', line: 'ПОЯВЯТСЯ ПОЗЖЕ', price: '' }];
  }
  function sectionRect(i) {
    const col = i % 2, row = Math.floor(i / 2);
    const x0 = PX0 + 6 + col * 76;
    const y0 = 38 + row * 14;
    return [x0, y0, x0 + 72, y0 + 12];
  }
  function items() {
    if (tab === 'click') return CLICK_UPGRADES;
    if (tab === 'tech') return TECHNIKA;
    if (tab === 'prok') return prokSel === null ? TECHNIKA : PROK_BY_TECH[prokSel].map((g) => PROKACHKI[g]);
    return premiumItemsFor(premiumSection);
  }
  function maxScroll() {
    const content = items().length * ROW_H;
    return Math.max(0, content - (listBottom() - listTop()));
  }
  // list pixels per thumb pixel, so the thumb reaches the end of the track when the list reaches its end
  function thumbRatio() {
    const trackH = listBottom() - listTop();
    const content = items().length * ROW_H;
    const thumbH = Math.max(12, Math.round((trackH * trackH) / content));
    return maxScroll() / Math.max(1, trackH - thumbH);
  }
  function clampScroll() {
    scroll = Math.min(maxScroll(), Math.max(0, scroll));
  }

  // ---------- settings ----------
  // «НАСТРОЙКИ» is the first button of the top row
  const [GEAR_X0, GEAR_X1, GEAR_Y0, GEAR_Y1] = topRect('settings');
  const SET_X0 = 60, SET_Y0 = 4, SET_X1 = 260, SET_Y1 = 176;

  // plain top-row button (same style as the shop button)
  // a blinking 4x4 gold dot: something is ready to take
  function blinkDot(x, y) {
    fillRect(x + 1, y, 2, 4, COL.gold);
    fillRect(x, y + 1, 4, 2, COL.gold);
  }
  function drawTopButton(label, x0, x1, y0, y1) {
    fillRect(x0, y0, x1 - x0, y1 - y0, COL.btnFrame);
    fillRect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4, COL.btnFill);
    fillRect(x0 + 2, y0 + 2, x1 - x0 - 4, 1, COL.btnHi);
    drawTextBox(label, 1, x0, x1, y0, y1, COL.btnText);
  }

  function drawSettingsButton() {
    const x = GEAR_X0, y = GEAR_Y0, w = GEAR_X1 - GEAR_X0, h = GEAR_Y1 - GEAR_Y0;
    fillRect(x, y, w, h, COL.btnFrame);                 // 2 px silver border, symmetric
    fillRect(x + 2, y + 2, w - 4, h - 4, COL.btnFill);
    fillRect(x + 2, y + 2, w - 4, 1, COL.btnHi);
    drawTextBox('НАСТРОЙКИ', 1, x, x + w, y, y + h, COL.btnText);
  }

  // the track spans exactly the width of the buttons below (x 76..244), label above it
  const SLIDER_X0 = 76, SLIDER_W = 168;
  function sliderRow(y, label, v) {
    drawText(label, 1, SLIDER_X0, y, COL.text, 'left');
    fillRect(SLIDER_X0, y + 14, SLIDER_W, 2, COL.track);
    fillRect(SLIDER_X0, y + 14, Math.round(SLIDER_W * v), 2, settings.colorblind ? '#4DA3FF' : COL.emblem);
    fillRect(SLIDER_X0 + Math.round(SLIDER_W * v) - 1, y + 11, 3, 8, COL.btnText);
  }

  function settingsButton(x0, y0, x1, y1, label) {
    fillRect(x0, y0, x1 - x0, y1 - y0, COL.row);
    fillRect(x0, y0, x1 - x0, 1, COL.btnHi);
    drawTextBox(label, 1, x0, x1, y0, y1, COL.text);
  }

  function drawSettings() {
    fillRect(0, 0, W, H, 'rgba(10, 8, 24, 0.6)');          // dim the game behind
    fillRect(SET_X0, SET_Y0, SET_X1 - SET_X0, SET_Y1 - SET_Y0, COL.panel);
    // straight 1 px border on all four sides
    fillRect(SET_X0, SET_Y0, SET_X1 - SET_X0, 1, COL.panelEdge);
    fillRect(SET_X0, SET_Y1 - 1, SET_X1 - SET_X0, 1, COL.panelEdge);
    fillRect(SET_X0, SET_Y0, 1, SET_Y1 - SET_Y0, COL.panelEdge);
    fillRect(SET_X1 - 1, SET_Y0, 1, SET_Y1 - SET_Y0, COL.panelEdge);
    drawTextBox('НАСТРОЙКИ', 1, SET_X0, SET_X1, SET_Y0 + 6, SET_Y0 + 16, COL.text);
    sliderRow(30, 'ЗВУК', settings.sound);
    sliderRow(50, 'МУЗЫКА', settings.music);
    drawText('ДАЛЬТОНИКИ', 1, 76, 72, COL.text, 'left');
    // toggle keeps its left edge (x 200) and grows only to the right, ending at x 244
    fillRect(200, 72, 44, 10, settings.colorblind ? '#1E5FD1' : COL.track);
    fillRect(settings.colorblind ? 236 : 202, 73, 8, 8, COL.btnText);
    // animated background: a toggle on its own row (cook and background motion)
    drawText('АНИМИРОВАННЫЙ ФОН', 1, 76, 90, COL.text, 'left');
    fillRect(200, 88, 44, 10, settings.animBg ? '#5c5096' : COL.track);
    fillRect(settings.animBg ? 236 : 202, 89, 8, 8, COL.btnText);
    // screen shake on click: a toggle, off by default
    drawText('ТРЯСКА ЭКРАНА', 1, 76, 108, COL.text, 'left');
    fillRect(200, 104, 44, 10, settings.shake ? '#5c5096' : COL.track);
    fillRect(settings.shake ? 236 : 202, 105, 8, 8, COL.btnText);
    settingsButton(76, 126, 244, 141, ['СБРОС ПРОГРЕССА', 'ТОЧНО СБРОСИТЬ', 'ТОЧНО ЭТО НЕОБРАТИМО'][resetStage]);
    settingsButton(76, 144, 244, 159, 'ЗАКРЫТЬ');
    // the version and the developer: the very bottom of the window
    drawText(VERSION + ' - РАЗРАБОТЧИК: CR4YNE', 1, 160, 163, dimTone(), 'center');
  }

  function setSlider(name, gx) {
    const v = Math.max(0, Math.min(1, (gx - SLIDER_X0) / SLIDER_W));
    settings[name] = Math.round(v * 20) / 20;
    if (name === 'music' && musicGain) musicGain.gain.value = settings.music;
    if (name === 'sound' && sfxGain) sfxGain.gain.value = settings.sound;
  }

  function resetAll() {
    coins = 0n;
    clickOwned = clickOwned.map(() => 0);
    techOwned = techOwned.map(() => 0);
    prokOwned = prokOwned.map(() => false);
    adBoost = { double: 0, discount: 0 };
    autoAcc = 0;                 // premium purchases are kept on reset
    rebirths = 0;
    cycleEarned = 0n;
    saveGame();
  }

  function handleSettingsDown(gx, gy) {
    if (inRect(gx, gy, 76, 144, 244, 159)) { settingsOpen = false; resetStage = 0; panelOpen = shopReturn; shopReturn = false; return; }   // back to the shop only if it was open before
    if (inRect(gx, gy, 196, 86, 248, 100)) { settings.animBg = !settings.animBg; return; }
    if (inRect(gx, gy, 196, 102, 248, 116)) { settings.shake = !settings.shake; return; }
    if (inRect(gx, gy, 76, 126, 244, 141)) {
      resetStage += 1;
      if (resetStage >= 3) { resetAll(); resetStage = 0; }
      return;
    }
    if (inRect(gx, gy, 196, 70, 248, 84)) { settings.colorblind = !settings.colorblind; return; }
    if (inRect(gx, gy, 70, 28, 250, 47)) { sliderDrag = 'sound'; setSlider('sound', gx); return; }
    if (inRect(gx, gy, 70, 48, 250, 67)) { sliderDrag = 'music'; setSlider('music', gx); return; }
  }

  // ---------- input ----------
  function toGame(e) {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height];
  }
  function inRect(gx, gy, x0, y0, x1, y1) {
    return gx >= x0 && gx < x1 && gy >= y0 && gy < y1;
  }

  // the counter text is not a click target (the big zone overlaps it)
  function inCounter(gx, gy) {
    const cx = coinX();
    const w = Math.max(textWidth('ПРЯНИКОВ', 1), textWidth(String(coins), 2));
    return inRect(gx, gy, cx - w / 2 - 3, COUNTER_LABEL_Y - 3, cx + w / 2 + 3, COUNTER_AUTO_Y + 9);
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (splashT > 0) return;                  // the start screen takes no taps
    startMusicOnce();
    const [gx, gy] = toGame(e);
    if (settingsOpen) { handleSettingsDown(gx, gy); return; }   // the settings window blocks everything else
    if (rebirthOpen) { handleRebirthDown(gx, gy); return; }      // so does the rebirth window
    if (progWin) { handleProgDown(gx, gy); return; }             // and the progress window
    if (skinWin) { handleSkinDown(gx, gy); return; }             // and the appearance window
    if (premiumWin) { handlePremiumWinDown(gx, gy); return; }     // and the premium purchase window
    if (boostMenuOpen) { boostMenuOpen = false; return; }          // a tap closes the bonus menu
    if (inRect(gx, gy, MENU_BTN_X, MENU_BTN_Y[0], MENU_BTN_X + MENU_BTN_W, MENU_BTN_Y[1])) { boostMenuOpen = true; return; }   // the framed button opens the menu
    if (tryHitAppetite(gx, gy)) return;                           // the glowing plate on the counter
    countBonyaPokes(gx, gy);
    if (tapBonyaBubble(gx, gy)) return;
    if (tapBonya(gx, gy)) return;                                 // the sleeping rabbit by the cake
    if (inRect(gx, gy, GEAR_X0, GEAR_Y0, GEAR_X1, GEAR_Y1)) { closeMenus('settings'); settingsOpen = true; return; }
    // shop controls (only when the panel is fully open)
    if (!panelOpen && inRect(gx, gy, SKIN_BTN[0], SKIN_BTN[1], SKIN_BTN[2], SKIN_BTN[3])) { closeMenus('skin'); skinWin = true; return; }
    // the ПРОГРЕСС button is reachable from the shop too
    const [ax0, ax1, ay0, ay1] = topRect('achievements');
    if (inRect(gx, gy, ax0, ay0, ax1, ay1)) { closeMenus('progress'); progWin = { tab: 'stats', page: 0 }; return; }
    if (!panelOpen) {
      const [rx0, rx1, ry0, ry1] = topRect('rebirth');
      if (inRect(gx, gy, rx0, ry0, rx1, ry1)) { handleRebirthTap(); return; }
    }
    if (panelOpen && panelT > 0.99) {
      for (let i = 0; i < TABS.length; i++) {
        const [x0, y0, x1, y1] = tabRect(i);
        if (inRect(gx, gy, x0, y0, x1, y1)) { tab = TABS[i].id; prokSel = null; scroll = 0; return; }
      }
      if (hasBuyRow() && gy >= 158 && gy < 172) {
        for (let i = 0; i < BUY_MODES.length; i++) {
          const [x0, y0, x1, y1] = buyRect(i);
          if (inRect(gx, gy, x0, y0, x1, y1)) { buyMode = BUY_MODES[i].mode; return; }
        }
      }
      if (inRect(gx, gy, PX0 + 6, closeY(), PX1 - 6, closeY() + 14)) {
        if (tab === 'prok' && prokSel !== null) { prokSel = null; scroll = 0; return; }   // back to the technika list
        panelOpen = false;
        return;
      }
      if (tab === 'premium') {
        for (let i = 0; i < PREMIUM_SECTIONS.length; i++) {
          const [x0, y0, x1, y1] = sectionRect(i);
          if (inRect(gx, gy, x0, y0, x1, y1)) { premiumSection = PREMIUM_SECTIONS[i].id; scroll = 0; return; }
        }
      }
      if (inRect(gx, gy, PX0, listTop(), PX1, listBottom())) {
        // grabbing the scrollbar (right edge): the thumb follows the finger; elsewhere the list follows it
        drag = { y0: gy, s0: scroll, moved: 0, thumb: gx >= PX1 - 8 };
        return;
      }
    } else if (!panelOpen && inRect(gx, gy, BTN_X0, BTN_Y0, BTN_X1, BTN_Y1)) {
      closeMenus('shop');
      panelOpen = true;
      shopReturn = false;
      return;
    }
    // the coin works with the shop open too
    const dx = gx - coinX();
    const dy = gy - COIN_Y;
    if (dx * dx + dy * dy <= HIT_R * HIT_R && gy < FLOOR_Y && !inCounter(gx, gy)) spawnClick(gx, gy);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const [, gy] = toGame(e);
    const dy = gy - drag.y0;
    drag.moved = Math.max(drag.moved, Math.abs(dy));
    // list drag: content follows the finger. thumb drag: the thumb moves with the finger, so the list moves the other way.
    // dragging down moves the thumb down (top of the list = thumb at the top), so the list scrolls the other way
    scroll = drag.s0 + dy * (drag.thumb ? thumbRatio() : 1);
    clampScroll();
  });

  function endDrag(e) {
    if (!drag) return;
    const [gx, gy] = toGame(e);
    const wasTap = drag.moved < 4;
    drag = null;
    if (wasTap && inRect(gx, gy, PX0, listTop(), PX1 - 8, listBottom())) {
      const idx = Math.floor((gy - listTop() + scroll) / ROW_H);
      if (idx >= 0 && idx < items().length) {
        if (tab === 'prok' && prokSel === null) { prokSel = idx; scroll = 0; }     // open the technika's 4 upgrades
        else if (tab === 'prok') buy('prok', PROK_BY_TECH[prokSel][idx]);
        else if (tab === 'premium') {
          const it = items()[idx];
          const gi = PREMIUM_ITEMS.indexOf(it);
          if (it.kind === 'premium') { if (it.add || !premiumOwned[it.id]) premiumWin = { mode: 'confirm', idx: gi }; }
          else if (it.kind === 'ad') buy('ad', gi);
        }
        else buy(tab, idx);
      }
    }
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointermove', (e) => {
    if (!sliderDrag) return;
    const [gx] = toGame(e);
    setSlider(sliderDrag, gx);
  });
  window.addEventListener('pointerup', () => { sliderDrag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });

  canvas.addEventListener('wheel', (e) => {
    if (!panelOpen) return;
    const [gx, gy] = toGame(e);
    if (inRect(gx, gy, PX0, listTop(), PX1, listBottom())) {
      e.preventDefault();
      scroll += e.deltaY * 0.5;
      clampScroll();
    }
  }, { passive: false });

  // ---------- update ----------
  function update(dt) {
    if (splashT > 0) splashT = Math.max(0, splashT - dt);
    animT += dt;
    bonyaT += dt;
    if (skinId === 'sea' || skinPreview === 'sea') {
      fishTimer -= dt;
      if (fishTimer <= 0) {
        // one to four fish at once, each one with its own shape and colour
        const inPreview = skinPreview === 'sea';
        const count = 1 + Math.floor(Math.random() * 4);
        const cols = ['#FF9E5E', '#FFD84A', '#7FD6FF', '#FF6FA8', '#9AFF8A', '#C98BFF'];
        for (let n = 0; n < count; n++) {
          fishes.push({
            t: 0, ax: inPreview ? 160 : coinX(), ay: inPreview ? 67 : COIN_Y,
            rx: inPreview ? 40 : 46, dir: Math.random() < 0.5 ? 1 : -1, dy: (Math.random() - 0.5) * 50,
            type: Math.floor(Math.random() * 3), col: cols[Math.floor(Math.random() * cols.length)],
          });
        }
        fishTimer = 8 + Math.random() * 4;
      }
    }
    for (let i = fishes.length - 1; i >= 0; i--) {
      fishes[i].t += dt;
      if (fishes[i].t > 2.2) fishes.splice(i, 1);
    }
    if (skinId === 'newyear' || skinPreview === 'newyear') {
      deerTimer -= dt;
      if (deerTimer <= 0) {
        const inPreview = skinPreview === 'newyear';
        deers.push({ t: 0, ax: inPreview ? 160 : coinX(), ay: inPreview ? 67 : COIN_Y, dx: 0, dy: (Math.random() - 0.5) * 36 });
        deerTimer = 10 + Math.random() * 5;
      }
    }
    for (let i = deers.length - 1; i >= 0; i--) {
      deers[i].t += dt;
      if (deers[i].t > 4) deers.splice(i, 1);
    }
    if (skinId === 'ghost' || skinPreview === 'ghost' || skinId === 'halloween' || skinPreview === 'halloween') {
      ghostTimer -= dt;
      if (ghostTimer <= 0) {
        const halloween = skinId === 'halloween' || skinPreview === 'halloween';
        const inPreview = skinPreview === 'ghost' || skinPreview === 'halloween';   // in the appearance preview the ghosts orbit the picture there
        const ax = inPreview ? 160 : coinX(), ay = inPreview ? 67 : COIN_Y;
        // each ghost has its own mood: its size, its spin direction and how fast it orbits; on Halloween some are orange
        const col = halloween && Math.random() < 0.5 ? '#FFB347' : undefined;
        ghostSprites.push({ t: 0, ax, ay, ang0: Math.random() * Math.PI * 2, dir: Math.random() < 0.5 ? 1 : -1, big: Math.random() < 0.4, spin: 1.6 + Math.random() * 1.2, col });
        ghostTimer = halloween ? 2 + Math.random() * 2 : 5 + Math.random() * 5;
      }
    }
    for (let i = ghostSprites.length - 1; i >= 0; i--) {
      ghostSprites[i].t += dt;
      if (ghostSprites[i].t > 2.6) ghostSprites.splice(i, 1);
    }
    const boostOn = adBoost.double > 0;
    if (bonyaBoostWas && !boostOn) bonyaSpeechGap = BONYA_SPEECH_EVERY;   // the bonus has just ended: the 5-minute count starts again
    bonyaBoostWas = boostOn;
    const menu = speechMenuOpen();
    if (boostOn) {
      bonyaSpeechLeft = 0;                                // the bonus is already running: no offer
      bonyaSpeechPending = false;
    } else {
      // the count always runs; if it ends while a menu is open, the bubble waits until the menu is closed
      if (bonyaSpeechLeft > 0) { if (!menu) bonyaSpeechLeft = Math.max(0, bonyaSpeechLeft - dt); }
      else {
        bonyaSpeechGap -= dt;
        if (bonyaSpeechGap <= 0) { bonyaSpeechGap = BONYA_SPEECH_EVERY; bonyaSpeechPending = true; }
      }
      if (bonyaSpeechPending && !menu && bonyaSpeechLeft <= 0) {
        bonyaSpeechLeft = BONYA_SPEECH_FOR;
        bonyaSpeechPending = false;
      }
    }
    // Z letters appear only while she sleeps and the animated background is on
    if (settings.animBg && (bonyaT % BONYA_CYCLE) >= BONYA_AWAKE_FOR) {
      bonyaZTimer += dt;
      if (bonyaZTimer >= BONYA_Z_EVERY) { bonyaZTimer = 0; bonyaZs.push(0); }
    }
    for (let i = bonyaZs.length - 1; i >= 0; i--) {
      bonyaZs[i] += dt;
      if (bonyaZs[i] >= BONYA_Z_LIFE) bonyaZs.splice(i, 1);
    }
    playSec += dt;
    const today = mskDate();
    if (dailySecDate !== today) { dailySecDate = today; dailySec = 0; }
    dailySec += dt;
    updateEvents(dt);
    cookT += dt;
    shakeT = Math.max(0, shakeT - dt);

    const target = panelOpen ? 1 : 0;
    const step = PANEL_SPEED * dt;
    if (panelT < target) panelT = Math.min(target, panelT + step);
    else if (panelT > target) panelT = Math.max(target, panelT - step);

    // generators
    const perSec = autoPerSec();
    if (perSec > 0) {
      autoAcc += perSec * dt;
      const whole = Math.floor(autoAcc);
      if (whole > 0) {
        coins += BigInt(whole);
        cycleEarned += BigInt(whole);
        totalEarned += BigInt(whole);
        autoAcc -= whole;
      }
    }

    for (const p of popups) { p.t += dt; p.y -= 30 * dt; }
    if (adBoost.double > 0) adBoost.double = Math.max(0, adBoost.double - dt);
    if (adBoost.discount > 0) adBoost.discount = Math.max(0, adBoost.discount - dt);
    if (musicStarted && audioCtx) {
      musicT += dt;
      if (musicT >= TRACK_PERIOD) {
        musicT = 0;
        trackIdx = pickNextTrack();
        playTrack(trackIdx, TRACK_FADE);
      }
    }
    for (let i = popups.length - 1; i >= 0; i--) if (popups[i].t > 0.8) popups.splice(i, 1);
    for (const s of sparks) {
      s.t += dt;
      s.vy += 200 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    // crumbs fall off the bottom of the screen instead of vanishing
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].y > H + 4) sparks.splice(i, 1);
  }

  // colour-blind mode: blue instead of gold/gingerbread for the things colour must show (popups, crumbs, prices, sliders)
  // colour-blind palette (see the approved sheet): accent #4DA3FF, dark #1E5FD1, unavailable #6B6A9E, shadow #0B2A66
  function bodyTone() { return settings.colorblind ? '#4DA3FF' : skinMainColor(skinId); }   // the +N takes the colour of the chosen cookie
  function accent() { return settings.colorblind ? '#4DA3FF' : COL.gold; }
  function dimTone() { return settings.colorblind ? '#6B6A9E' : COL.dim; }
  function shadowTone() { return settings.colorblind ? '#0B2A66' : '#3a1d0a'; }

  // gingerbread-coloured "+N": solid colour with a depth shadow (drawn with the popup's alpha)
  function drawGingerText(str, sc, x, yCap) {
    drawText(str, sc, x + sc, yCap + 2 * sc, shadowTone(), 'center');   // depth shadow
    drawText(str, sc, x, yCap, bodyTone(), 'center');                 // gingerbread body
  }

  // ---------- background: the bakery kitchen (art/kitchen-bg.png, from tools/make_kitchen_bg.py) ----------
  let kitchenImg = null;
  const kitchenLoader = new Image();
  kitchenLoader.onload = () => { kitchenImg = kitchenLoader; };
  kitchenLoader.src = 'art/kitchen-bg.png?v=16';   // ?v: a new background is picked up without a hard reload

  // cook animation: four frames at 4 fps (art/cook-0..3.png, drawn at x 80, y 80 over the background)
  const COOK_X = 80, COOK_Y = 80, COOK_FPS = 4;
  const cookFrames = [0, 1, 2, 3].map((i) => {
    const im = new Image();
    im.src = 'art/cook-' + i + '.png?v=6';
    return im;
  });

  // Боня: a sable rabbit asleep on the floor to the left of the cake (40x24, the floor at y 152).
  // Frame 1 = asleep (breathing is in the sprite); frame 2 = the same with one ear flicked.
  // Every 10 s the ear flicks for 0.3 s.
  const BONYA_X = 40, BONYA_Y = 152, BONYA_PERIOD = 10, BONYA_TWITCH = 0.3;
  // Sprites: 0 awake, 1 asleep (breathing), 2 asleep with an ear flick, 3 asleep with a sniff,
  // 4 and 5 awake, washing (a paw to the cheek, two steps).
  // Cycle of 3 minutes: she wakes first and washes for 60 s (from the start of the game), then sleeps for 2 min
  // with little Z letters floating up, then wakes for a minute and washes again.
  // While asleep: the ear flicks every 10 s (0.3 s), the nose sniffs 2 times a second (0.12 s each).
  const BONYA_AWAKE_FOR = 60, BONYA_SLEEP_FOR = 120, BONYA_CYCLE = BONYA_AWAKE_FOR + BONYA_SLEEP_FOR;
  const BONYA_DROWSY = 1.5;   // seconds of closing eyes before she falls asleep
  const BONYA_Z_EVERY = 2.4, BONYA_Z_LIFE = 2.4;
  const bonyaZs = [];        // ages (seconds) of the floating Z letters
  let bonyaZTimer = 0;
  // Боня's speech bubble: now and then she offers the 2x coins ad; a tap on it starts the boost
  const BONYA_SPEECH_EVERY = 300, BONYA_SPEECH_FOR = 10;  // every 5 minutes; the bubble stays 10 seconds
  let bonyaSpeechGap = 300, bonyaSpeechLeft = 0, bonyaBoostWas = false, bonyaSpeechPending = false;
  // the windows that cover the screen (settings, progress, appearance, purchase...) pause the bubble clock and hide it;
  // the shop does not, so Боня can still send her message while the shop is open
  function speechMenuOpen() {
    return settingsOpen || rebirthOpen || !!progWin || skinWin || !!premiumWin;
  }
  const BONYA_SNIFF_PERIOD = 0.5, BONYA_SNIFF = 0.12;
  const BONYA_WASH_EVERY = 6, BONYA_WASH_FOR = 2.5, BONYA_WASH_STEP = 0.25;
  const bonyaSprites = {};
  for (const n of ['0', '1', '2', '3', '4', '5', '6']) {
    const im = new Image();
    im.src = 'art/bonya-' + n + '.png?v=17';
    bonyaSprites[n] = im;
  }
  // tap Боня 10 times within 3 s to wake her: she washes for 5 s and then falls asleep again
  const BONYA_WAKE_TAPS = 10, BONYA_WAKE_WINDOW = 3000, BONYA_WAKE_STAY = 5;   // ms, taps, seconds awake
  let bonyaTapTimes = [];
  // 40 taps on Bonya within 10 s: the ad-bonus bubble appears at once
  let bonyaPokeTimes = [];
  function countBonyaPokes(gx, gy) {
    if (!inRect(gx, gy, BONYA_X, BONYA_Y, BONYA_X + 40, BONYA_Y + 24)) return;
    const now = Date.now();
    bonyaPokeTimes = bonyaPokeTimes.filter((t) => now - t < 10000);
    bonyaPokeTimes.push(now);
    if (bonyaPokeTimes.length >= 40) {
      bonyaPokeTimes = [];
      if (adBoost.double <= 0 && !speechMenuOpen()) bonyaSpeechLeft = BONYA_SPEECH_FOR;
    }
  }
  function tapBonya(gx, gy) {
    if (!settings.animBg || !inRect(gx, gy, BONYA_X, BONYA_Y, BONYA_X + 40, BONYA_Y + 24)) return false;
    const now = Date.now();
    bonyaTapTimes = bonyaTapTimes.filter((t) => now - t < BONYA_WAKE_WINDOW);
    bonyaTapTimes.push(now);
    if (bonyaTapTimes.length >= BONYA_WAKE_TAPS && (bonyaT % BONYA_CYCLE) >= BONYA_AWAKE_FOR) {
      bonyaT = BONYA_AWAKE_FOR - BONYA_WAKE_STAY;   // awake for 5 s (washing, then the eyes close) and asleep again
      bonyaZs.length = 0;
      bonyaTapTimes = [];
    }
    return true;
  }
  // the bubble bobs up and down by about a pixel with her breathing, and its tail reaches her head
  function bonyaBubbleBox() {
    const l1 = '2Х МОНЕТЫ ЗА РЕКЛАМУ', l2 = 'МОЖНО НАЖАТЬ';
    const w = Math.max(textWidth(l1, 1), textWidth(l2, 1)) + 8;
    const bob = Math.round(Math.sin(cookT * 8.8));   // 4 times faster than before
    const x0 = Math.max(4, Math.min(316 - w, Math.round(BONYA_X + 30 - w / 2)));
    return [x0, 116 + bob, x0 + w, 140 + bob];
  }
  // a tap on the bubble starts the 2x coins ad boost (the same as the ad in the БЕСПЛАТНО section)
  function tapBonyaBubble(gx, gy) {
    if (bonyaSpeechLeft <= 0 || adBoost.double > 0 || speechMenuOpen()) return false;
    const [x0, y0, x1, y1] = bonyaBubbleBox();
    if (!inRect(gx, gy, x0, y0, x1, y1)) return false;
    const gi = PREMIUM_ITEMS.findIndex((x) => x.kind === 'ad' && x.id === 'double');
    buy('ad', gi);
    bonyaSpeechLeft = 0;
    return true;
  }
  // the sea skin: a fish swims across every 8-12 seconds, and fades in and out like the reindeer
  let fishTimer = 4;
  const fishes = [];   // {t, ax, ay, dir, dy, col}
  // the new year skin: a reindeer with a sleigh flies past every 10-15 seconds
  let deerTimer = 6;
  const deers = [];   // {t, ax, ay, dx, dy}: age and place of each flight
  // the ghost skin: a faded ghost drifts up past the cookie every 10-20 seconds
  let ghostTimer = 8;
  const ghostSprites = [];   // {t, x, y}: age and place of each ghost
  let bonyaT = BONYA_AWAKE_FOR - BONYA_DROWSY;   // start: she closes her eyes now and falls asleep right away
  let cookT = 0;


  // ---------- render ----------
  function coinFrame() {
    if (animT < 0.06) return FRAME.squash;
    if (animT < 0.18) return FRAME.bounce;
    return FRAME.rest;
  }

  function fillRect(x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  }

  // closed-state shop button: light silver frame, dark fill, top right
  function drawShopButton() {
    const x = BTN_X0, y = BTN_Y0;
    const w = BTN_X1 - BTN_X0, h = BTN_Y1 - BTN_Y0;
    fillRect(x, y, w, h, COL.btnFrame);                 // 2 px silver border, symmetric
    fillRect(x + 2, y + 2, w - 4, h - 4, COL.btnFill);
    fillRect(x + 2, y + 2, w - 4, 1, COL.btnHi);
    drawTextBox('МАГАЗИН', 1, x, x + w, y, y + h, COL.btnText);
  }

  // text and price for one row of the current tab
  function rowInfo(i, it) {
    if (tab === 'click' && listLocked('click', i)) return { line1: 'ЗАКРЫТО', line2: 'КУПИ 5 ' + CLICK_UPGRADES[i - 1].name, price: '', can: false };
    if (tab === 'tech' && listLocked('tech', i)) return { line1: 'ЗАКРЫТО', line2: 'КУПИ 5 ' + TECHNIKA[i - 1].name, price: '', can: false };
    if (tab === 'click') {
      const owned = clickOwned[i];
      const p = plan('click', i);
      const amt = BigInt(p.n || 1);     // how many would be bought now: the gain shown is for all of them
      const mult = BigInt(incomeMult()); // rebirths, premium and ad boosts: what a click really gives
      return {
        line1: '+' + fmt(it.add * amt * mult) + ' ЗА КЛИК',
        line2: 'ЕСТЬ ' + owned + ': +' + fmt(it.add * BigInt(owned) * mult) + ' ВСЕГО',
        price: fmt(p.cost),
        can: p.canOne,
      };
    }
    if (tab === 'tech') {
      const owned = techOwned[i];
      if (owned >= TECH_MAX) {
        return {
          line1: '+' + fmt(BigInt(Math.floor(it.rate * owned * techMult(i) * 1)) * BigInt(incomeMult())) + ' В СЕК',   // total this technika brings
          line2: 'МАКС',
          price: '',
          can: false,
        };
      }
      const p = plan('tech', i);
      const amt = p.n || 1;             // how many would be bought now: the gain shown is for all of them
      return {
        line1: '+' + fmt(BigInt(Math.floor(it.rate * amt * techMult(i) * 1)) * BigInt(incomeMult())) + ' В СЕК',
        line2: 'ЕСТЬ ' + owned + ': +' + fmt(BigInt(Math.floor(it.rate * owned * techMult(i) * 1)) * BigInt(incomeMult())) + ' В СЕК',
        price: fmt(p.cost),
        can: p.canOne,
      };
    }
    if (tab === 'prok' && prokSel === null) {
      // one clickable row per technika: how many of its 4 upgrades are bought
      const j = i;
      const cnt = PROK_BY_TECH[j].filter((g) => prokOwned[g]).length;
      return {
        line1: 'КУПЛЕНО: ' + cnt + ' ИЗ 4',
        line2: 'ЖМИ, ЧТОБЫ ОТКРЫТЬ',
        price: '',                  // no price on this row: the whole row opens the list
        can: false,
      };
    }
    if (tab === 'prok') {
      const g = PROK_BY_TECH[prokSel][i];
      const owned = prokOwned[g];
      const unlocked = prokUnlocked(g);
      const price = priceNow('prok', g);
      let line2 = 'ДОХОД 2 РАЗА';
      if (owned) line2 = 'КУПЛЕНО: ДОХОД 2 РАЗА';
      else if (!prokTechReady(g)) line2 = 'НУЖЕН УР. ' + PROK_TECH_LEVEL[it.level] + ' ТЕХНИКИ';
      else if (!unlocked) line2 = 'СНАЧАЛА ПРЕДЫДУЩИЙ';
      const SHORT = { 'ШОКОЛАДНЫЙ ФОНТАН': 'ФОНТАН', 'ФАБРИКА ПРЯНИКОВ': 'ФАБРИКА' };   // keeps the price on the same line
      return {
        line1: SHORT[TECHNIKA[it.tech].name] || TECHNIKA[it.tech].name,
        line2,
        price: owned ? 'ЕСТЬ' : fmt(price),
        can: !owned && unlocked && coins >= price,
      };
    }
    // premium and ad rows
    if (it.kind === 'soon') return { line1: it.line, line2: 'ЖДИТЕ ОБНОВЛЕНИЙ', price: '', can: false };
    let line2;
    if (it.kind === 'ad') {
      line2 = adBoost[it.id] > 0 ? 'ОСТАЛОСЬ ' + Math.ceil(adBoost[it.id] / 60) + ' МИН' : 'ЗА ПРОСМОТР: 10 МИНУТ';
    } else {
      line2 = premiumOwned[it.id] ? 'КУПЛЕНО' : 'СКОРО: ОПЛАТА ЯНДЕКС';   // placeholder until payments exist
    }
    return { line1: it.line, line2, price: it.price, can: it.kind === 'ad' };
  }

  function drawPanel() {
    // body slides in from the right
    const bodyX = PX0 + (1 - panelT) * (W - PX0);
    const bodyW = PX1 - PX0;
    if (panelT > 0) {
      fillRect(bodyX, 0, bodyW, H, COL.panel);
      fillRect(bodyX, 0, 1, H, COL.panelEdge);
    }
    if (panelT < 0.99) {
      // closed header, top right (also the way to open)
      if (panelT < 0.5) drawShopButton();
      return;
    }
    // tabs
    // every element in the shop sits 6 px in from the left and right edges
    TABS.forEach((t, i) => {
      const [x0, y0, x1, y1] = tabRect(i);
      fillRect(x0, y0, x1 - x0, y1 - y0, tab === t.id ? COL.tabOn : COL.tabOff);
      drawTextBox(t.label, 1, x0, x1, y0, y1, COL.text);
      // blinking 4x4 dot in the top-right corner when there is something new in this tab
      if (tabHasNew(t.id) && Math.sin(cookT * 6) > 0) {
        const dx = x1 - 6, dy = y0 + 2;
        fillRect(dx + 1, dy, 2, 4, COL.gold);
        fillRect(dx, dy + 1, 4, 2, COL.gold);
      }
    });

    if (tab === 'premium') {
      PREMIUM_SECTIONS.forEach((sct, i) => {
        const [x0, y0, x1, y1] = sectionRect(i);
        fillRect(x0, y0, x1 - x0, y1 - y0, premiumSection === sct.id ? COL.tabOn : COL.tabOff);
        drawTextBox(sct.label, 1, x0, x1, y0, y1, COL.text);
      });
    }
    // list (clipped)
    ctx.save();
    ctx.beginPath();
    ctx.rect(PX0, listTop(), PX1 - PX0, listBottom() - listTop());
    ctx.clip();
    const list = items();
    if (tab === 'premium' && premiumSection === 'skins' && list.length === 0) drawTextBox('ТОВАРОВ НЕТ', 1, PX0 + 6, PX1 - 6, listTop() + 14, listTop() + 26, dimTone());
    list.forEach((it, i) => {
      const y = listTop() + i * ROW_H - Math.round(scroll);
      if (y + ROW_H < listTop() || y > listBottom()) return;
      const row = rowInfo(i, it);
      fillRect(PX0 + 6, y, PX1 - PX0 - 12, ROW_H - 3, row.can ? COL.rowHi : COL.row);
      if (row.can) fillRect(PX0 + 6, y, 2, ROW_H - 3, accent());   // affordable: bar on the left, not only colour
      // three lines: name; what one purchase gives; status; price on the right
      drawText(it.name, 1, PX0 + 10, y + 2, COL.text, 'left');
      drawText(row.line1, 1, PX0 + 10, y + 11, accent(), 'left');
      drawText(row.line2, 1, PX0 + 10, y + 20, dimTone(), 'left');
      drawText(row.price, 1, PX1 - 12 - textWidth(row.price, 1), y + 11, row.can ? accent() : dimTone(), 'left');
    });
    ctx.restore();

    // scrollbar
    const max = maxScroll();
    if (max > 0) {
      const trackH = listBottom() - listTop();
      const content = list.length * ROW_H;
      const thumbH = Math.max(12, Math.round((trackH * trackH) / content));
      // top of the list = thumb at the top; dragging down moves the thumb down
      const thumbY = listTop() + Math.round((trackH - thumbH) * (scroll / max));
      fillRect(PX1 - 4, listTop(), 3, trackH, COL.track);
      fillRect(PX1 - 4, thumbY, 3, thumbH, COL.thumb);
    }

    // close button
    fillRect(PX0 + 6, closeY(), PX1 - PX0 - 12, 14, COL.row);
    const backLabel = tab === 'prok' && prokSel !== null ? 'НАЗАД' : 'ЗАКРЫТЬ';
    drawTextBox(backLabel, 1, PX0 + 6, PX1 - 6, closeY(), closeY() + 14, COL.text);

    // buy-amount row, only where a purchase can be repeated
    if (hasBuyRow()) {
      BUY_MODES.forEach((b, i) => {
        const [x0, y0, x1, y1] = buyRect(i);
        const on = buyMode === b.mode;
        fillRect(x0, y0, x1 - x0, y1 - y0, on ? COL.tabOn : COL.tabOff);
        drawTextBox(b.label, 1, x0, x1, y0, y1, COL.text);
      });
    }
  }

  function render() {
    ctx.save();
    if (shakeT > 0) {
      ctx.translate(Math.round(Math.random() * 2 - 1), Math.round(Math.random() * 2 - 1));
    }
    if (kitchenImg) {
      ctx.drawImage(kitchenImg, 0, 0);
    } else {
      fillRect(0, 0, W, H, COL.bg);                       // fallback while the image loads
      fillRect(0, FLOOR_Y, W, H - FLOOR_Y, COL.floor);
    }
    const cookIdx = settings.animBg ? ((Math.floor(cookT * COOK_FPS) % 4) + 4) % 4 : 0;   // off = still frame; never negative
    const cookFrame = cookFrames[cookIdx];
    if (cookFrame.complete && cookFrame.naturalWidth) ctx.drawImage(cookFrame, COOK_X, COOK_Y);
    // Боня sleeps by the cake; her ear flicks every 10 s (only with the animated background on)
    const phase = bonyaT % BONYA_CYCLE;
    const bonyaAwake = settings.animBg && phase < BONYA_AWAKE_FOR;
    let bonyaKey = '1';                                   // asleep (also the still picture with the animation off)
    if (bonyaAwake) {
      const a = phase;                                    // seconds since she woke up
      if (phase >= BONYA_AWAKE_FOR - BONYA_DROWSY) bonyaKey = '6';   // the last 1.5 s before sleep: eyes half closed
      else if (a % BONYA_WASH_EVERY < BONYA_WASH_FOR) bonyaKey = Math.floor(a / BONYA_WASH_STEP) % 2 ? '5' : '4';
      else bonyaKey = '0';                                // awake, eyes open
    } else if (settings.animBg) {
      if (bonyaT % BONYA_PERIOD < BONYA_TWITCH) bonyaKey = '2';        // ear flick
      else if (bonyaT % BONYA_SNIFF_PERIOD < BONYA_SNIFF) bonyaKey = '3'; // nose sniff
    }
    const bonyaFrame = bonyaSprites[bonyaKey];
    if (bonyaFrame.complete && bonyaFrame.naturalWidth) ctx.drawImage(bonyaFrame, BONYA_X, BONYA_Y);
  // the speech bubble: 2x coins for the ad, tap it to start the boost
  function drawBonyaBubble() {
    const [x0, y0, x1, y1] = bonyaBubbleBox();
    fillRect(x0, y0, x1 - x0, y1 - y0, COL.panel);
    fillRect(x0, y0, x1 - x0, 1, accent());
    fillRect(x0, y1 - 1, x1 - x0, 1, accent());
    fillRect(x0, y0, 1, y1 - y0, accent());
    fillRect(x1 - 1, y0, 1, y1 - y0, accent());
    const tx = Math.round((x0 + x1) / 2);
    fillRect(BONYA_X + 31, y1, 3, Math.max(2, BONYA_Y - y1), accent());   // the tail reaches down to her ears
    drawText('2Х МОНЕТЫ ЗА РЕКЛАМУ', 1, tx, y0 + 4, accent(), 'center');
    drawText('МОЖНО НАЖАТЬ', 1, tx, y0 + 13, COL.text, 'center');
  }
  // the Z letters: a little pixel Z rising from her head and fading out
    for (const age of bonyaZs) {
      const life = age / BONYA_Z_LIFE;
      const zx = BONYA_X + 29 + Math.floor(life * 4), zy = BONYA_Y - 1 - Math.floor(life * 14);
      const zRows = ['#####', '...#.', '..#..', '.#...', '#####'];   // a 5x5 pixel Z, 1 px per cell
      ctx.globalAlpha = 1 - life;
      ctx.fillStyle = COL.text;
      zRows.forEach((row, j) => { for (let i = 0; i < 5; i++) if (row[i] === '#') ctx.fillRect(zx + i, zy + j, 1, 1); });
      ctx.globalAlpha = 1;
    }
    if (!FRAME) { ctx.restore(); return; }   // sprite still loading

    const cx = Math.round(coinX());
    // counter: small label above a big number (the label fits the half-width shop layout)
    // fixed rows: label at y 28 (room for the shop button above it), number at y 36

    // shadow + coin
    const frame = coinFrame();
    const newFx = NEW_FX_IDS.includes(skinId);
    if (newFx) { ctx.save(); ctx.shadowColor = skinGlow(skinId, 0.6); ctx.shadowBlur = 8; }
    const neon = skinId === 'neon';
    const tube = skinId === 'neontube';
    if (tube) {
      // the neon tube: its colour slowly moves from cyan to magenta, flickers, and every 4 s it dims for a moment
      const cyc = 0.5 + 0.5 * Math.sin(cookT * 0.8);
      const dim = (cookT % 4.3) < 0.12 ? 0.25 : 1;
      const flick = (0.8 + 0.2 * Math.sin(cookT * 23)) * dim;
      const r = Math.round(255 * cyc), gr = Math.round(255 * (1 - cyc) + 60 * cyc), b = Math.round(230 * (1 - cyc) + 220 * cyc);
      ctx.save();
      ctx.shadowColor = 'rgba(' + r + ', ' + gr + ', ' + b + ', ' + (0.7 * flick).toFixed(2) + ')';
      ctx.shadowBlur = 8 + 4 * cyc;
    }
    const hot = skinId === 'volcano';
    if (neon) {
      // the neon glow pulses; a few sparks circle the cookie
      const pulse = 0.5 + 0.5 * Math.sin(cookT * 3);
      ctx.save();
      ctx.shadowColor = (skinId === 'neontube' ? 'rgba(0, 255, 230, ' : 'rgba(255, 60, 220, ') + (0.45 + 0.4 * pulse).toFixed(2) + ')';
      ctx.shadowBlur = 4 + 6 * pulse;
    }
    if (hot) {
      // the lava glow flickers; sparks rise from the cookie
      const flick = 0.5 + 0.5 * Math.sin(cookT * 11) * Math.sin(cookT * 5);
      ctx.save();
      ctx.shadowColor = 'rgba(255, 130, 20, ' + (0.65 + 0.35 * flick).toFixed(2) + ')';
      ctx.shadowBlur = 6 + 12 * flick;
    }
    const gSway = skinId === 'ghost' ? Math.round(Math.sin(cookT * 1.8) * 2) : 0;   // the ghost cookie sways 2 px to each side
    ctx.drawImage(frame, Math.round(cx - frame.width / 2 - frame.shiftX) + gSway, Math.round(COIN_Y - frame.height / 2 - frame.shiftY));
    if (newFx) {
      ctx.restore();
      fxMask = frame.alpha ? { data: frame.alpha, w: frame.width, h: frame.height, ox: Math.round(cx - frame.width / 2 - frame.shiftX), oy: Math.round(COIN_Y - frame.height / 2 - frame.shiftY) } : null;
      drawNewFx(skinId, cx, COIN_Y, 46, 40, (dx) => ctx.drawImage(frame, Math.round(cx - frame.width / 2 - frame.shiftX) + gSway + dx, Math.round(COIN_Y - frame.height / 2 - frame.shiftY)));
      fxMask = null;
    }
    if (tube) {
      ctx.restore();
      // electric arcs jump along the tube: a short white zigzag, about every 2.2 s, for 0.15 s
      const arcT = cookT % 2.2;
      if (arcT < 0.15) {
        const a0 = Math.floor(cookT / 2.2) * 2.39;
        for (let k = 0; k < 9; k++) {
          const a = a0 + k * 0.14;
          const rr = 34 + (k % 2 ? 2.5 : -1.5);
          fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(COIN_Y + Math.sin(a) * rr), 2, 2, k % 3 ? '#FFFFFF' : '#7DF9FF');
        }
      }
    }
    if (hot) {
      ctx.restore();
      // embers: 7 sparks rising from the cookie, orange and yellow, fading out at the top
      for (let i = 0; i < 7; i++) {
        const life = ((cookT * 0.8 + i * 0.143) % 1);
        const ex = Math.round(cx - 42 + i * 14 + Math.sin(cookT * 5 + i * 2) * 3);
        const ey = Math.round(COIN_Y + 40 - life * 84);
        fillRect(ex, ey, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1, i % 2 ? '#FFD35A' : '#FF6A1A');
      }
      // smoke: grey puffs rising from the top of the cookie, drifting and fading
      for (let i = 0; i < 4; i++) {
        const life = ((cookT * 0.35 + i * 0.25) % 1);
        const sx = Math.round(cx - 20 + i * 12 + Math.sin(cookT * 2 + i) * 4 + life * 6);
        const sy = Math.round(COIN_Y - 46 - life * 26);
        ctx.globalAlpha = 0.5 * (1 - life);
        fillRect(sx, sy, 3 + (i % 2), 2, '#6B5E66');
        ctx.globalAlpha = 1;
      }
      // little flame tongues flicker on the lower edge
      for (let i = 0; i < 5; i++) {
        const fl = Math.sin(cookT * 9 + i * 2.3);
        if (fl > -0.2) {
          const fx = Math.round(cx - 36 + i * 17), fy = Math.round(COIN_Y + 34 - (fl > 0.5 ? 2 : 1));
          fillRect(fx, fy, 2, 2, fl > 0.5 ? '#FFD35A' : '#FF6A1A');
        }
      }
    }
    if (neon) {
      ctx.restore();
      for (let i = 0; i < 6; i++) {
        const a = cookT * 1.4 + (i * 2 * Math.PI) / 6;
        const sx = Math.round(cx + Math.cos(a) * 46), sy = Math.round(COIN_Y + Math.sin(a) * 40);
        fillRect(sx, sy, 2, 2, ['#FF5FDC', '#7DF9FF', '#FFFFFF'][i % 3]);
      }
      // twinkling stars around the glow
      for (let i = 0; i < 4; i++) {
        const tw = Math.sin(cookT * 4 + i * 1.7);
        if (tw > 0.3) {
          const tx = Math.round(cx + [-58, 56, -50, 50][i]), ty = Math.round(COIN_Y + [-44, -36, 40, 44][i]);
          fillRect(tx, ty, 1, 1, '#FFFFFF');
          fillRect(tx - 1, ty, 3, 1, '#FFFFFF');
          fillRect(tx, ty - 1, 1, 3, '#FFFFFF');
        }
      }
    }

    if (skinId === 'newyear') drawSnowFull();
    if (skinId === 'sea') drawFishes();
    if (skinId === 'ghost' || skinId === 'halloween') drawGhosts();
    if (skinId === 'newyear') drawDeers();
    // Боня's speech bubble is drawn over the cookie, so it stays readable
    // sparks
    for (const s of sparks) fillRect(Math.round(s.x), Math.round(s.y), 2, 2, bodyTone());   // gingerbread crumbs, like the +N

    // popups
    for (const p of popups) {
      ctx.globalAlpha = 0.6 * Math.max(0, 1 - p.t / 0.8);   // 60% opacity, fading out
      drawGingerText(p.text, 2, Math.round(p.x), Math.round(p.y));
      ctx.globalAlpha = 1;
    }

    // the hint: yellow like the bonus lines; shown before the first tap and after a minute without taps
    // the hint sits on the floor right under the cookie
    if ((!everTapped || animT > 60) && !panelOpen) drawText('КЛИКАЙ', 1, cx, 149, accent(), 'center');   // hidden while the shop is open
    // the appearance button at the bottom, where the hint used to be (only while the shop is closed)
    if (!panelOpen) {
      drawTopButton(SKIN_BTN_LABEL, SKIN_BTN[0], SKIN_BTN[2], SKIN_BTN[1], SKIN_BTN[3]);
    }

    // top-row buttons first, so the open shop panel covers them where they overlap
    // the counter is drawn after all the effects, so no feather or sparkle covers the numbers
    drawText('ПРЯНИКОВ', 1, cx, COUNTER_LABEL_Y, COL.text, 'center');
    drawText(String(coins), 2, cx, COUNTER_NUM_Y, COL.text, 'center');
    // small line under the counter: automatic coins per second
    drawSmallText('+' + String(Math.floor(autoPerSec())) + ' В СЕК', cx, COUNTER_AUTO_Y, '#ffffff');   // whole numbers only: the font has no '.'
    drawSettingsButton();
    drawTopButton('ПРОГРЕСС', ...topRect('achievements'));
    if (dailyCanClaim() && Math.sin(cookT * 6) > 0) {
      const [ax0, ax1, ay0] = topRect('achievements');   // topRect gives [x0, x1, y0, y1]
      blinkDot(ax1 - 6, ay0 + 2);
    }
    drawTopButton(rebirthLabel(), ...topRect('rebirth'));
    if (cycleEarned >= rebirthNeed() && Math.sin(cookT * 6) > 0) {
      const [rx0, rx1, ry0] = topRect('rebirth');   // topRect gives [x0, x1, y0, y1]
      blinkDot(rx1 - 6, ry0 + 2);
    }
    drawPanel();
    // Боня's bubble is drawn over the shop, so she can still send her message while it is open
    if (bonyaSpeechLeft > 0 && adBoost.double <= 0 && !speechMenuOpen()) drawBonyaBubble();
    if (settingsOpen) drawSettings();
    if (rebirthOpen) drawRebirth();
    if (progWin) drawProgWin();
    if (skinWin) drawSkinWin();
    if (premiumWin) drawPremiumWin();
    if (ev && ev.type === 'appetite') drawAppetite();
    drawBoostLine();
    if (boostMenuOpen) drawBoostMenu();
    ctx.restore();
  }

  // ---------- music: gapless loop via Web Audio, starts on the first tap ----------
  // Needs the game served over http(s); file:// blocks fetch of the track.
  // one shared audio context, created on the first tap (browsers need a user gesture)
  let audioCtx = null;
  let musicGain = null;
  let sfxGain = null;
  let musicStarted = false;
  function ensureAudio() {
    if (audioCtx) return audioCtx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
      musicGain = audioCtx.createGain();
      musicGain.gain.value = settings.music;
      musicGain.connect(audioCtx.destination);
      sfxGain = audioCtx.createGain();
      sfxGain.gain.value = settings.sound;
      sfxGain.connect(audioCtx.destination);
    } catch (err) {
      audioCtx = null;   // no audio support: the game still works, silently
    }
    return audioCtx;
  }
  // playlist: all 11 tracks, a random one (never the same twice in a row) every 10 minutes,
  // with an equal-power crossfade so the change is smooth. Each track is a seamless 30 s loop.
  const TRACKS = [
    'music/00_glavnaya.wav', 'music/01_utro.wav', 'music/02_monetny.wav', 'music/03_pryanik.wav',
    'music/04_yarmarka.wav', 'music/05_nochnaya.wav', 'music/06_ura.wav', 'music/07_tihiy.wav',
    'music/08_zolotaya.wav', 'music/09_pechenyushki.wav', 'music/10_bolshaya.wav',
  ];
  const TRACK_PERIOD = 240;     // seconds between changes (4 minutes)
  const TRACK_FADE = 4;         // seconds of crossfade
  const FADE_IN = new Float32Array(64);
  const FADE_OUT = new Float32Array(64);
  for (let i = 0; i < 64; i++) {
    const t = i / 63;
    FADE_IN[i] = Math.sin(t * Math.PI / 2);    // equal power: no dip in loudness in the middle
    FADE_OUT[i] = Math.cos(t * Math.PI / 2);
  }
  const trackCache = {};        // decoded buffers, loaded once
  let trackIdx = -1;
  let trackSrc = null;
  let trackGain = null;
  let musicT = 0;               // seconds since the last change
  function loadTrack(i) {
    if (!trackCache[i]) {
      trackCache[i] = fetch(TRACKS[i])
        .then((r) => r.arrayBuffer())
        .then((buf) => audioCtx.decodeAudioData(buf));
    }
    return trackCache[i];
  }
  function playTrack(i, fade) {
    const ctx = audioCtx;
    loadTrack(i).then((buf) => {
      const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.setValueCurveAtTime(FADE_IN, now, fade);
      src.connect(g);
      g.connect(musicGain);
      src.start(now);
      if (trackSrc) {                       // the old track fades out under the new one
        trackGain.gain.setValueCurveAtTime(FADE_OUT, now, fade);
        trackSrc.stop(now + fade + 0.1);
      }
      trackSrc = src;
      trackGain = g;
    }).catch(() => {});
  }
  function pickNextTrack() {
    let i;
    do { i = Math.floor(Math.random() * TRACKS.length); } while (i === trackIdx);
    return i;
  }
  function startMusicOnce() {
    if (musicStarted) return;
    musicStarted = true;
    const ctx = ensureAudio();
    if (!ctx) return;
    trackIdx = 0;                           // the main theme starts the game
    playTrack(trackIdx, 1);
  }

  // short square-wave blip through the sound slider
  function blip(freq, dur, when) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function sfxClick() { blip(880, 0.06); }
  function sfxBuy() { blip(660, 0.09); blip(990, 0.12, 0.08); }

  // ---------- saving: progress and settings in localStorage (fails quietly if unavailable) ----------
  const SAVE_KEY = 'kucha-pryanikov-save-v1';
  function saveGame() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 2,
        coins: coins.toString(),
        clickOwned,
        techOwned,
        prokOwned,
        premiumOwned,
        adWatched,
        rebirths,
        cycleEarned: cycleEarned.toString(),
        totalEarned: totalEarned.toString(),
        playerClicks,
        playSec: Math.floor(playSec),
        dailyDay,
        dailyDate,
        skinOwned,
        skinAdViews,
        dailySec: Math.floor(dailySec),
        dailySecDate,
        totalBought,
        settings,
      }));
    } catch (err) {
      // storage blocked or full: keep playing without saving
    }
  }
  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.skinOwned && typeof s.skinOwned === 'object') {
        for (const k of SKINS) skinOwned[k.id] = !!s.skinOwned[k.id] || k.id === 'classic';
        if (s.premiumOwned && (s.premiumOwned.skin_neon || s.premiumOwned.skins_all)) skinOwned.neon = true;
        if (s.premiumOwned && (s.premiumOwned.skin_volcano || s.premiumOwned.skins_all)) skinOwned.volcano = true;
        if (s.premiumOwned && (s.premiumOwned.skin_neontube || s.premiumOwned.skins_all)) skinOwned.neontube = true;
        if (s.premiumOwned) {
          for (const id of PREMIUM_SKIN_IDS) {
            if (s.premiumOwned['skin_' + id]) skinOwned[id] = true;
          }
          if (s.premiumOwned.skins_all) unlockAllPremiumSkins();
          for (const it of PREMIUM_ITEMS) if (it.kind === 'premium' && s.premiumOwned[it.id]) premiumOwned[it.id] = true;
        }
      }
      if (s.skinAdViews && typeof s.skinAdViews === 'object') {
        for (const k of SKINS) skinAdViews[k.id] = Math.max(0, Math.floor(Number(s.skinAdViews[k.id]) || 0));
      }
      coins = BigInt(s.coins || '0');
      if (Array.isArray(s.clickOwned) && s.clickOwned.length === clickOwned.length) clickOwned = s.clickOwned.map(Number);
      if (Array.isArray(s.techOwned) && s.techOwned.length === techOwned.length) techOwned = s.techOwned.map(Number);
      if (Array.isArray(s.prokOwned) && s.prokOwned.length === prokOwned.length) prokOwned = s.prokOwned.map(Boolean);
      if (s.adWatched) adWatched = { double: !!s.adWatched.double, discount: !!s.adWatched.discount };
      rebirths = Math.max(0, Math.floor(Number(s.rebirths) || 0));
      totalEarned = BigInt(s.totalEarned || '0');
      playerClicks = Math.max(0, Math.floor(Number(s.playerClicks) || 0));
      playSec = Math.max(0, Number(s.playSec) || 0);
      dailyDay = Math.min(7, Math.max(0, Math.floor(Number(s.dailyDay) || 0)));
      dailyDate = typeof s.dailyDate === 'string' ? s.dailyDate : '';
      dailySec = Math.max(0, Number(s.dailySec) || 0);
      dailySecDate = typeof s.dailySecDate === 'string' ? s.dailySecDate : '';
      totalBought = Math.max(0, Math.floor(Number(s.totalBought) || 0));
      cycleEarned = BigInt(s.cycleEarned || '0');
      if (s.premiumOwned) {
        premiumOwned = {
          double: !!s.premiumOwned.double,
          triple: !!s.premiumOwned.triple,
          autoclick: !!s.premiumOwned.autoclick,
          rebirth2: !!s.premiumOwned.rebirth2,
          discount: !!s.premiumOwned.discount,
          skin_neon: !!s.premiumOwned.skin_neon,
          skins_all: !!s.premiumOwned.skins_all,
          skin_volcano: !!s.premiumOwned.skin_volcano,
          skin_neontube: !!s.premiumOwned.skin_neontube,
          skin_crystal: !!s.premiumOwned.skin_crystal,
          skin_royal: !!s.premiumOwned.skin_royal,
          skin_ghost: !!s.premiumOwned.skin_ghost,
          skin_rainbow: !!s.premiumOwned.skin_rainbow,
          skin_starry: !!s.premiumOwned.skin_starry,
        };
      }
      if (s.settings) {
        settings.sound = Math.min(1, Math.max(0, Number(s.settings.sound) || 0));
        settings.music = Math.min(1, Math.max(0, Number(s.settings.music) || 0));
        settings.colorblind = !!s.settings.colorblind;
        settings.animBg = s.settings.animBg !== false;
        settings.shake = s.settings.shake === true;
        // the chosen skin is remembered, as long as it is still owned
        if (s.settings.skin && skinOwned[s.settings.skin] && SKINS.some((k) => k.id === s.settings.skin)) { settings.skin = s.settings.skin; loadSkin(settings.skin); }
      }
    } catch (err) {
      // no save or damaged data: start fresh
    }
  }
  loadGame();
  setInterval(saveGame, 5000);
  window.addEventListener('pagehide', saveGame);

  // ---------- loop ----------
  // the start screen: 1.5 s after each load, with the logo, the game's name and the developer
  let splashT = 2.5;
  function drawSplash() {
    const SPLASH_T = 2.5;
    const el = SPLASH_T - splashT;                       // seconds since the start screen began
    const fade = splashT < 0.3 ? splashT / 0.3 : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    // background: dark violet with pixel bands that drift slowly
    fillRect(0, 0, W, H, '#120E22');
    for (let y = 0; y < H; y += 6) {
      const shift = Math.round(el * 14) % 6;
      fillRect(0, y + shift, W, 3, y % 12 === 0 ? '#1A1433' : '#171230');
    }
    // confetti: little squares falling down in different colours
    const cols = ['#FFD84A', '#FF5FDC', '#7DF9FF', '#8CFF7A', '#FF8A3D'];
    for (let i = 0; i < 26; i++) {
      const sx = (i * 37) % W;
      const fy = ((el * (22 + (i % 5) * 6) + i * 19) % (H + 10)) - 5;
      fillRect(sx, Math.round(fy), 2, 2, cols[i % cols.length]);
    }
    // the logo drops in with a bounce, and glows gold
    const drop = el < 0.5 ? Math.pow(1 - el / 0.5, 2) * -70 : Math.sin((el - 0.5) * 9) * Math.max(0, 1 - (el - 0.5)) * 4;
    const glow = 0.5 + 0.5 * Math.sin(el * 8);
    ctx.shadowColor = 'rgba(255, 200, 60, ' + (0.5 + 0.4 * glow).toFixed(2) + ')';
    ctx.shadowBlur = 10 + 6 * glow;
    if (cookieImg && cookieImg.complete && cookieImg.naturalWidth) ctx.drawImage(cookieImg, 160 - 74, Math.round(4 + drop), 148, 148);
    ctx.shadowBlur = 0;
    // the title appears letter by letter
    const title = 'КУЧА ПРЯНИКОВ';
    const shown = Math.min(title.length, Math.floor(Math.max(0, el - 0.3) / 0.07));
    if (shown > 0) drawText(title.slice(0, shown), 1, 160, 156, accent(), 'center');
    // the developer's line comes a little later
    if (el > 0.8) drawText('РАЗРАБОТЧИК: CR4YNE', 1, 160, 166, dimTone(), 'center');
    // a pixel loading bar that fills over the whole start screen
    const bw = 120, bx = 160 - bw / 2, by = 177;
    fillRect(bx - 1, by - 1, bw + 2, 4, '#2A2448');
    fillRect(bx, by, Math.round(bw * Math.min(1, el / SPLASH_T)), 2, accent());
    ctx.restore();
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));   // a frame timestamp can be slightly earlier than `last` on load
    last = now;
    update(dt);
    render();
    if (splashT > 0) drawSplash();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // small hook for checks in the browser console
  window.KUCHA = {
    version: VERSION,
    get coins() { return coins.toString(); },
    get owned() { return { click: clickOwned.slice(), tech: techOwned.slice(), prok: prokOwned.slice() }; },
    get perSec() { return autoPerSec(); },
    get rebirths() { return rebirths; },
    event(type, pies) { if (type === 'appetite') ev = { type: 'appetite', t: 0, pies: pies !== false }; if (type === 'quest') ev = { type: 'quest', t: 60, taps: 0, done: null }; if (type === 'minute') minuteLeft = 60; },
    get menus() { return { shop: panelOpen, settings: settingsOpen, rebirth: rebirthOpen, progress: progWin ? progWin.tab : null, premium: !!premiumWin }; },
    get glaze() { return { click: glazeClick, tech: glazeTech, name: glazeName }; },
    get questBoost() { return questBoost; },
    get minuteLeft() { return minuteLeft; },
    get ev() { return ev ? { type: ev.type, t: ev.t, taps: ev.taps, done: ev.done, pies: ev.pies } : null; },
    get mult() { return incomeMult(); },
    get cycleEarned() { return cycleEarned.toString(); },
  };
})();
