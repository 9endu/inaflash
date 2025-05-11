// ===== App State =====
let decks = JSON.parse(localStorage.getItem('flashcardDecks')) || [];
let currentDeckId = null;
let currentCardIndex = 0;
let quizCards = [];
let quizScore = 0;

// ===== DOM Elements =====
const deckScreen = document.getElementById('deckScreen');
const editorScreen = document.getElementById('editorScreen');
const studyScreen = document.getElementById('studyScreen');
const quizScreen = document.getElementById('quizScreen');
const decksContainer = document.getElementById('decksContainer');
const cardsContainer = document.getElementById('cardsContainer');
const currentDeckName = document.getElementById('currentDeckName');
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('cardFront');
const cardBack = document.getElementById('cardBack');
const progress = document.getElementById('progress');
const quizQuestion = document.getElementById('quizQuestion');
const quizOptions = document.getElementById('quizOptions');
const quizScoreElement = document.getElementById('quizScore');

// ===== Initialize =====
renderDecks();
setupEventListeners();

// ===== Core Functions =====
function renderDecks() {
  decksContainer.innerHTML = '';
  decks.forEach(deck => {
    decksContainer.appendChild(createDeckElement(deck));
  });
}

function createDeckElement(deck) {
  const deckElement = document.createElement('div');
  deckElement.className = 'deck';
  deckElement.dataset.id = deck.id;
  
  const deckTitle = document.createElement('h3');
  deckTitle.textContent = deck.name;
  deckTitle.className = 'deck-title';
  
  const deckActions = document.createElement('div');
  deckActions.className = 'deck-actions';
  
  const editBtn = document.createElement('button');
  editBtn.className = 'icon-btn';
  editBtn.innerHTML = '<i class="fas fa-edit"></i>';
  editBtn.title = 'Edit Deck Name';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    editDeckName(deck.id, deckTitle);
  });
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'icon-btn';
  deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
  deleteBtn.title = 'Delete Deck';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteDeck(deck.id);
  });
  
  deckActions.appendChild(editBtn);
  deckActions.appendChild(deleteBtn);
  
  const cardCount = document.createElement('p');
  cardCount.textContent = `${deck.cards.length} cards`;
  
  deckElement.appendChild(deckTitle);
  deckElement.appendChild(cardCount);
  deckElement.appendChild(deckActions);
  
  deckElement.addEventListener('click', () => openDeck(deck.id));
  
  return deckElement;
}

function editDeckName(deckId, titleElement) {
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return;
  
  const currentName = deck.name;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentName;
  input.className = 'deck-name-input';
  
  // Replace the title with input
  titleElement.replaceWith(input);
  input.focus();
  
  function saveName() {
    const newName = input.value.trim();
    if (newName && newName !== currentName) {
      deck.name = newName;
      saveDecks();
      
      // Update the title
      titleElement.textContent = newName;
      document.getElementById('currentDeckName').textContent = newName;
    }
    input.replaceWith(titleElement);
  }
  
  input.addEventListener('blur', saveName);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveName();
    }
  });
}

function deleteDeck(deckId) {
  if (confirm('Delete this deck and all its cards?')) {
    decks = decks.filter(deck => deck.id !== deckId);
    saveDecks();
    renderDecks();
    // If we were viewing this deck, go back to deck screen
    if (currentDeckId === deckId) {
      switchScreen(editorScreen, deckScreen);
      currentDeckId = null;
    }
  }
}

function createNewDeck() {
  const deckName = prompt('Enter deck name:');
  if (deckName) {
    const newDeck = {
      id: Date.now().toString(),
      name: deckName,
      cards: []
    };
    decks.push(newDeck);
    saveDecks();
    renderDecks();
  }
}

function openDeck(deckId) {
  currentDeckId = deckId;
  const deck = decks.find(d => d.id === deckId);
  currentDeckName.textContent = deck.name;
  renderCards(deck.cards);
  switchScreen(deckScreen, editorScreen);
}

function renderCards(cards) {
  cardsContainer.innerHTML = '';
  cards.forEach((card, index) => {
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.innerHTML = `
      <textarea class="card-text front" placeholder="Front (e.g., Question)" 
        data-index="${index}" data-side="front">${card.front}</textarea>
      <textarea class="card-text back" placeholder="Back (e.g., Answer)" 
        data-index="${index}" data-side="back">${card.back}</textarea>
      <button class="delete-card" data-index="${index}">
        <i class="fas fa-trash"></i> Delete
      </button>
    `;
    cardsContainer.appendChild(cardElement);

    // Sync changes to data
    const frontTextarea = cardElement.querySelector('.front');
    const backTextarea = cardElement.querySelector('.back');
    
    frontTextarea.addEventListener('input', (e) => updateCard(index, 'front', e.target.value));
    backTextarea.addEventListener('input', (e) => updateCard(index, 'back', e.target.value));
    
    cardElement.querySelector('.delete-card').addEventListener('click', () => deleteCard(index));
  });
}

function addNewCard() {
  if (!currentDeckId) return;
  decks = decks.map(deck => {
    if (deck.id === currentDeckId) {
      deck.cards.push({ front: '', back: '' });
    }
    return deck;
  });
  saveDecks();
  renderCards(decks.find(d => d.id === currentDeckId).cards);
  // Scroll to bottom
  cardsContainer.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
}

function updateCard(index, side, value) {
  decks = decks.map(deck => {
    if (deck.id === currentDeckId) {
      deck.cards[index][side] = value;
    }
    return deck;
  });
  saveDecks();
}

function deleteCard(index) {
  if (confirm('Delete this card?')) {
    decks = decks.map(deck => {
      if (deck.id === currentDeckId) {
        deck.cards.splice(index, 1);
      }
      return deck;
    });
    saveDecks();
    renderCards(decks.find(d => d.id === currentDeckId).cards);
  }
}

// ===== Study Mode =====
function startStudyMode() {
  const deck = decks.find(d => d.id === currentDeckId);
  if (deck.cards.length === 0) {
    alert('Add cards first!');
    return;
  }
  currentCardIndex = 0;
  showCurrentCard();
  switchScreen(editorScreen, studyScreen);
}

function showCurrentCard() {
  const deck = decks.find(d => d.id === currentDeckId);
  if (!deck || !deck.cards[currentCardIndex]) return;
  
  cardFront.innerHTML = deck.cards[currentCardIndex].front.replace(/\n/g, '<br>');
  cardBack.innerHTML = deck.cards[currentCardIndex].back.replace(/\n/g, '<br>');
  flashcard.classList.remove('flipped');
  progress.textContent = `${currentCardIndex + 1}/${deck.cards.length}`;
}

function flipCard() {
  flashcard.classList.toggle('flipped');
}

function nextCard() {
  const deck = decks.find(d => d.id === currentDeckId);
  currentCardIndex = (currentCardIndex + 1) % deck.cards.length;
  showCurrentCard();
}

function prevCard() {
  const deck = decks.find(d => d.id === currentDeckId);
  currentCardIndex = (currentCardIndex - 1 + deck.cards.length) % deck.cards.length;
  showCurrentCard();
}

function shuffleCards() {
  const deck = decks.find(d => d.id === currentDeckId);
  // Fisher-Yates shuffle
  for (let i = deck.cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck.cards[i], deck.cards[j]] = [deck.cards[j], deck.cards[i]];
  }
  saveDecks();
  currentCardIndex = 0;
  showCurrentCard();
}

function exitStudyMode() {
  switchScreen(studyScreen, editorScreen);
}

// ===== Quiz Mode =====
function startQuizMode() {
  const deck = decks.find(d => d.id === currentDeckId);
  if (deck.cards.length < 2) {
    alert('Need at least 2 cards for a quiz!');
    return;
  }
  quizCards = [...deck.cards];
  quizScore = 0;
  nextQuizQuestion();
  switchScreen(editorScreen, quizScreen);
}

function nextQuizQuestion() {
  document.getElementById('nextQuizBtn').classList.add('hidden');
  quizOptions.innerHTML = '';

  if (quizCards.length === 0) {
    quizQuestion.innerHTML = '<h3>Quiz Complete!</h3>';
    quizScoreElement.textContent = `Final Score: ${quizScore}`;
    return;
  }

  const currentQuizCard = quizCards.pop();
  quizQuestion.innerHTML = marked.parse(`**Question:** ${currentQuizCard.front}`);

  // Get 3 random wrong answers + correct answer
  const allCards = decks.find(d => d.id === currentDeckId).cards;
  const wrongAnswers = allCards
    .filter(card => card.back !== currentQuizCard.back)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(card => card.back);

  const options = [...wrongAnswers, currentQuizCard.back].sort(() => Math.random() - 0.5);

  options.forEach(option => {
    const optionElement = document.createElement('div');
    optionElement.className = 'quiz-option';
    optionElement.innerHTML = marked.parse(option);
    optionElement.addEventListener('click', () => {
      if (option === currentQuizCard.back) {
        quizScore++;
        optionElement.style.background = '#4CAF50';
      } else {
        optionElement.style.background = '#F44336';
      }
      quizScoreElement.textContent = `Score: ${quizScore}/${quizScore + quizCards.length}`;
      document.getElementById('nextQuizBtn').classList.remove('hidden');
    });
    quizOptions.appendChild(optionElement);
  });
}

function exitQuizMode() {
  switchScreen(quizScreen, editorScreen);
}

// ===== Utility Functions =====
function switchScreen(from, to) {
  from.classList.add('hidden');
  to.classList.remove('hidden');
}

function saveDecks() {
  localStorage.setItem('flashcardDecks', JSON.stringify(decks));
}

function exportDecks() {
  const data = JSON.stringify(decks, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flashcard-decks.json';
  a.click();
}

function importDecks() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = event => {
      try {
        decks = JSON.parse(event.target.result);
        saveDecks();
        renderDecks();
        alert('Decks imported successfully!');
      } catch (error) {
        alert('Invalid file format!');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  document.body.classList.toggle('light-mode');
  const icon = document.querySelector('#toggleThemeBtn i');
  if (document.body.classList.contains('dark-mode')) {
    icon.classList.replace('fa-moon', 'fa-sun');
  } else {
    icon.classList.replace('fa-sun', 'fa-moon');
  }
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Deck Screen
  document.getElementById('newDeckBtn').addEventListener('click', createNewDeck);
  
  // Editor Screen
  document.getElementById('addCardBtn').addEventListener('click', addNewCard);
  document.getElementById('studyBtn').addEventListener('click', startStudyMode);
  document.getElementById('quizBtn').addEventListener('click', startQuizMode);
  document.getElementById('backToDecksBtn').addEventListener('click', () => {
    switchScreen(editorScreen, deckScreen);
  });
  
  // Study Screen
  document.getElementById('flipCardBtn').addEventListener('click', flipCard);
  document.getElementById('shuffleBtn').addEventListener('click', shuffleCards);
  document.getElementById('exitStudyBtn').addEventListener('click', exitStudyMode);
  document.getElementById('nextCardBtn').addEventListener('click', nextCard);
  document.getElementById('prevCardBtn').addEventListener('click', prevCard);
  
  // Quiz Screen
  document.getElementById('nextQuizBtn').addEventListener('click', nextQuizQuestion);
  document.getElementById('exitQuizBtn').addEventListener('click', exitQuizMode);
  
  // Header Actions
  document.getElementById('toggleThemeBtn').addEventListener('click', toggleTheme);
  document.getElementById('exportBtn').addEventListener('click', exportDecks);
  document.getElementById('importBtn').addEventListener('click', importDecks);
}