class PokemonCardGame {
    constructor() {
        this.players = {
            1: {
                deck: [],
                hand: [],
                battleZone: null,
                bench: [null, null, null, null, null],
                trash: [],
                lostZone: [],
                selectedCard: null
            },
            2: {
                deck: [],
                hand: [],
                battleZone: null,
                bench: [null, null, null, null, null],
                trash: [],
                lostZone: [],
                selectedCard: null
            }
        };
        this.currentPlayer = 1;
        this.isDarkMode = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeDecks();
        this.updateDisplay();
    }

    setupEventListeners() {
        document.querySelectorAll('.player-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = parseInt(e.target.dataset.player);
                const action = e.target.dataset.action;
                const supporter = e.target.dataset.supporter;
                const condition = e.target.dataset.condition;
                const damage = e.target.dataset.damage;
                const bench = e.target.dataset.bench;
                
                this.currentPlayer = player;
                
                if (action) {
                    this.handlePlayerAction(player, action, e.target);
                } else if (supporter) {
                    this.useSupporter(player, supporter);
                } else if (condition) {
                    this.applyCondition(player, condition);
                } else if (damage) {
                    this.adjustDamage(player, parseInt(damage));
                } else if (bench) {
                    this.moveBenchCard(player, parseInt(bench), e.target.classList.contains('move-up'));
                }
            });
        });

        document.getElementById('darkModeToggle').addEventListener('click', () => this.toggleDarkMode());
        document.getElementById('tableMode').addEventListener('click', () => this.toggleTableMode());

        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('modalToHand').addEventListener('click', () => this.moveCardToHand());
        document.getElementById('modalToBattle').addEventListener('click', () => this.moveCardToBattle());
        document.getElementById('modalToBench').addEventListener('click', () => this.moveCardToBench());
        document.getElementById('modalToTrash').addEventListener('click', () => this.moveCardToTrash());
        document.getElementById('modalToDeckTop').addEventListener('click', () => this.moveCardToDeckTop());
        document.getElementById('modalToDeckBottom').addEventListener('click', () => this.moveCardToDeckBottom());
        document.getElementById('modalFlip').addEventListener('click', () => this.flipModalCard());

        document.querySelectorAll('.card-slot').forEach(slot => {
            slot.addEventListener('click', (e) => this.handleCardSlotClick(e.target));
        });

        document.getElementById('deckPile1').addEventListener('click', () => this.showDeck(1));
        document.getElementById('deckPile2').addEventListener('click', () => this.showDeck(2));
        document.getElementById('trashPile1').addEventListener('click', () => this.showTrash(1));
        document.getElementById('trashPile2').addEventListener('click', () => this.showTrash(2));

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });
    }

    initializeDecks() {
        for (let player = 1; player <= 2; player++) {
            for (let i = 1; i <= 60; i++) {
                this.players[player].deck.push({
                    id: i,
                    name: `P${player}-カード${i}`,
                    type: 'ポケモン',
                    faceUp: false,
                    damage: 0,
                    condition: null,
                    player: player
                });
            }
        }
    }

    handlePlayerAction(player, action, buttonElement) {
        switch (action) {
            case 'shuffle':    this.shuffleDeck(player); break;
            case 'draw1':      this.drawCards(player, 1); break;
            case 'draw2':      this.drawCards(player, 2); break;
            case 'draw3':      this.drawCards(player, 3); break;
            case 'drawTop':    this.drawFromTop(player); break;
            case 'drawBottom': this.drawFromBottom(player); break;
            case 'flipCard':
            case 'mobileFlip': this.flipSelectedCard(player); break;
            case 'addBench':   this.addBenchSlot(player); break;
            case 'clearChecks':this.clearChecks(player); break;
            case 'sortCards':  this.sortHand(player); break;
            case 'returnToDeck': this.returnToDeck(player); break;
            case 'redraw':     this.redraw(player); break;
            case 'mobileDeckTop':    this.drawFromTop(player); break;
            case 'mobileDeckBottom': this.drawFromBottom(player); break;
            case 'loadDeck':   this.loadDeck(player); break;
            case 'viewDeck':   this.viewDeck(player); break;
            case 'loadDeckManual': this.loadDeckManual(player); break;
        }
    }

    shuffleDeck(player) {
        const deckElement = document.getElementById(`deckPile${player}`);
        deckElement.classList.add('shuffle-animation');
        
        const deck = this.players[player].deck;
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        
        setTimeout(() => {
            deckElement.classList.remove('shuffle-animation');
            this.showMessage(`プレイヤー${player}: デッキをシャッフルしました`);
        }, 500);
    }

    drawCards(player, count) {
        const playerData = this.players[player];
        if (playerData.deck.length < count) {
            this.showMessage(`プレイヤー${player}: デッキにカードがありません`);
            return;
        }
        for (let i = 0; i < count; i++) {
            const card = playerData.deck.pop();
            card.faceUp = true;
            playerData.hand.push(card);
        }
        this.updateDisplay();
        this.showMessage(`プレイヤー${player}: ${count}枚ドローしました`);
    }

    drawFromTop(player) {
        const playerData = this.players[player];
        if (playerData.deck.length === 0) {
            this.showMessage(`プレイヤー${player}: デッキにカードがありません`);
            return;
        }
        const card = playerData.deck.pop();
        this.showCardModal(card);
    }

    drawFromBottom(player) {
        const playerData = this.players[player];
        if (playerData.deck.length === 0) {
            this.showMessage(`プレイヤー${player}: デッキにカードがありません`);
            return;
        }
        const card = playerData.deck.shift();
        this.showCardModal(card);
    }

    flipSelectedCard(player) {
        const playerData = this.players[player];
        if (playerData.selectedCard) {
            playerData.selectedCard.faceUp = !playerData.selectedCard.faceUp;
            this.updateDisplay();
            this.showMessage(`プレイヤー${player}: カードを裏返しました`);
        } else {
            this.showMessage(`プレイヤー${player}: カードが選択されていません`);
        }
    }

    applyCondition(player, condition) {
        const playerData = this.players[player];
        if (playerData.selectedCard) {
            playerData.selectedCard.condition = playerData.selectedCard.condition === condition ? null : condition;
            this.updateDisplay();
            this.showMessage(`プレイヤー${player}: ${condition}を適用しました`);
        } else {
            this.showMessage(`プレイヤー${player}: カードが選択されていません`);
        }
    }

    useSupporter(player, supporter) {
        switch (supporter) {
            case 'ジャッジマン':
                this.drawCards(player, 3);
                break;
            case 'デッキ下':
                if (this.players[player].hand.length > 0) {
                    const card = this.players[player].hand.pop();
                    this.players[player].deck.push(card);
                    this.updateDisplay();
                    this.showMessage(`プレイヤー${player}: 手札のカードをデッキ下に戻しました`);
                }
                break;
        }
    }

    adjustDamage(player, amount) {
        const playerData = this.players[player];
        if (playerData.selectedCard) {
            playerData.selectedCard.damage = Math.max(0, playerData.selectedCard.damage + amount);
            this.updateDisplay();
            this.showMessage(`プレイヤー${player}: ダメージを${amount > 0 ? '+' : ''}${amount}しました`);
        } else {
            this.showMessage(`プレイヤー${player}: カードが選択されていません`);
        }
    }

    moveBenchCard(player, benchIndex, isUp) {
        const bench = this.players[player].bench;
        const index = benchIndex - 1;
        if (isUp && index > 0 && bench[index]) {
            [bench[index], bench[index - 1]] = [bench[index - 1], bench[index]];
            this.updateDisplay();
        } else if (!isUp && index < bench.length - 1 && bench[index]) {
            [bench[index], bench[index + 1]] = [bench[index + 1], bench[index]];
            this.updateDisplay();
        }
    }

    addBenchSlot(player) {
        const bench = this.players[player].bench;
        if (bench.length < 8) {
            bench.push(null);
            this.updateDisplay();
            this.showMessage(`プレイヤー${player}: ベンチを拡張しました`);
        } else {
            this.showMessage(`プレイヤー${player}: これ以上ベンチを拡張できません`);
        }
    }

    clearChecks(player) {
        const playerData = this.players[player];
        playerData.selectedCard = null;
        playerData.bench.forEach(card => { if (card) card.selected = false; });
        if (playerData.battleZone) playerData.battleZone.selected = false;
        playerData.hand.forEach(card => card.selected = false);
        this.updateDisplay();
        this.showMessage(`プレイヤー${player}: 選択を解除しました`);
    }

    sortHand(player) {
        const hand = this.players[player].hand;
        const typeOrder = { 'ポケモン': 0, 'グッズ': 1, 'サポート': 2, 'スタジアム': 3, 'エネルギー': 4, '不明': 5 };
        hand.sort((a, b) => (typeOrder[a.type] ?? 5) - (typeOrder[b.type] ?? 5) || a.name.localeCompare(b.name));
        this.updateDisplay();
        this.showMessage(`プレイヤー${player}: 手札を整理しました`);
    }

    returnToDeck(player) {
        const playerData = this.players[player];
        if (playerData.selectedCard) {
            playerData.deck.push(playerData.selectedCard);
            this.removeCardFromCurrentPosition(player, playerData.selectedCard);
            playerData.selectedCard = null;
            this.updateDisplay();
            this.showMessage(`プレイヤー${player}: カードをデッキに戻しました`);
        } else {
            this.showMessage(`プレイヤー${player}: カードが選択されていません`);
        }
    }

    redraw(player) {
        const playerData = this.players[player];
        playerData.deck.push(...playerData.hand);
        playerData.hand = [];
        this.shuffleDeck(player);
        this.drawCards(player, 7);
        this.showMessage(`プレイヤー${player}: 手札を引き直しました`);
    }

    // ──────────────────────────────────────────
    // ★ デッキ読み込み（修正済み）
    // ──────────────────────────────────────────
    async loadDeck(player) {
        const deckCodeInput = document.getElementById(`deckCode${player}`);
        const deckCode = deckCodeInput.value.trim();
        
        if (!deckCode) {
            this.showMessage(`プレイヤー${player}: デッキコードを入力してください`);
            return;
        }

        this.showMessage(`プレイヤー${player}: デッキを読み込み中...`);
        
        try {
            const response = await fetch(`/api/deck/${encodeURIComponent(deckCode)}`);
            if (!response.ok) {
                let msg = `HTTP ${response.status}`;
                try {
                    const errJson = await response.json();
                    msg = errJson.message || errJson.error || msg;
                } catch {}
                throw new Error(msg);
            }
            const data = await response.json();
            
            if (!data.success || !data.cardIds || data.cardIds.length === 0) {
                throw new Error(data.message || 'カードが見つかりませんでした');
            }

            // ── デッキ・フィールドをリセット ──
            this.players[player].deck       = [];
            this.players[player].hand       = [];
            this.players[player].battleZone = null;
            this.players[player].bench      = [null, null, null, null, null];
            this.players[player].trash      = [];

            // ── カードを生成 ──
            // サーバーは同じIDを枚数分返してくる（例: 4枚なら同じIDが4つ）
            // cardIds はすでに枚数展開済みのリスト
            data.cardIds.forEach((cardId, index) => {
                this.players[player].deck.push({
                    id:        index + 1,
                    name:      cardId,          // ★ IDをそのまま名前に（後でAPIで補完可能）
                    type:      '不明',          // ★ ダミーのgetCardType()を使わない
                    cardId:    cardId,
                    imageUrl:  `/api/image/${cardId}`,
                    faceUp:    false,           // ★ デッキは最初から裏向き
                    damage:    0,
                    condition: null,
                    player:    player
                });
            });

            this.updateDisplay();
            this.showMessage(`プレイヤー${player}: ${data.cardIds.length}枚のデッキをセットしました！シャッフルしてください。`);

        } catch (error) {
            console.error('デッキ読み込みエラー:', error);
            this.showMessage(`プレイヤー${player}: 読み込み失敗 — ${error.message}`);
        }
    }

    loadDeckManual(player) {
        const textarea = document.getElementById(`deckList${player}`);
        const raw = (textarea?.value || '').split('\n')
            .map(s => s.trim()).filter(Boolean);
        if (raw.length === 0) {
            this.showMessage(`プレイヤー${player}: カードIDを入力してください`);
            return;
        }
        this.players[player].deck       = [];
        this.players[player].hand       = [];
        this.players[player].battleZone = null;
        this.players[player].bench      = [null, null, null, null, null];
        this.players[player].trash      = [];

        raw.forEach((cardId, index) => {
            this.players[player].deck.push({
                id:        index + 1,
                name:      cardId,
                type:      '不明',
                cardId:    cardId,
                imageUrl:  `/api/image/${cardId}`,
                faceUp:    false,
                damage:    0,
                condition: null,
                player:    player
            });
        });
        this.updateDisplay();
        this.showMessage(`プレイヤー${player}: ${raw.length}枚のデッキを手動セットしました！シャッフルしてください。`);
    }

    viewDeck(player) {
        const deck = this.players[player].deck;
        if (deck.length === 0) {
            this.showMessage(`プレイヤー${player}: デッキが空です`);
            return;
        }

        const originalStates = deck.map(card => card.faceUp);
        deck.forEach(card => card.faceUp = true);

        const modal = document.createElement('div');
        modal.className = 'deck-view-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>プレイヤー${player}のデッキ (${deck.length}枚)</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="deck-grid">
                        ${deck.map((card, index) => `
                            <div class="deck-card face-up" data-index="${index}">
                                ${card.imageUrl ? 
                                    `<div class="card-image" style="background-image: url('${card.imageUrl}')"></div>` : 
                                    '<div class="card-back">裏</div>'
                                }
                                <div class="card-number">#${index + 1}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="deck-controls">
                        <button class="flip-back-btn">すべて裏にする</button>
                        <button class="flip-all-btn">すべて表にする</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const restore = () => {
            deck.forEach((card, i) => card.faceUp = originalStates[i]);
            document.body.removeChild(modal);
        };

        modal.querySelector('.close-btn').addEventListener('click', restore);
        modal.addEventListener('click', e => { if (e.target === modal) restore(); });
        modal.querySelector('.flip-all-btn').addEventListener('click', () => {
            deck.forEach(card => card.faceUp = true);
            this.updateDeckView(modal, deck);
        });
        modal.querySelector('.flip-back-btn').addEventListener('click', () => {
            deck.forEach(card => card.faceUp = false);
            this.updateDeckView(modal, deck);
        });
    }

    updateDeckView(modal, deck) {
        const deckGrid = modal.querySelector('.deck-grid');
        deckGrid.innerHTML = deck.map((card, index) => `
            <div class="deck-card ${card.faceUp ? 'face-up' : 'face-down'}" data-index="${index}">
                ${card.faceUp && card.imageUrl ? 
                    `<div class="card-image" style="background-image: url('${card.imageUrl}')"></div>` : 
                    '<div class="card-back">裏</div>'
                }
                <div class="card-number">#${index + 1}</div>
            </div>
        `).join('');

        deckGrid.querySelectorAll('.deck-card').forEach((cardEl, index) => {
            cardEl.addEventListener('click', () => {
                deck[index].faceUp = !deck[index].faceUp;
                this.updateDeckView(modal, deck);
            });
        });
    }

    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('dark-mode');
        this.showMessage(this.isDarkMode ? 'ダークモードをオンにしました' : 'ダークモードをオフにしました');
    }

    toggleTableMode() {
        this.showMessage('表モードを切り替えました');
    }

    handleCardSlotClick(slot) {
        const player = parseInt(slot.dataset.player);
        const zone = slot.dataset.zone;
        const playerData = this.players[player];
        let card = null;

        if (zone === 'battle') {
            card = playerData.battleZone;
        } else if (zone && zone.startsWith('bench')) {
            const benchIndex = parseInt(zone.replace('bench', '')) - 1;
            card = playerData.bench[benchIndex];
        }

        if (card) {
            this.currentPlayer = player;
            playerData.selectedCard = card;
            this.showCardModal(card);
        }
    }

    showCardModal(card) {
        const player = card.player;
        this.players[player].selectedCard = card;
        
        const modal = document.getElementById('cardModal');
        const modalContent = document.getElementById('modalCardInfo');
        
        // ★ カード画像があればモーダルにも表示
        const imgHtml = card.imageUrl
            ? `<div style="text-align:center; margin-bottom:8px;">
                 <img src="${card.imageUrl}" style="max-width:180px; border-radius:8px;" onerror="this.style.display='none'">
               </div>`
            : '';

        modalContent.innerHTML = `
            ${imgHtml}
            <p>プレイヤー: ${player}</p>
            <p>状態: ${card.faceUp ? '表' : '裏'}</p>
            ${card.damage > 0 ? `<p>ダメージ: ${card.damage}</p>` : ''}
            ${card.condition ? `<p>特殊状態: ${card.condition}</p>` : ''}
        `;
        
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('cardModal').style.display = 'none';
    }

    moveCardToHand() {
        const card = this.getSelectedCard();
        if (!card) return;
        this.removeCardFromCurrentPosition(card.player, card);
        card.faceUp = true;
        this.players[card.player].hand.push(card);
        this.closeModal();
        this.updateDisplay();
    }

    moveCardToBattle() {
        const card = this.getSelectedCard();
        if (!card) return;
        const playerData = this.players[card.player];
        this.removeCardFromCurrentPosition(card.player, card);
        if (playerData.battleZone) playerData.hand.push(playerData.battleZone);
        playerData.battleZone = card;
        this.closeModal();
        this.updateDisplay();
    }

    moveCardToBench() {
        const card = this.getSelectedCard();
        if (!card) return;
        const bench = this.players[card.player].bench;
        const emptyIndex = bench.findIndex(slot => slot === null);
        if (emptyIndex !== -1) {
            this.removeCardFromCurrentPosition(card.player, card);
            bench[emptyIndex] = card;
            this.closeModal();
            this.updateDisplay();
        } else {
            this.showMessage('ベンチに空きがありません');
        }
    }

    moveCardToTrash() {
        const card = this.getSelectedCard();
        if (!card) return;
        this.removeCardFromCurrentPosition(card.player, card);
        this.players[card.player].trash.push(card);
        this.closeModal();
        this.updateDisplay();
    }

    moveCardToDeckTop() {
        const card = this.getSelectedCard();
        if (!card) return;
        this.removeCardFromCurrentPosition(card.player, card);
        this.players[card.player].deck.push(card);
        this.closeModal();
        this.updateDisplay();
    }

    moveCardToDeckBottom() {
        const card = this.getSelectedCard();
        if (!card) return;
        this.removeCardFromCurrentPosition(card.player, card);
        this.players[card.player].deck.unshift(card);
        this.closeModal();
        this.updateDisplay();
    }

    flipModalCard() {
        const card = this.getSelectedCard();
        if (!card) return;
        card.faceUp = !card.faceUp;
        this.showCardModal(card);
        this.updateDisplay();
    }

    getSelectedCard() {
        for (let player = 1; player <= 2; player++) {
            if (this.players[player].selectedCard) return this.players[player].selectedCard;
        }
        return null;
    }

    removeCardFromCurrentPosition(player, card) {
        const playerData = this.players[player];
        const handIdx = playerData.hand.indexOf(card);
        if (handIdx !== -1) { playerData.hand.splice(handIdx, 1); return; }
        if (playerData.battleZone === card) { playerData.battleZone = null; return; }
        const benchIdx = playerData.bench.indexOf(card);
        if (benchIdx !== -1) { playerData.bench[benchIdx] = null; }
    }

    showDeck(player) {
        this.showMessage(`プレイヤー${player}: デッキ ${this.players[player].deck.length}枚`);
    }

    showTrash(player) {
        this.showMessage(`プレイヤー${player}: トラッシュ ${this.players[player].trash.length}枚`);
    }

    updateDisplay() {
        for (let player = 1; player <= 2; player++) {
            const playerData = this.players[player];

            document.querySelector(`#deckPile${player} .deck-count`).textContent = playerData.deck.length;

            const handElement = document.getElementById(`handCards${player}`);
            handElement.innerHTML = '';
            playerData.hand.forEach((card, index) => {
                handElement.appendChild(this.createCardElement(card, 'hand', index));
            });

            const battleElement = document.querySelector(`#battleZone${player} [data-zone="battle"]`);
            battleElement.innerHTML = '';
            if (playerData.battleZone) {
                battleElement.appendChild(this.createCardElement(playerData.battleZone, 'battle'));
            }

            playerData.bench.forEach((card, index) => {
                const benchSlot = document.querySelector(`#benchZone${player} [data-bench="${index + 1}"] .card-slot`);
                if (!benchSlot) return;
                benchSlot.innerHTML = '';
                if (card) benchSlot.appendChild(this.createCardElement(card, `bench${index + 1}`));
            });

            const trashElement = document.getElementById(`trashPile${player}`);
            trashElement.innerHTML = '';
            if (playerData.trash.length > 0) {
                const topCard = playerData.trash[playerData.trash.length - 1];
                trashElement.appendChild(this.createCardElement(topCard, 'trash'));
            }
        }
    }

    createCardElement(card, zone, index = null) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${!card.faceUp ? 'face-down' : ''} card-draw-animation`;
        cardDiv.dataset.zone   = zone;
        cardDiv.dataset.player = card.player;
        if (index !== null) cardDiv.dataset.index = index;

        const backImageUrl = '/api/image/back';

        if (card.faceUp && card.imageUrl) {
            const img = new Image();
            img.onload = () => {
                cardDiv.style.backgroundImage    = `url('${card.imageUrl}')`;
                cardDiv.style.backgroundSize     = 'cover';
                cardDiv.style.backgroundPosition = 'center';
            };
            img.onerror = () => {
                cardDiv.style.backgroundImage    = `url('${backImageUrl}')`;
                cardDiv.style.backgroundSize     = 'cover';
                cardDiv.style.backgroundPosition = 'center';
            };
            img.src = card.imageUrl;
            cardDiv.innerHTML = `
                <div class="card-overlay">
                    ${card.damage > 0 ? `<div class="damage-counter">${card.damage}</div>` : ''}
                    ${card.condition ? `<div class="condition-indicator">${card.condition[0]}</div>` : ''}
                </div>
            `;
        } else if (card.faceUp) {
            cardDiv.innerHTML = `
                <div class="card-name">${card.name}</div>
                <div class="card-type">${card.type}</div>
                ${card.damage > 0 ? `<div class="damage-counter">${card.damage}</div>` : ''}
                ${card.condition ? `<div class="condition-indicator">${card.condition[0]}</div>` : ''}
            `;
        } else {
            // 裏面
            cardDiv.style.backgroundImage    = `url('${backImageUrl}')`;
            cardDiv.style.backgroundSize     = 'cover';
            cardDiv.style.backgroundPosition = 'center';
        }

        cardDiv.style.border = card.player === 1 ? '2px solid #ff6b6b' : '2px solid #4ecdc4';

        cardDiv.addEventListener('click', () => {
            this.currentPlayer = card.player;
            this.players[card.player].selectedCard = card;
            this.showCardModal(card);
        });

        return cardDiv;
    }

    showMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: #667eea; color: white;
            padding: 1rem; border-radius: 5px;
            z-index: 2000; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            max-width: 300px; word-break: break-word;
        `;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PokemonCardGame();
});
