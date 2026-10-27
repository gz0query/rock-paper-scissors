"use strict";

const choices = ["rock", "paper", "scissors"];
const winningMoves = {
  rock: "scissors",
  paper: "rock",
  scissors: "paper"
};
const scoreStorageKey = "rps-scores";
const playerNameStorageKey = "rps-player-name";
const animationDuration = 520;

const playerScoreElement = document.getElementById("player-score");
const cpuScoreElement = document.getElementById("cpu-score");
const tiesScoreElement = document.getElementById("ties-score");
const playerNameElement = document.getElementById("player-name");
const scoreboardElement = document.getElementById("scoreboard");
const playerView = document.getElementById("player-view");
const cpuView = document.getElementById("cpu-view");
const playerMoveName = document.getElementById("player-move-name");
const cpuMoveName = document.getElementById("cpu-move-name");
const playerFighter = document.getElementById("player-fighter");
const cpuFighter = document.getElementById("cpu-fighter");
const outcomeBanner = document.getElementById("outcome");
const outcomeText = document.getElementById("outcome-text");
const roundLabel = document.getElementById("round-label");
const moveButtons = Array.from(document.querySelectorAll(".move-button"));
const resetButton = document.getElementById("reset-button");
const onboarding = document.getElementById("onboarding");
const nameForm = document.getElementById("name-form");
const nameInput = document.getElementById("name-input");
const nameError = document.getElementById("name-error");
const tourLayer = document.getElementById("tour-layer");
const tourTooltip = document.getElementById("tour-tooltip");
const tourStepLabel = document.getElementById("tour-step-label");
const tourTitle = document.getElementById("tour-title");
const tourDescription = document.getElementById("tour-description");
const tourDots = Array.from(document.querySelectorAll(".tour-dots i"));
const tourNextButton = document.getElementById("tour-next");
const tourSkipButton = document.getElementById("tour-skip");
const tourSteps = [
  {
    selector: "#scoreboard",
    title: "Your scoreboard",
    description: "Track your wins and losses here."
  },
  {
    selector: "#battle-arena",
    title: "The battle arena",
    description: "Watch the battle unfold here."
  },
  {
    selector: "#control-panel",
    title: "Choose your weapon",
    description: "Choose your weapon to strike!"
  }
];

function isValidScore(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function loadScores() {
  try {
    const storedScores = localStorage.getItem(scoreStorageKey);
    if (!storedScores) {
      return { player: 0, cpu: 0, ties: 0 };
    }

    const parsedScores = JSON.parse(storedScores);
    if (
      parsedScores &&
      isValidScore(parsedScores.player) &&
      isValidScore(parsedScores.cpu) &&
      isValidScore(parsedScores.ties)
    ) {
      return parsedScores;
    }

    console.warn("Saved game scores were invalid and have been reset.");
  } catch (error) {
    console.warn("Saved game scores could not be loaded.", error);
  }

  return { player: 0, cpu: 0, ties: 0 };
}

let scores = loadScores();
let activeRoundTimer = null;
let roundNumber = 1;
let activeTourStep = -1;
let playerName = loadPlayerName();

function loadPlayerName() {
  try {
    const storedName = localStorage.getItem(playerNameStorageKey);
    return typeof storedName === "string" ? storedName.trim().slice(0, 24) : "";
  } catch (error) {
    console.warn("Saved player name could not be loaded.", error);
    return "";
  }
}

function setPlayerName(name) {
  playerName = name;
  playerNameElement.textContent = name;
  scoreboardElement.setAttribute("aria-label", `${name} vs CPU scoreboard`);
}

function showNameError(message) {
  nameError.textContent = message;
  nameError.hidden = !message;
}

function getTourTarget() {
  return document.querySelector(tourSteps[activeTourStep].selector);
}

function positionTourTooltip() {
  if (activeTourStep < 0 || tourLayer.hidden) {
    return;
  }

  const target = getTourTarget();
  if (!target) {
    return;
  }

  const targetBounds = target.getBoundingClientRect();
  const tooltipHeight = tourTooltip.getBoundingClientRect().height;
  const belowTop = targetBounds.bottom + 16;
  const availableBelow = window.innerHeight - belowTop - 16;
  const top = availableBelow >= tooltipHeight
    ? belowTop
    : Math.max(16, targetBounds.top - tooltipHeight - 16);

  tourTooltip.style.top = `${top}px`;
}

function renderTourStep() {
  document.querySelectorAll(".tour-highlight").forEach((element) => {
    element.classList.remove("tour-highlight");
  });

  if (activeTourStep >= tourSteps.length) {
    finishTour();
    return;
  }

  const step = tourSteps[activeTourStep];
  const target = getTourTarget();
  if (!target) {
    console.error(`Guided tour target not found: ${step.selector}`);
    finishTour();
    return;
  }

  target.classList.add("tour-highlight");
  tourStepLabel.textContent = `${String(activeTourStep + 1).padStart(2, "0")} / ${String(tourSteps.length).padStart(2, "0")}`;
  tourTitle.textContent = step.title;
  tourDescription.textContent = step.description;
  tourDots.forEach((dot, index) => {
    dot.classList.toggle("is-current", index === activeTourStep);
  });
  tourNextButton.textContent = activeTourStep === tourSteps.length - 1 ? "Finish" : "Next";

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(positionTourTooltip, 350);
}

function startTour() {
  activeTourStep = 0;
  tourLayer.hidden = false;
  renderTourStep();
  tourNextButton.focus();
}

function finishTour() {
  document.querySelectorAll(".tour-highlight").forEach((element) => {
    element.classList.remove("tour-highlight");
  });
  tourLayer.hidden = true;
  tourTooltip.style.top = "";
  activeTourStep = -1;
  moveButtons[0].focus();
}

function saveScores() {
  try {
    localStorage.setItem(scoreStorageKey, JSON.stringify(scores));
  } catch (error) {
    console.warn("Game scores could not be saved.", error);
  }
}

function updateScoreboard() {
  playerScoreElement.textContent = String(scores.player);
  cpuScoreElement.textContent = String(scores.cpu);
  tiesScoreElement.textContent = String(scores.ties);
  saveScores();
}

function getCpuChoice() {
  return choices[Math.floor(Math.random() * choices.length)];
}

function showChoice(container, choice) {
  const iconTemplate = document.getElementById(`icon-${choice}`);
  container.replaceChildren(iconTemplate.content.cloneNode(true));
  container.setAttribute(
    "aria-label",
    `${container === playerView ? "Your" : "CPU"} move: ${choice}`
  );
}

function showPlaceholder(container, label) {
  const placeholder = document.createElement("span");
  placeholder.className = "placeholder-mark";
  placeholder.setAttribute("aria-hidden", "true");
  placeholder.textContent = "?";
  container.replaceChildren(placeholder);
  container.setAttribute("aria-label", label);
}

function clearRoundHighlights() {
  playerFighter.classList.remove("winner", "loser");
  cpuFighter.classList.remove("winner", "loser");
  outcomeBanner.classList.remove("is-player-win", "is-cpu-win", "is-draw");
}

function setOutcome(message, state) {
  outcomeText.textContent = message;
  outcomeBanner.classList.remove("is-player-win", "is-cpu-win", "is-draw");
  if (state) {
    outcomeBanner.classList.add(state);
  }
}

function determineWinner(playerChoice, cpuChoice) {
  if (playerChoice === cpuChoice) {
    return "draw";
  }

  return winningMoves[playerChoice] === cpuChoice ? "player" : "cpu";
}

function finishRound(playerChoice, cpuChoice) {
  const winner = determineWinner(playerChoice, cpuChoice);

  if (winner === "draw") {
    scores.ties += 1;
    playerFighter.classList.add("winner");
    cpuFighter.classList.add("winner");
    setOutcome("Draw round. Both sides chose " + playerChoice + ".", "is-draw");
  } else if (winner === "player") {
    scores.player += 1;
    playerFighter.classList.add("winner");
    cpuFighter.classList.add("loser");
    setOutcome("You win! " + playerChoice + " beats " + cpuChoice + ".", "is-player-win");
  } else {
    scores.cpu += 1;
    cpuFighter.classList.add("winner");
    playerFighter.classList.add("loser");
    setOutcome("CPU wins. " + cpuChoice + " beats " + playerChoice + ".", "is-cpu-win");
  }

  updateScoreboard();
  moveButtons.forEach((button) => {
    button.disabled = false;
  });
}

function play(playerChoice) {
  if (!choices.includes(playerChoice) || activeRoundTimer !== null) {
    return;
  }

  const cpuChoice = getCpuChoice();
  clearRoundHighlights();
  moveButtons.forEach((button) => {
    button.disabled = true;
  });

  showChoice(playerView, playerChoice);
  playerMoveName.textContent = playerChoice;
  cpuView.replaceChildren();
  cpuView.setAttribute("aria-label", "CPU is choosing");
  cpuMoveName.textContent = "Choosing...";
  roundLabel.textContent = `ROUND ${String(roundNumber).padStart(2, "0")}`;
  roundNumber += 1;
  setOutcome("The CPU is making its move...", "");

  activeRoundTimer = window.setTimeout(() => {
    showChoice(cpuView, cpuChoice);
    cpuMoveName.textContent = cpuChoice;
    finishRound(playerChoice, cpuChoice);
    activeRoundTimer = null;
  }, animationDuration);
}

function resetGame() {
  if (activeRoundTimer !== null) {
    window.clearTimeout(activeRoundTimer);
    activeRoundTimer = null;
  }

  scores = { player: 0, cpu: 0, ties: 0 };
  roundNumber = 1;
  showPlaceholder(playerView, "Your move");
  showPlaceholder(cpuView, "CPU move");
  playerMoveName.textContent = "Choose a move";
  cpuMoveName.textContent = "Waiting on CPU";
  roundLabel.textContent = "READY FOR ROUND 01";
  clearRoundHighlights();
  setOutcome("Choose your move to begin", "");
  moveButtons.forEach((button) => {
    button.disabled = false;
  });
  updateScoreboard();
}

moveButtons.forEach((button) => {
  button.addEventListener("click", () => {
    play(button.dataset.choice);
  });
});

resetButton.addEventListener("click", resetGame);

nameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = nameInput.value.trim().slice(0, 24);
  if (!name) {
    showNameError("Enter a name to continue.");
    nameInput.focus();
    return;
  }

  try {
    localStorage.setItem(playerNameStorageKey, name);
  } catch (error) {
    console.error("Player name could not be saved.", error);
    showNameError("Your name could not be saved. Check your browser storage settings and try again.");
    return;
  }

  setPlayerName(name);
  showNameError("");
  onboarding.hidden = true;
  startTour();
});

nameInput.addEventListener("input", () => {
  if (nameInput.value.trim()) {
    showNameError("");
  }
});

tourNextButton.addEventListener("click", () => {
  activeTourStep += 1;
  renderTourStep();
  if (activeTourStep >= 0) {
    tourNextButton.focus();
  }
});

tourSkipButton.addEventListener("click", finishTour);

document.addEventListener("keydown", (event) => {
  if (onboarding.hidden && !tourLayer.hidden) {
    if (event.key === "Escape") {
      finishTour();
    } else if (event.key === "Tab") {
      const focusableElements = [tourSkipButton, tourNextButton];
      const currentIndex = focusableElements.indexOf(document.activeElement);
      const direction = event.shiftKey ? -1 : 1;
      const nextIndex = (currentIndex + direction + focusableElements.length) % focusableElements.length;
      event.preventDefault();
      focusableElements[nextIndex].focus();
    }
    return;
  }

  if (!onboarding.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
    } else if (event.key === "Tab") {
      const focusableElements = [nameInput, nameForm.querySelector(".enter-button")];
      const currentIndex = focusableElements.indexOf(document.activeElement);
      const direction = event.shiftKey ? -1 : 1;
      const nextIndex = (currentIndex + direction + focusableElements.length) % focusableElements.length;
      event.preventDefault();
      focusableElements[nextIndex].focus();
    }
  }
});

window.addEventListener("resize", positionTourTooltip);

updateScoreboard();

if (playerName) {
  setPlayerName(playerName);
} else {
  onboarding.hidden = false;
  nameInput.focus();
}
