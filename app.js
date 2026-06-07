const gameDatabase = {
    "ep2": {
        name: "Episode 2: 5th Avenue",
        prefix: "ep2",
        coverImg: "unlock_ep2.png", // เพิ่มชื่อไฟล์รูปหน้าปกตรงนี้
        startCard: "ep2_05",
    }
};

let currentDraggedCard = null;
let allCardsMap = {};

window.onload = () => {
    const epList = document.getElementById('episode-list');
    for (const [epId, epData] of Object.entries(gameDatabase)) {
        const btn = document.createElement('button');
        btn.className = 'ep-btn';
        
        // ปรับปุ่มให้โชว์รูปหน้าปกด้วย
        btn.innerHTML = `
            <img src="images/${epData.coverImg}" alt="${epData.name}" style="width: 150px; display: block; margin: 0 auto 10px; border-radius: 5px; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
            Start ${epData.name}
        `;
        
        // ถ้าอยากให้พื้นหลังปุ่มโปร่งใสหรือเปลี่ยนสี ปรับเพิ่มตรงนี้ได้
        btn.style.backgroundColor = "#2c3e50"; 
        
        btn.onclick = () => loadEpisode(epId);
        epList.appendChild(btn);
    }
};

// ... (โค้ดส่วน async function scanForCards(prefix) และอื่นๆ ด้านล่าง ปล่อยไว้เหมือนเดิมเลยครับ) ...

async function scanForCards(prefix) {
    const validCards = [];
    const possibleSuffixes = Array.from({length: 99}, (_, i) => String(i + 1).padStart(2, '0'));
    ['A','B','C','D','E','F'].forEach(l => possibleSuffixes.push(l));

    const checkImageExists = (url) => new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });

    const promises = possibleSuffixes.map(async (suffix) => {
        const id = `${prefix}_${suffix}`;
        let frontExt = null;

        if (await checkImageExists(`images/${id}.jpg`)) frontExt = 'jpg';
        else if (await checkImageExists(`images/${id}.png`)) frontExt = 'png';

        if (frontExt) {
            let backExt = frontExt;
            if (await checkImageExists(`images/${id}b.jpg`)) backExt = 'jpg';
            else if (await checkImageExists(`images/${id}b.png`)) backExt = 'png';
            return { id, frontExt, backExt };
        }
        return null;
    });

    const results = await Promise.all(promises);
    return results.filter(r => r !== null);
}

async function loadEpisode(epId) {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('loading-screen').classList.remove('hidden');

    const epData = gameDatabase[epId];
    const foundCards = await scanForCards(epData.prefix);

    const deckArea = document.getElementById('deck-area');
    const playArea = document.getElementById('play-area');
    deckArea.innerHTML = '';
    playArea.innerHTML = '';
    document.getElementById('discard-list').innerHTML = '';
    allCardsMap = {};

    foundCards.forEach(cardData => {
        const cardEl = createCardElement(cardData);
        allCardsMap[cardData.id] = cardEl;

        if (cardData.id === epData.startCard) {
            playArea.appendChild(cardEl);
            cardEl.classList.add('flipped');
        } else {
            deckArea.appendChild(cardEl);
        }
    });

    setupDragAndDrop();

    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
}

function goHome() {
    document.getElementById('welcome-screen').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('focus-img').style.display = 'none';
    document.getElementById('focus-placeholder').style.display = 'block';
}

function createCardElement(cardData) {
    const card = document.createElement('div');
    card.className = 'card';
    card.id = `card-${cardData.id}`;
    card.draggable = true;
    card.dataset.realId = cardData.id;

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    const frontSrc = `images/${cardData.id}.${cardData.frontExt}`;
    const backSrc = `images/${cardData.id}b.${cardData.backExt}`;

    const front = document.createElement('div');
    front.className = 'card-front';
    front.innerHTML = `<img src="${frontSrc}" alt="Front">`;

    const back = document.createElement('div');
    back.className = 'card-back';
    back.innerHTML = `<img src="${backSrc}" alt="Back">`;

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    // การโต้ตอบ: พลิกการ์ด & อัปเดต Focus Area & ระบบคลิกเลือกการ์ด (Deck)
    card.onclick = () => { 
        // 1. ถ้าการ์ดอยู่ใน Deck ให้ทำการคลิกเพื่อ เลือก/ยกเลิกเลือก (เพิ่มกรอบสีเหลือง)
        if (card.closest('#deck-area')) {
            card.classList.toggle('selected-card');
        }
        
        // 2. อัปเดต Focus Area ไปด้วยตามปกติ (โค้ดเดิมของคุณยังอยู่ตรงนี้ครับ)
        updateFocusArea(frontSrc, backSrc, card.classList.contains('flipped')); 
    };
    
    // ส่วน Double Click เพื่อพลิกการ์ด ก็ยังคงใช้โค้ดเดิมของคุณได้เลยครับ
    card.ondblclick = () => { 
        card.classList.toggle('flipped'); 
        updateFocusArea(frontSrc, backSrc, card.classList.contains('flipped'));
    };

    // --- Deck Selection Functions ---

// ฟังก์ชันส่งการ์ดที่เลือกไปยัง Play Area
function sendSelectedToPlayArea() {
    const playArea = document.getElementById('play-area');
    // หาการ์ดทั้งหมดใน deck-area ที่มีคลาส selected-card
    const selectedCards = document.querySelectorAll('#deck-area .selected-card');
    
    if (selectedCards.length === 0) {
        alert("กรุณาคลิกเลือกการ์ดอย่างน้อย 1 ใบก่อนครับ");
        return;
    }

    selectedCards.forEach(card => {
        card.classList.remove('selected-card'); // เอาเอฟเฟกต์เรืองแสงออกก่อนย้าย
        playArea.appendChild(card); // ย้ายการ์ดไป Play Area
        
        // ถ้าต้องการให้การ์ดพลิกโชว์หน้าเนื้อหา (Play side) ทันทีที่ลงบอร์ด เปิดคอมเมนต์บรรทัดล่างได้เลยครับ
        // card.classList.add('flipped'); 
    });

    // ปิดหน้าต่าง Popup หลังจากส่งการ์ดเสร็จ (ถ้าอยากให้หน้าต่างเปิดค้างไว้ ให้ลบบรรทัดนี้ออกครับ)
    closeModal('deck-modal');
}

// ฟังก์ชันยกเลิกการเลือกทั้งหมด
function deselectAllDeckCards() {
    const selectedCards = document.querySelectorAll('#deck-area .selected-card');
    selectedCards.forEach(card => card.classList.remove('selected-card'));
}

    // ลากการ์ด
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

function updateFocusArea(frontSrc, backSrc, isFlipped) {
    const imgElement = document.getElementById('focus-img');
    const placeholder = document.getElementById('focus-placeholder');
    
    imgElement.src = isFlipped ? frontSrc : backSrc;
    imgElement.style.display = 'block';
    placeholder.style.display = 'none';
}

// --- Modals ---
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// --- Drag & Drop ---
function setupDragAndDrop() {
    // กำหนดให้ Play Area และ Deck Area วางการ์ดสลับไปมาได้
    const dropZones = [document.getElementById('play-area'), document.getElementById('deck-area')];
    const discardZone = document.getElementById('discard-zone');

    dropZones.forEach(zone => {
        zone.addEventListener('dragover', e => e.preventDefault());
        zone.addEventListener('drop', e => {
            e.preventDefault();
            if (currentDraggedCard) zone.appendChild(currentDraggedCard);
        });
    });

    // ทิ้งการ์ด
    discardZone.addEventListener('dragover', e => e.preventDefault());
    discardZone.addEventListener('drop', e => {
        e.preventDefault();
        if (currentDraggedCard) discardCard(currentDraggedCard);
    });
}

function discardCard(card) {
    const realId = card.dataset.realId;
    card.style.display = 'none'; // ซ่อนการ์ดจากกระดาน

    let displayName = realId.includes('_') ? realId.split('_')[1] : realId;

    const list = document.getElementById('discard-list');
    const li = document.createElement('li');
    li.id = `discard-item-${realId}`;
    li.innerHTML = `
        <span>Card ${displayName}</span>
        <button class="restore-btn" onclick="restoreCard('${realId}')">↩️ Restore</button>
    `;
    list.appendChild(li);
}

function restoreCard(realId) {
    const card = allCardsMap[realId];
    if (card) {
        document.getElementById(`discard-item-${realId}`).remove();
        card.style.display = 'block';
        document.getElementById('play-area').appendChild(card);
    }
}

function searchCard() {
    const query = document.getElementById('card-search').value.toLowerCase().trim();
    if (!query) return;

    let foundCard = null;
    for (const [id, cardEl] of Object.entries(allCardsMap)) {
        if (id.toLowerCase().endsWith(query)) { foundCard = cardEl; break; }
    }

    if (foundCard) {
        if (foundCard.style.display === 'none') restoreCard(foundCard.dataset.realId);
        document.getElementById('play-area').appendChild(foundCard);
        
        // จำลองการคลิกเพื่อนำภาพขึ้น Focus Area ด้วย
        foundCard.click();
        
        foundCard.style.boxShadow = "0 0 20px 5px #2ecc71";
        setTimeout(() => foundCard.style.boxShadow = "0 4px 6px rgba(0,0,0,0.5)", 2000);
        document.getElementById('card-search').value = "";
    } else {
        alert("Card not found!");
    }
}
