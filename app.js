const gameDatabase = {
    "ep2": {
        name: "Episode 2: 5th Avenue",
        prefix: "ep2",
        coverImg: "unlock_ep2.png", 
        startCard: "ep2_05"
    }
};

let currentDraggedCard = null;
let allCardsMap = {};
let discardedCardsMap = {}; // Track discarded cards
let imageCache = {};

window.onload = () => {
    const epList = document.getElementById('episode-list');
    for (const [epId, epData] of Object.entries(gameDatabase)) {
        const btn = document.createElement('button');
        btn.className = 'ep-btn';
        
        btn.innerHTML = `
            <img src="images/${epData.coverImg}" alt="${epData.name}" style="width: 150px; display: block; margin: 0 auto 10px; border-radius: 5px; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
            Start ${epData.name}
        `;
        
        btn.onclick = () => loadEpisode(epId);
        epList.appendChild(btn);
    }
};

/**
 * Check if an image exists (with caching)
 */
async function checkImageExists(url) {
    if (imageCache[url] !== undefined) {
        return imageCache[url];
    }

    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            imageCache[url] = true;
            resolve(true);
        };
        img.onerror = () => {
            imageCache[url] = false;
            resolve(false);
        };
        img.src = url;
    });
}

/**
 * Scan for cards with mixed formats
 */
async function scanForCards(prefix) {
    const validCards = [];
    const possibleSuffixes = Array.from({length: 99}, (_, i) => String(i + 1).padStart(2, '0'));
    ['A','B','C','D','E','F'].forEach(l => possibleSuffixes.push(l));

    for (const suffix of possibleSuffixes) {
        const id = `${prefix}_${suffix}`;
        
        let frontExt = null;
        if (await checkImageExists(`images/${id}.jpg`)) {
            frontExt = 'jpg';
        } else if (await checkImageExists(`images/${id}.png`)) {
            frontExt = 'png';
        }

        if (frontExt) {
            let backExt = frontExt;
            if (await checkImageExists(`images/${id}b.jpg`)) {
                backExt = 'jpg';
            } else if (await checkImageExists(`images/${id}b.png`)) {
                backExt = 'png';
            } else {
                backExt = frontExt;
            }

            validCards.push({ 
                id, 
                frontExt, 
                backExt,
                frontUrl: `images/${id}.${frontExt}`,
                backUrl: `images/${id}b.${backExt}`
            });
        }
    }

    return validCards;
}

async function loadEpisode(epId) {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('loading-screen').classList.remove('hidden');

    const epData = gameDatabase[epId];
    const foundCards = await scanForCards(epData.prefix);

    const deckArea = document.getElementById('deck-area');
    const playArea = document.getElementById('play-area');
    const discardGrid = document.getElementById('discard-grid');
    
    deckArea.innerHTML = '';
    playArea.innerHTML = '';
    discardGrid.innerHTML = '';
    
    allCardsMap = {};
    discardedCardsMap = {};

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
    updateStats();

    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
}

function goHome() {
    document.getElementById('welcome-screen').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('focus-img').style.display = 'none';
    document.getElementById('focus-placeholder').style.display = 'block';
    
    closeModal('deck-modal');
    closeModal('discard-modal');
    
    allCardsMap = {};
    discardedCardsMap = {};
}

/**
 * Create card element with flip and drag support
 */
function createCardElement(cardData) {
    const card = document.createElement('div');
    card.className = 'card';
    card.id = `card-${cardData.id}`;
    card.draggable = true;
    card.dataset.realId = cardData.id;
    card._cardData = cardData;

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    // Front side
    const front = document.createElement('div');
    front.className = 'card-front';
    const frontImg = document.createElement('img');
    frontImg.src = cardData.frontUrl;
    frontImg.alt = `Card ${cardData.id} Front`;
    front.appendChild(frontImg);

    // Back side
    const back = document.createElement('div');
    back.className = 'card-back';
    const backImg = document.createElement('img');
    backImg.src = cardData.backUrl;
    backImg.alt = `Card ${cardData.id} Back`;
    back.appendChild(backImg);

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    // Click handler
    card.onclick = (e) => {
        const inDeck = card.closest('#deck-area');
        if (inDeck) {
            card.classList.toggle('selected-card');
            updateStats();
        }
        updateFocusArea(cardData.frontUrl, cardData.backUrl, card.classList.contains('flipped')); 
    };
    
    // Double-click to flip
    card.ondblclick = (e) => {
        e.stopPropagation();
        card.classList.toggle('flipped'); 
        updateFocusArea(cardData.frontUrl, cardData.backUrl, card.classList.contains('flipped'));
    };

    // Drag handlers
    card.addEventListener('dragstart', (e) => {
        currentDraggedCard = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
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

function openModal(id) { 
    document.getElementById(id).classList.remove('hidden');
    if (id === 'deck-modal') {
        updateDeckStats();
    } else if (id === 'discard-modal') {
        updateDiscardStats();
        showEmptyDiscardMessage();
    }
}

function closeModal(id) { 
    document.getElementById(id).classList.add('hidden'); 
}

function setupDragAndDrop() {
    const playArea = document.getElementById('play-area');
    const deckArea = document.getElementById('deck-area');
    const discardZone = document.getElementById('discard-zone');

    // Setup play area
    setupDropZone(playArea);
    setupDropZone(deckArea);

    // Setup discard zone
    discardZone.addEventListener('dragover', e => {
        e.preventDefault();
        discardZone.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
    });

    discardZone.addEventListener('dragleave', () => {
        discardZone.classList.remove('drag-over');
    });

    discardZone.addEventListener('drop', e => {
        e.preventDefault();
        discardZone.classList.remove('drag-over');
        if (currentDraggedCard) {
            discardCard(currentDraggedCard);
        }
    });
}

function setupDropZone(zone) {
    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (currentDraggedCard) {
            zone.appendChild(currentDraggedCard);
            currentDraggedCard.classList.remove('selected-card');
            updateStats();
        }
    });
}

/**
 * Discard a card - moves it to discard modal grid
 */
function discardCard(card) {
    const realId = card.dataset.realId;
    const cardData = card._cardData || { id: realId };
    
    // Hide card from main areas
    card.style.display = 'none';
    
    // Add to discarded map
    discardedCardsMap[realId] = {
        card: card,
        cardData: cardData
    };

    // Recreate card in discard grid
    const discardGrid = document.getElementById('discard-grid');
    const discardCardEl = createCardElement(cardData);
    discardCardEl.id = `discard-${realId}`;
    discardCardEl.dataset.discardId = realId;
    
    // Add restore button overlay
    const restoreOverlay = document.createElement('div');
    restoreOverlay.className = 'card-overlay restore-overlay';
    restoreOverlay.innerHTML = '<button class="restore-btn-small" onclick="restoreCard(\'' + realId + '\')">↩️ Restore</button>';
    discardCardEl.appendChild(restoreOverlay);
    
    discardGrid.appendChild(discardCardEl);
    
    updateStats();
    updateDiscardStats();
    showEmptyDiscardMessage();
}

/**
 * Restore card from discard
 */
function restoreCard(realId) {
    const discarded = discardedCardsMap[realId];
    if (discarded) {
        const originalCard = discarded.card;
        const discardCardEl = document.getElementById(`discard-${realId}`);
        
        if (discardCardEl) {
            discardCardEl.remove();
        }
        
        originalCard.style.display = 'block';
        document.getElementById('play-area').appendChild(originalCard);
        
        delete discardedCardsMap[realId];
        updateStats();
        updateDiscardStats();
        showEmptyDiscardMessage();
    }
}

/**
 * Restore all cards at once
 */
function restoreAllCards() {
    const cardIds = Object.keys(discardedCardsMap);
    cardIds.forEach(realId => restoreCard(realId));
}

function searchCard() {
    const query = document.getElementById('card-search').value.toLowerCase().trim();
    if (!query) {
        alert('Please enter a card number or suffix to search');
        return;
    }

    let foundCard = null;
    for (const [id, cardEl] of Object.entries(allCardsMap)) {
        if (id.toLowerCase().includes(query)) { 
            foundCard = cardEl; 
            break; 
        }
    }

    if (foundCard) {
        if (foundCard.style.display === 'none') {
            restoreCard(foundCard.dataset.realId);
        }
        document.getElementById('play-area').appendChild(foundCard);
        foundCard.click();
        
        foundCard.style.boxShadow = "0 0 20px 5px #2ecc71";
        setTimeout(() => foundCard.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.5)", 2000);
        document.getElementById('card-search').value = "";
    } else {
        alert(`Card "${query}" not found!`);
    }
}

function sendSelectedToPlayArea() {
    const playArea = document.getElementById('play-area');
    const selectedCards = document.querySelectorAll('#deck-area .selected-card');
    
    if (selectedCards.length === 0) {
        alert("Please select at least 1 card");
        return;
    }

    selectedCards.forEach(card => {
        card.classList.remove('selected-card'); 
        playArea.appendChild(card); 
    });

    updateStats();
    closeModal('deck-modal');
}

function deselectAllDeckCards() {
    const selectedCards = document.querySelectorAll('#deck-area .selected-card');
    selectedCards.forEach(card => card.classList.remove('selected-card'));
    updateDeckStats();
}

/**
 * Update card counts in header
 */
function updateStats() {
    const deckCount = document.querySelectorAll('#deck-area .card:not([style*="display: none"])').length;
    const playCount = document.querySelectorAll('#play-area .card:not([style*="display: none"])').length;
    const discardCount = Object.keys(discardedCardsMap).length;

    document.getElementById('deck-count').textContent = deckCount;
    document.getElementById('play-count').textContent = playCount;
    document.getElementById('discard-count').textContent = discardCount;
}

function updateDeckStats() {
    const total = document.querySelectorAll('#deck-area .card').length;
    const selected = document.querySelectorAll('#deck-area .selected-card').length;
    
    document.getElementById('total-deck-count').textContent = total;
    document.getElementById('selected-deck-count').textContent = selected;
}

function updateDiscardStats() {
    const total = Object.keys(discardedCardsMap).length;
    document.getElementById('total-discard-count').textContent = total;
}

function showEmptyDiscardMessage() {
    const discardGrid = document.getElementById('discard-grid');
    const emptyMsg = document.getElementById('empty-discard-message');
    
    if (Object.keys(discardedCardsMap).length === 0) {
        emptyMsg.style.display = 'flex';
        discardGrid.style.display = 'none';
    } else {
        emptyMsg.style.display = 'none';
        discardGrid.style.display = 'grid';
    }
}
