// --- CONFIGURATION / DATABASE ---
const gameDatabase = {
    "ep2": {
        name: "Episode 2: 5th Avenue",
        coverImg: "unlock_ep2.jpg",   // รูปหน้าปก (ต้องอยู่ในโฟลเดอร์ images)
        startCard: "ep2_05",          // การ์ดเริ่มต้น
        cards: [
            // ระบุรหัส และ นามสกุลไฟล์ให้ตรงกับที่อัปโหลดไว้
            { id: "ep2_05", frontExt: "jpg", backExt: "jpg" },
            { id: "ep2_08", frontExt: "jpg", backExt: "png" },
            { id: "ep2_11", frontExt: "jpg", backExt: "png" },
            { id: "ep2_15", frontExt: "jpg", backExt: "png" },
            { id: "ep2_22", frontExt: "jpg", backExt: "jpg" }
        ]
    }
};

let currentDraggedCard = null;

// --- INITIALIZATION ---
window.onload = () => {
    const epList = document.getElementById('episode-list');
    for (const [epId, epData] of Object.entries(gameDatabase)) {
        const btn = document.createElement('button');
        btn.className = 'ep-btn';
        btn.innerHTML = `
            <img src="images/${epData.coverImg}" alt="${epData.name}" style="width:120px; display:block; margin:0 auto 10px; border-radius:5px; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
            ${epData.name}
        `;
        btn.onclick = () => loadEpisode(epId);
        epList.appendChild(btn);
    }
    setupDragAndDrop();
};

function loadEpisode(epId) {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
    const epData = gameDatabase[epId];
    const waitingArea = document.getElementById('waiting-area');
    const playArea = document.getElementById('play-area');
    waitingArea.innerHTML = '';
    playArea.innerHTML = '';
    document.getElementById('discard-list').innerHTML = '';

    epData.cards.forEach(cardData => {
        const cardEl = createCardElement(cardData);
        // ถ้าเป็นการ์ดเริ่ม ให้ไปอยู่บนโต๊ะและหงายหน้า
        if (cardData.id === epData.startCard) {
            playArea.appendChild(cardEl);
            cardEl.classList.add('flipped');
        } else {
            waitingArea.appendChild(cardEl);
        }
    });
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

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    const front = document.createElement('div');
    front.className = 'card-front';
    front.innerHTML = `<img src="images/${cardData.id}.${cardData.frontExt}" alt="${cardData.id} Front">`;

    const back = document.createElement('div');
    back.className = 'card-back';
    back.innerHTML = `<img src="images/${cardData.id}b.${cardData.backExt}" alt="${cardData.id} Back">`;

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    // ดับเบิลคลิกเพื่อพลิกการ์ด
    card.ondblclick = () => { card.classList.toggle('flipped'); };

    // ระบบลากการ์ด
    card.addEventListener('dragstart', (e) => {
        currentDraggedCard = card;
        setTimeout(() => card.style.display = 'none', 0);
    });
    
    card.addEventListener('dragend', () => {
        card.style.display = 'block';
        currentDraggedCard = null;
    });

    return card;
}

// --- DRAG AND DROP MECHANICS ---
function setupDragAndDrop() {
    const dropZones = document.querySelectorAll('.drop-zone');

    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
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

// --- DISCARD LOGIC ---
function discardCard(card) {
    let realId = card.id.replace('card-', '');
    if (realId.includes('_')) {
        realId = realId.split('_')[1]; 
    }
    
    const list = document.getElementById('discard-list');
    const li = document.createElement('li');
    li.innerText = `Card ${realId}`;
    list.appendChild(li);

    card.remove();
}

// --- SEARCH LOGIC ---
function searchCard() {
    const query = document.getElementById('card-search').value.toLowerCase().trim();
    if (!query) return;

    const allCards = document.querySelectorAll('.card');
    let foundCard = null;

    allCards.forEach(card => {
        if (card.id.toLowerCase().endsWith(query)) {
            foundCard = card;
        }
    });

    if (foundCard) {
        if (foundCard.parentElement.id === 'waiting-area') {
            document.getElementById('play-area').appendChild(foundCard);
        }
        foundCard.style.boxShadow = "0 0 20px 5px #f1c40f";
        setTimeout(() => foundCard.style.boxShadow = "", 2000);
        document.getElementById('card-search').value = ""; // ล้างช่องค้นหา
    } else {
        alert("Card not found! Either it doesn't exist or it has been discarded.");
    }
}
