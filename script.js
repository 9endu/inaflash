// ===== App State =====
let decks = JSON.parse(localStorage.getItem('flashcardDecks')) || [];
let currentDeckId = null;
let currentCardIndex = 0;
let quizCards = [];
let quizScore = 0;
let examCards = []; // Changed from examQuestions to examCards
let currentExamIndex = 0;
let examScore = 0;
let examAttempts = []; // Track attempts for each card
let examTimer = null;
let examTimeLeft = 1800; // 30 minutes in seconds
let examSettings = {
  timeLimit: 1800,
  questionCount: 10,
  passPercentage: 70,
  maxAttempts: 2, // How many times user can try each question
  showHint: true, // Whether to show hints
  immediateFeedback: true // Show if answer is right/wrong immediately
};
let userExamAnswer = ''; // User's typed answer

// ===== DOM Elements =====
const deckScreen = document.getElementById('deckScreen');
const editorScreen = document.getElementById('editorScreen');
const studyScreen = document.getElementById('studyScreen');
const quizScreen = document.getElementById('quizScreen');
const examScreen = document.getElementById('examScreen');
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
const examQuestion = document.getElementById('examQuestion');
const examOptions = document.getElementById('examOptions');
const examTimerElement = document.getElementById('examTimer');
const examProgress = document.getElementById('examProgress');
const examScoreElement = document.getElementById('examScore');
const prevExamBtn = document.getElementById('prevExamBtn');
const nextExamBtn = document.getElementById('nextExamBtn');
const submitExamBtn = document.getElementById('submitExamBtn');

// Add these new exam elements
const examAnswerInput = document.createElement('textarea');
const checkAnswerBtn = document.createElement('button');
const showHintBtn = document.createElement('button');
const hintContainer = document.createElement('div');
const examResult = document.createElement('div');

// ===== Initialize =====
renderDecks();
setupEventListeners();

// Load exam settings if saved
const savedExamSettings = localStorage.getItem('examSettings');
if (savedExamSettings) {
  examSettings = JSON.parse(savedExamSettings);
}

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

// ===== Exam Mode (Spaced Repetition Style) =====
function showExamSettings() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>Exam Settings</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="examTime">Time Limit (minutes):</label>
          <input type="number" id="examTime" min="5" max="120" value="${examSettings.timeLimit / 60}">
        </div>
        <div class="form-group">
          <label for="questionCount">Number of Questions:</label>
          <input type="number" id="questionCount" min="5" max="50" value="${examSettings.questionCount}">
        </div>
        <div class="form-group">
          <label for="passPercentage">Pass Percentage:</label>
          <input type="number" id="passPercentage" min="50" max="100" value="${examSettings.passPercentage}">
        </div>
        <div class="form-group">
          <label for="maxAttempts">Max Attempts per Question:</label>
          <input type="number" id="maxAttempts" min="1" max="5" value="${examSettings.maxAttempts}">
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="showHint" ${examSettings.showHint ? 'checked' : ''}>
            Show Hints
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="immediateFeedback" ${examSettings.immediateFeedback ? 'checked' : ''}>
            Immediate Feedback
          </label>
        </div>
      </div>
      <div class="form-actions">
        <button class="secondary-btn cancel-btn">Cancel</button>
        <button class="primary-btn start-exam-btn">Start Exam</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
  modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
  
  modal.querySelector('.start-exam-btn').addEventListener('click', () => {
    const timeMinutes = parseInt(modal.querySelector('#examTime').value) || 30;
    const questionCount = parseInt(modal.querySelector('#questionCount').value) || 10;
    const passPercentage = parseInt(modal.querySelector('#passPercentage').value) || 70;
    const maxAttempts = parseInt(modal.querySelector('#maxAttempts').value) || 2;
    const showHint = modal.querySelector('#showHint').checked;
    const immediateFeedback = modal.querySelector('#immediateFeedback').checked;
    
    examSettings = {
      timeLimit: timeMinutes * 60,
      questionCount: Math.min(questionCount, 50),
      passPercentage: Math.min(Math.max(passPercentage, 50), 100),
      maxAttempts: Math.min(Math.max(maxAttempts, 1), 5),
      showHint,
      immediateFeedback
    };
    
    modal.remove();
    startExamMode();
  });
}

function startExamMode() {
  const deck = decks.find(d => d.id === currentDeckId);
  if (deck.cards.length < 3) {
    alert('Need at least 3 cards for an exam!');
    return;
  }
  
  // Select random cards for the exam
  examCards = [...deck.cards]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(examSettings.questionCount, deck.cards.length));
  
  // Initialize attempts for each card
  examAttempts = examCards.map(() => ({
    attempts: 0,
    correct: false,
    userAnswers: [],
    lastAttempt: null,
    hintShown: false
  }));
  
  // Initialize exam state
  currentExamIndex = 0;
  examScore = 0;
  userExamAnswer = '';
  
  // Setup timer
  examTimeLeft = examSettings.timeLimit;
  startExamTimer();
  
  // Setup exam UI
  setupExamUI();
  loadExamQuestion();
  switchScreen(editorScreen, examScreen);
}

function setupExamUI() {
  // Clear existing UI
  examQuestion.innerHTML = '';
  examOptions.innerHTML = '';
  
  // Create answer input
  examAnswerInput.id = 'examAnswerInput';
  examAnswerInput.className = 'exam-answer-input';
  examAnswerInput.placeholder = 'Type your answer here...';
  examAnswerInput.rows = 4;
  
  // Create check answer button
  checkAnswerBtn.id = 'checkAnswerBtn';
  checkAnswerBtn.className = 'primary-btn';
  checkAnswerBtn.innerHTML = '<i class="fas fa-check"></i> Check Answer';
  
  // Create hint button
  showHintBtn.id = 'showHintBtn';
  showHintBtn.className = 'secondary-btn';
  showHintBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Show Hint';
  showHintBtn.style.display = examSettings.showHint ? '' : 'none';
  
  // Create hint container
  hintContainer.id = 'hintContainer';
  hintContainer.className = 'hint-container hidden';
  
  // Create result container
  examResult.id = 'examResult';
  examResult.className = 'exam-result hidden';
  
  // Add elements to exam container
  examQuestion.appendChild(examAnswerInput);
  examOptions.appendChild(checkAnswerBtn);
  examOptions.appendChild(showHintBtn);
  examOptions.appendChild(hintContainer);
  examOptions.appendChild(examResult);
  
  // Set up event listeners for exam
  checkAnswerBtn.addEventListener('click', checkExamAnswer);
  showHintBtn.addEventListener('click', showHint);
  examAnswerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      checkExamAnswer();
    }
  });
}

function loadExamQuestion() {
  if (currentExamIndex >= examCards.length) {
    showExamResults();
    return;
  }
  
  const card = examCards[currentExamIndex];
  const attempts = examAttempts[currentExamIndex];
  
  // Clear previous state
  examAnswerInput.value = userExamAnswer;
  examResult.classList.add('hidden');
  hintContainer.classList.add('hidden');
  examResult.innerHTML = '';
  
  // Update UI
  examProgress.textContent = `Question ${currentExamIndex + 1}/${examCards.length}`;
  
  // Create question display
  const questionDisplay = document.createElement('div');
  questionDisplay.className = 'exam-question-display';
  questionDisplay.innerHTML = marked.parse(`**Question ${currentExamIndex + 1}:** ${card.front}`);
  
  // Show attempts info
  const attemptsInfo = document.createElement('div');
  attemptsInfo.className = 'attempts-info';
  attemptsInfo.textContent = `Attempts: ${attempts.attempts}/${examSettings.maxAttempts}`;
  
  // Clear question area and add new content
  const questionContainer = document.querySelector('.exam-question');
  questionContainer.innerHTML = '';
  questionContainer.appendChild(questionDisplay);
  questionContainer.appendChild(attemptsInfo);
  questionContainer.appendChild(examAnswerInput);
  
  // Update buttons state
  checkAnswerBtn.disabled = false;
  checkAnswerBtn.innerHTML = '<i class="fas fa-check"></i> Check Answer';
  showHintBtn.disabled = attempts.hintShown;
  
  // Focus answer input
  setTimeout(() => {
    examAnswerInput.focus();
  }, 100);
}

function showHint() {
  const card = examCards[currentExamIndex];
  const attempts = examAttempts[currentExamIndex];
  
  if (attempts.hintShown) return;
  
  // Create a hint (show first few words of answer)
  const answerWords = card.back.split(' ');
  const hintLength = Math.max(3, Math.floor(answerWords.length * 0.3));
  const hint = answerWords.slice(0, hintLength).join(' ') + '...';
  
  hintContainer.innerHTML = `<strong>Hint:</strong> ${hint}`;
  hintContainer.classList.remove('hidden');
  attempts.hintShown = true;
  showHintBtn.disabled = true;
}

function checkExamAnswer() {
  const card = examCards[currentExamIndex];
  const attempts = examAttempts[currentExamIndex];
  
  userExamAnswer = examAnswerInput.value.trim();
  
  if (!userExamAnswer) {
    alert('Please enter an answer!');
    return;
  }
  
  attempts.attempts++;
  attempts.userAnswers.push(userExamAnswer);
  attempts.lastAttempt = new Date();
  
  // Check if answer is correct (case-insensitive, allows for minor variations)
  const isCorrect = isAnswerCorrect(userExamAnswer, card.back);
  
  if (isCorrect) {
    attempts.correct = true;
    examScore++;
    showAnswerResult(true, card.back);
  } else {
    if (attempts.attempts >= examSettings.maxAttempts) {
      showAnswerResult(false, card.back);
    } else {
      showAttemptFeedback(false);
    }
  }
}

function isAnswerCorrect(userAnswer, correctAnswer) {
  // Simple matching - can be enhanced for better matching
  const normalizedUser = userAnswer.toLowerCase().trim();
  const normalizedCorrect = correctAnswer.toLowerCase().trim();
  
  // Exact match
  if (normalizedUser === normalizedCorrect) return true;
  
  // Contains match (if user answer is part of correct answer or vice versa)
  if (normalizedCorrect.includes(normalizedUser) || 
      normalizedUser.includes(normalizedCorrect)) {
    return normalizedUser.length >= normalizedCorrect.length * 0.7; // At least 70% match
  }
  
  // Word overlap (for longer answers)
  const userWords = new Set(normalizedUser.split(/\s+/));
  const correctWords = new Set(normalizedCorrect.split(/\s+/));
  const commonWords = [...userWords].filter(word => correctWords.has(word));
  const overlap = commonWords.length / correctWords.size;
  
  return overlap >= 0.7; // At least 70% word overlap
}

function showAnswerResult(isCorrect, correctAnswer) {
  examResult.classList.remove('hidden');
  
  if (isCorrect) {
    examResult.innerHTML = `
      <div class="result-correct">
        <i class="fas fa-check-circle"></i>
        <strong>Correct!</strong>
        <p>Your answer was right.</p>
      </div>
    `;
    examResult.className = 'exam-result result-correct';
    
    // Auto-advance after delay if immediate feedback is enabled
    if (examSettings.immediateFeedback) {
      setTimeout(() => {
        nextExamQuestion();
      }, 1500);
    }
  } else {
    examResult.innerHTML = `
      <div class="result-incorrect">
        <i class="fas fa-times-circle"></i>
        <strong>Incorrect!</strong>
        <p><strong>Correct answer:</strong> ${marked.parse(correctAnswer)}</p>
        <p><strong>Your answer:</strong> ${userExamAnswer}</p>
      </div>
    `;
    examResult.className = 'exam-result result-incorrect';
  }
  
  // Disable check button after max attempts
  const attempts = examAttempts[currentExamIndex];
  if (attempts.attempts >= examSettings.maxAttempts) {
    checkAnswerBtn.disabled = true;
    checkAnswerBtn.innerHTML = '<i class="fas fa-ban"></i> Max Attempts Reached';
  }
}

function showAttemptFeedback(isCorrect) {
  examResult.classList.remove('hidden');
  
  if (isCorrect) {
    examResult.innerHTML = `
      <div class="result-attempt">
        <i class="fas fa-redo"></i>
        <strong>Try Again!</strong>
        <p>That's not quite right. Try again or use a hint.</p>
      </div>
    `;
  } else {
    examResult.innerHTML = `
      <div class="result-attempt">
        <i class="fas fa-redo"></i>
        <strong>Try Again!</strong>
        <p>You have ${examSettings.maxAttempts - examAttempts[currentExamIndex].attempts} attempt(s) left.</p>
      </div>
    `;
  }
  examResult.className = 'exam-result result-attempt';
  
  // Clear input for next attempt
  examAnswerInput.value = '';
  setTimeout(() => {
    examAnswerInput.focus();
  }, 100);
}

function nextExamQuestion() {
  userExamAnswer = '';
  currentExamIndex++;
  loadExamQuestion();
}

function prevExamQuestion() {
  if (currentExamIndex > 0) {
    currentExamIndex--;
    userExamAnswer = examAttempts[currentExamIndex].userAnswers.slice(-1)[0] || '';
    loadExamQuestion();
  }
}

function showExamResults() {
  clearInterval(examTimer);
  
  const totalQuestions = examCards.length;
  const percentage = Math.round((examScore / totalQuestions) * 100);
  const passed = percentage >= examSettings.passPercentage;
  
  // Create detailed results
  let resultsHTML = `
    <h3>Exam Complete!</h3>
    <div class="exam-summary ${passed ? 'passed' : 'failed'}">
      <h4>Final Score: ${examScore}/${totalQuestions} (${percentage}%)</h4>
      <p>${passed ? '🎉 Congratulations! You passed!' : '📚 Keep studying! You can do better next time.'}</p>
    </div>
    
    <div class="detailed-results">
      <h4>Detailed Results:</h4>
  `;
  
  examCards.forEach((card, index) => {
    const attempts = examAttempts[index];
    const isCorrect = attempts.correct;
    
    resultsHTML += `
      <div class="question-result ${isCorrect ? 'correct' : 'incorrect'}">
        <strong>Q${index + 1}:</strong> ${card.front.substring(0, 50)}${card.front.length > 50 ? '...' : ''}
        <br>
        <small>Attempts: ${attempts.attempts} | Status: ${isCorrect ? '✓ Correct' : '✗ Incorrect'}</small>
      </div>
    `;
  });
  
  resultsHTML += '</div>';
  
  examQuestion.innerHTML = resultsHTML;
  examOptions.innerHTML = '';
  examTimerElement.textContent = 'Exam Finished';
  
  // Add review buttons
  const reviewBtn = document.createElement('button');
  reviewBtn.className = 'primary-btn';
  reviewBtn.innerHTML = '<i class="fas fa-redo"></i> Review Incorrect Cards';
  reviewBtn.addEventListener('click', reviewIncorrectCards);
  
  const doneBtn = document.createElement('button');
  doneBtn.className = 'secondary-btn';
  doneBtn.innerHTML = '<i class="fas fa-home"></i> Return to Deck';
  doneBtn.addEventListener('click', exitExamMode);
  
  examOptions.appendChild(reviewBtn);
  examOptions.appendChild(doneBtn);
}

function reviewIncorrectCards() {
  // Get incorrect cards
  const incorrectCards = examCards.filter((card, index) => !examAttempts[index].correct);
  
  if (incorrectCards.length === 0) {
    alert('All cards were correct! Great job!');
    return;
  }
  
  // Start a study session with incorrect cards
  examCards = incorrectCards;
  examAttempts = incorrectCards.map(() => ({
    attempts: 0,
    correct: false,
    userAnswers: [],
    lastAttempt: null,
    hintShown: false
  }));
  
  currentExamIndex = 0;
  examScore = 0;
  userExamAnswer = '';
  
  // Reset timer for review
  examTimeLeft = Math.min(incorrectCards.length * 60, 600); // 1 min per card, max 10 min
  startExamTimer();
  
  setupExamUI();
  loadExamQuestion();
}

function startExamTimer() {
  clearInterval(examTimer);
  
  examTimer = setInterval(() => {
    examTimeLeft--;
    updateExamTimerDisplay();
    
    if (examTimeLeft <= 0) {
      clearInterval(examTimer);
      // Auto-submit exam when time runs out
      showExamResults();
    }
    
    // Add warning class when time is running out
    if (examTimeLeft <= 300) { // 5 minutes
      examTimerElement.classList.add('warning');
    }
  }, 1000);
}

function updateExamTimerDisplay() {
  const minutes = Math.floor(examTimeLeft / 60);
  const seconds = examTimeLeft % 60;
  examTimerElement.textContent = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function exitExamMode() {
  clearInterval(examTimer);
  examTimerElement.classList.remove('warning');
  switchScreen(examScreen, editorScreen);
}

// ===== Utility Functions =====
function switchScreen(from, to) {
  from.classList.add('hidden');
  to.classList.remove('hidden');

   // Special handling for exam screen
  if (to === examScreen) {
    // Reset exam UI if needed
    examTimerElement.classList.remove('warning');
    examScoreElement.classList.add('hidden');
    prevExamBtn.style.display = '';
    nextExamBtn.style.display = '';
    submitExamBtn.style.display = 'none'; // We don't use submit button in this format
  }
}

function saveDecks() {
  localStorage.setItem('flashcardDecks', JSON.stringify(decks));
  localStorage.setItem('examSettings', JSON.stringify(examSettings));
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
  document.getElementById('examBtn').addEventListener('click', showExamSettings);
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

  // Exam Screen
  document.getElementById('prevExamBtn').addEventListener('click', prevExamQuestion);
  document.getElementById('nextExamBtn').addEventListener('click', nextExamQuestion);
  document.getElementById('exitExamBtn').addEventListener('click', exitExamMode);
  
  // Header Actions
  document.getElementById('toggleThemeBtn').addEventListener('click', toggleTheme);
  document.getElementById('exportBtn').addEventListener('click', exportDecks);
  document.getElementById('importBtn').addEventListener('click', importDecks);
}