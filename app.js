// --- CONFIGURATION ---
// คราวนี้เราแค่ระบุ Prefix ของตอนนั้นๆ แล้วระบบจะวิ่งหา 01-99 ให้เองครับ
const gameDatabase = {
    "ep2": {
        name: "Episode 2: 5th Avenue",
        prefix: "ep2",
        startCard: "ep2_05", // การ์ดเริ่มต้นที่จะหงายบนโต๊ะให้เลย
    }
    // ถ้ามี ep3 ในอนาคต ก็เพิ่มตรงนี้ได้เลย เช่น prefix: "ep3"
};

let currentDraggedCard = null;
let allCardsMap = {}; // เก็บข้อมูลการ์ดทั้งหมดในเกม

// --- INITIALIZATION ---
window.onload = () => {
    const epList = document.getElementById('episode-list');
    for (const [epId, epData] of Object.entries(gameDatabase)) {
        const btn = document.createElement('button');
        btn.className = 'ep-btn';
        btn.innerText = `เล่น ${epData.name}`;
        btn.onclick = () => loadEpisode(epId);
        epList.appendChild(btn);
    }
};

// --- CORE: ระบบวนหาไฟล์อัตโนมัติ ---
async function scanForCards(prefix) {
    const validCards = [];
    
    // สร้างลิสต์เลข 01 ถึง 99 และตัวอักษรนิดหน่อยเผื่อไว้
    const possibleSuffixes = Array.from({length: 99}, (_, i) => String(i + 1).padStart(2, '0'));
    ['A','B','C','D','E','F'].forEach(l => possibleSuffixes.push(l));

    // ฟังก์ชันเช็คว่าโหลดรูปติดไหม
    const checkImageExists = (url) => new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });

    // วนเช็คทุกความเป็นไปได้ แบบขนาน (Parallel) เพื่อความรวดเร็ว
    const promises = possibleSuffixes.map(async (suffix) => {
        const id = `${prefix}_${suffix}`;
        let frontExt = null;

        // ลองหาหน้าการ์ด
        if (await checkImageExists(`images/${id}.jpg`)) frontExt = 'jpg';
        else if (await checkImageExists(`images/${id}.png`)) frontExt = 'png';

        if (frontExt) {
            // ถ้าเจอหน้าการ์ด ให้ลองหาหลังการ์ดต่อ
            let backExt = frontExt; // ค่าเริ่มต้นให้เป็นสกุลเดียวกับด้านหน้า
            if (await checkImageExists(`images/${id}b.jpg`)) backExt = 'jpg';
            else if (await checkImageExists(`images/${id}b.png`)) backExt = 'png';

            return { id, frontExt, backExt };
        }
        return null;
    });

    const results = await Promise.all(promises);
    return results.filter(r => r !== null); // คืนค่าเฉพาะการ์ดที่มีไฟล์อยู่จริง
}

async function loadEpisode(epId) {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('loading-screen').classList.remove('hidden'); // โชว์หน้าโหลด

    const epData = gameDatabase[epId];
    
    // สั่งให้ระบบสแกนหาไฟล์
    const foundCards = await scanForCards(epData.prefix);

    const waitingArea = document.getElementById('waiting-area');
    const playArea = document.getElementById('play-area');
    waitingArea.innerHTML = '';
    playArea.innerHTML = '';
    document.getElementById('discard-list').innerHTML = '';
    allCardsMap = {}; // ล้างข้อมูลเก่า

    // สร้างการ์ดทั้งหมดที่สแกนเจอ
    foundCards.forEach(cardData => {
        const cardEl = createCardElement(cardData);
        allCardsMap[cardData.id] = cardEl;

        if (cardData.id === epData.startCard) {
            playArea.appendChild(cardEl);
            cardEl.classList.add('flipped');
        } else {
            waitingArea.appendChild(cardEl);
        }
    });

    setupDragAndDrop();

    // ปิดหน้าโหลด แล้วเข้าเกม
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
    if (foundCards.length === 0) {
        alert("ไม่พบไฟล์รูปการ์ดเลยครับ! กรุณาตรวจสอบว่าอัปโหลดโฟลเดอร์ชื่อ 'images' แล้ว และตั้งชื่อไฟล์ถูกต้อง (เช่น ep2_05.jpg)");
    }
}

function goHome() {
    document.getElementById('welcome-screen').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
}

// --- CARD CREATION ---
function createCardElement(cardData) {
    const card = document.createElement('div');
    card.className = 'card';
    card.id = `card-${cardData.id}`;
    card.draggable = true;
    // ฝัง ID ไว้ในตัวแปร HTML เพื่อให้ดึงง่ายๆ
    card.dataset.realId = cardData.id; 

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    const front = document.createElement('div');
    front.className = 'card-front';
    // เพิ่ม onerror ไว้กันเหนียว
    front.innerHTML = `<img src="images/${cardData.id}.${cardData.frontExt}" alt="${cardData.id} Front" onerror="this.alt='Image Error'">`;

    const back = document.createElement('div');
    back.className = 'card-back';
    back.innerHTML = `<img src="images/${cardData.id}b.${cardData.backExt}" alt="${cardData.id} Back">`;

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    card.ondblclick = () => { card.classList.toggle('flipped'); };

    card.addEventListener('dragstart', (e) => {
        currentDraggedCard = card;
        card.classList.add('dragging');
    });
    
    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        currentDraggedCard = null;
    });

    return card;
}

// --- DRAG AND DROP & DISCARD ---
function setupDragAndDrop() {
    const dropZones = document.querySelectorAll('.drop-zone');

    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault(); // จำเป็นต้องมีเพื่อให้ drop ทำงาน
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (currentDraggedCard) {
                if (zone.id === 'trash-area') {
                    discardCard(currentDraggedCard);
                } else {
                    zone.appendChild(currentDraggedCard);
                }
            }
        });
    });
}

function discardCard(card) {
    const realId = card.dataset.realId;
    
    // เอาการ์ดไปซ่อน (ไม่ได้ลบทิ้ง เพื่อให้กู้คืนได้)
    card.style.display = 'none';
    
    // สร้างลิสต์ในถังขยะ
    let displayName = realId;
    if (displayName.includes('_')) displayName = displayName.split('_')[1];

    const list = document.getElementById('discard-list');
    const li = document.createElement('li');
    li.id = `discard-item-${realId}`;
    
    // ใส่ปุ่ม Restore กู้คืนการ์ด
    li.innerHTML = `
        <span>Card ${displayName}</span>
        <button class="restore-btn" onclick="restoreCard('${realId}')" title="ดึงกลับคืนมา">↩️</button>
    `;
    list.appendChild(li);
}

// ระบบเรียกคืนการ์ด
function restoreCard(realId) {
    const card = allCardsMap[realId];
    if (card) {
        // ลบออกจากรายการถังขยะ
        const listItem = document.getElementById(`discard-item-${realId}`);
        if (listItem) listItem.remove();

        // เอาการ์ดกลับมาโชว์ที่ Play Area
        card.style.display = 'block';
        document.getElementById('play-area').appendChild(card);
    }
}

// --- SEARCH LOGIC ---
function searchCard() {
    const query = document.getElementById('card-search').value.toLowerCase().trim();
    if (!query) return;

    let foundCard = null;

    // หาการ์ดที่ตรงกับคำค้นหา
    for (const [id, cardEl] of Object.entries(allCardsMap)) {
        if (id.toLowerCase().endsWith(query)) {
            foundCard = cardEl;
            break;
        }
    }

    if (foundCard) {
        // ถ้าการ์ดถูกทิ้งอยู่ ให้เรียกคืนก่อนเลย
        if (foundCard.style.display === 'none') {
            restoreCard(foundCard.dataset.realId);
        } else if (foundCard.parentElement.id === 'waiting-area') {
            document.getElementById('play-area').appendChild(foundCard);
        }

        // ไฮไลต์ให้ผู้เล่นเห็นชัดๆ
        foundCard.style.boxShadow = "0 0 20px 5px #f1c40f";
        setTimeout(() => foundCard.style.boxShadow = "none", 2000);
        document.getElementById('card-search').value = ""; // ล้างช่อง
    } else {
        alert("หาการ์ดไม่เจอครับ! ลองตรวจสอบเลขอีกครั้ง หรืออาจจะไม่มีไฟล์การ์ดใบนี้อยู่ในโฟลเดอร์ images");
    }
}
