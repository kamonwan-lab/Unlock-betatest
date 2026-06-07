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
        
        btn.style.backgroundColor = "#2c3e50"; 
        
        btn.onclick = () => loadEpisode(epId);
        epList.appendChild(btn);
    }
};

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

    setupDragAndDrop
