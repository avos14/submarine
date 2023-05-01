(function() {

// Global Constants
	let CONST = {};
CONST.AVAILABLE_SHIPS = ['carrier', 'battleship', 'destroyer', 'submarine', 'patrolboat'];
// You are player 0 and the computer is player 1
// The virtual player is used for generating temporary ships
// for calculating the probability heatmap
CONST.HUMAN_PLAYER = 0;
CONST.COMPUTER_PLAYER = 1;
CONST.VIRTUAL_PLAYER = 2;
// Possible values for the parameter `type` (string)
CONST.CSS_TYPE_EMPTY = 'empty';
CONST.CSS_TYPE_SHIP = 'ship';
CONST.CSS_TYPE_MISS = 'miss';
CONST.CSS_TYPE_HIT = 'hit';
CONST.CSS_TYPE_SUNK = 'sunk';
// Grid code:
CONST.TYPE_EMPTY = 0; // 0 = water (empty)
CONST.TYPE_SHIP = 1; // 1 = undamaged ship
CONST.TYPE_MISS = 2; // 2 = water with a cannonball in it (missed shot)
CONST.TYPE_HIT = 3; // 3 = damaged ship (hit shot)
CONST.TYPE_SUNK = 4; // 4 = sunk ship


// These numbers correspond to CONST.AVAILABLE_SHIPS
// 0) 'carrier' 1) 'battleship' 2) 'destroyer' 3) 'submarine' 4) 'patrolboat'
// This variable is only used when DEBUG_MODE === true.
Game.usedShips = [CONST.UNUSED, CONST.UNUSED, CONST.UNUSED, CONST.UNUSED, CONST.UNUSED];
CONST.USED = 1;
CONST.UNUSED = 0;

// Game manager object
// Constructor
function Game(size) {
	this.setSize(size);
	Game.gameOver = false;
	this.createGrid();
	this.init();
}
	Game.prototype.setSize = function(sizep) {
		Game.size = sizep;
	}

Game.prototype.getSize = function() {
	return Game.size;
}

// Checks if the game is won, and if it is, re-initializes the game
Game.prototype.checkIfWon = function() {
	if (this.computerFleet.allShipsSunk()) {
		do_animation()
		document.getElementById('avos').innerHTML = "<h1>you are the winner!!!</h1>";
		Game.gameOver = true;
		//this.showRestartSidebar();
	} else if (this.humanFleet.allShipsSunk()) {
		alert('Yarr! The computer sank all your ships. Try again.');
		Game.gameOver = true;
		this.showRestartSidebar();
	}
};

// Shoots at the target player on the grid.
// Returns {int} Constants.TYPE: What the shot uncovered
Game.prototype.shoot = function(x, y, targetPlayer) {
	let targetGrid;
	let targetFleet;
	if (targetPlayer === CONST.HUMAN_PLAYER) {
		targetGrid = this.humanGrid;
		targetFleet = this.humanFleet;
	} else if (targetPlayer === CONST.COMPUTER_PLAYER) {
		targetGrid = this.computerGrid;
		targetFleet = this.computerFleet;
	} else {
		// Should never be called
		console.log("There was an error trying to find the correct player to target");
	}

	if (targetGrid.isDamagedShip(x, y)) {
		return null;
	} else if (targetGrid.isMiss(x, y)) {
		return null;
	} else if (targetGrid.isUndamagedShip(x, y)) {
		// update the board/grid
		targetGrid.updateCell(x, y, CONST.CSS_TYPE_HIT, targetPlayer);
		// IMPORTANT: This function needs to be called _after_ updating the cell to a 'hit',
		// because it overrides the CSS class to 'sunk' if we find that the ship was sunk
		targetFleet.findShipByCoords(x, y).incrementDamage(); // increase the damage
		this.checkIfWon();
		return CONST.TYPE_HIT;
	} else {
		targetGrid.updateCell(x, y, CONST.CSS_TYPE_MISS, targetPlayer);
		this.checkIfWon();
		return CONST.TYPE_MISS;
	}
};
// Creates click event listeners on each one of the grid cells
Game.prototype.shootListener = function(e) {
	let self = e.target.self;
	// Extract coordinates from event listener
	let x = str_to_int(e.target.getAttribute('data-x'));
	let y = str_to_int(e.target.getAttribute('data-y'));
	let result = null;
	if (self.readyToPlay) {
		result = self.shoot(x, y, CONST.COMPUTER_PLAYER);

		// Remove the tutorial arrow
		if (gameTutorial.showTutorial) {
			gameTutorial.nextStep();
		}
	}

	if (result !== null && !Game.gameOver) {
		// The AI shoots iff the player clicks on a cell that he/she hasn't
		// already clicked on yet
		self.robot.shoot();
	} else {
		Game.gameOver = false;
	}
};
// Creates click event listeners on each of the ship names in the roster
Game.prototype.rosterListener = function(e) {
	let self = e.target.self;
	// Remove all classes of 'placing' from the fleet roster first
	let roster = document.querySelectorAll('.fleet-roster li');
	for (let i = 0; i < roster.length; i++) {
		let classes = roster[i].getAttribute('class') || '';
		classes = classes.replace('placing', '');
		roster[i].setAttribute('class', classes);
	}

	// Move the highlight to the next step
	if (gameTutorial.currentStep === 1) {
		gameTutorial.nextStep();
	}

	// Set the class of the target ship to 'placing'
	Game.placeShipType = e.target.getAttribute('id');
	document.getElementById(Game.placeShipType).setAttribute('class', 'placing');
	Game.placeShipDirection = str_to_int(document.getElementById('rotate-button').getAttribute('data-direction'));
	self.placingOnGrid = true;
};
// Creates click event listeners on the human player's grid to handle
// ship placement after the user has selected a ship name
Game.prototype.placementListener = function(e) {
	let self = e.target.self;
	if (self.placingOnGrid) {
		// Extract coordinates from event listener
		let x = str_to_int(e.target.getAttribute('data-x'));
		let y = str_to_int(e.target.getAttribute('data-y'));

		// Don't screw up the direction if the user tries to place again.
		let successful = self.humanFleet.placeShip(x, y, Game.placeShipDirection, Game.placeShipType);
		if (successful) {
			// Done placing this ship
			self.endPlacing(Game.placeShipType);

			// Remove the helper arrow
			if (gameTutorial.currentStep === 2) {
				gameTutorial.nextStep();
			}

			self.placingOnGrid = false;
			if (self.areAllShipsPlaced()) {
				let el = document.getElementById('rotate-button');
				el.setAttribute('class', 'invisible');
				if (gameTutorial.showTutorial) {
					document.getElementById('start-game').setAttribute('class', 'highlight');
				} else {
					document.getElementById('start-game').removeAttribute('class');
				}
				document.getElementById('place-randomly').setAttribute('class', 'hidden');
			}
		}
	}
};
// Creates mouseover event listeners that handles mouseover on the
// human player's grid to draw a phantom ship implying that the user
// is allowed to place a ship there
Game.prototype.placementMouseover = function(e) {
	let self = e.target.self;
	if (self.placingOnGrid) {
		let x = str_to_int(e.target.getAttribute('data-x'));
		let y = str_to_int(e.target.getAttribute('data-y'));
		let classes;
		let fleetRoster = self.humanFleet.fleetRoster;

		for (let i = 0; i < fleetRoster.length; i++) {
			let shipType = fleetRoster[i].type;

			if (Game.placeShipType === shipType &&
				fleetRoster[i].isLegal(x, y, Game.placeShipDirection)) {
				// Virtual ship
				fleetRoster[i].create(x, y, Game.placeShipDirection, true);
				Game.placeShipCoords = fleetRoster[i].getAllShipCells();

				for (let j = 0; j < Game.placeShipCoords.length; j++) {
					let el = document.querySelector('.grid-cell-' + Game.placeShipCoords[j].x + '-' + Game.placeShipCoords[j].y);
					classes = el.getAttribute('class');
					// Check if the substring ' grid-ship' already exists to avoid adding it twice
					if (classes.indexOf(' grid-ship') < 0) {
						classes += ' grid-ship';
						el.setAttribute('class', classes);
					}
				}
			}
		}
	}
};
// Creates mouseout event listeners that un-draws the phantom ship
// on the human player's grid as the user hovers over a different cell
Game.prototype.placementMouseout = function(e) {
	let self = e.target.self;
	if (self.placingOnGrid) {
		for (let j = 0; j < Game.placeShipCoords.length; j++) {
			let el = document.querySelector('.grid-cell-' + Game.placeShipCoords[j].x + '-' + Game.placeShipCoords[j].y);
			let classes = el.getAttribute('class');
			// Check if the substring ' grid-ship' already exists to avoid adding it twice
			if (classes.indexOf(' grid-ship') > -1) {
				classes = classes.replace(' grid-ship', '');
				el.setAttribute('class', classes);
			}
		}
	}
};
// Click handler for the Rotate Ship button
Game.prototype.toggleRotation = function(e) {
	// Toggle rotation direction
	let direction = str_to_int(e.target.getAttribute('data-direction'));
	if (direction === Ship.DIRECTION_VERTICAL) {
		e.target.setAttribute('data-direction', '1');
		Game.placeShipDirection = Ship.DIRECTION_HORIZONTAL;
	} else if (direction === Ship.DIRECTION_HORIZONTAL) {
		e.target.setAttribute('data-direction', '0');
		Game.placeShipDirection = Ship.DIRECTION_VERTICAL;
	}
};
// Click handler for the Start Game button
Game.prototype.startGame = function(e) {
	e.target.self.readyToPlay = true;
	document.getElementById('roster-sidebar').setAttribute('class', 'hidden');
	document.getElementById('cheat-sidebar').removeAttribute('class', 'hidden');
	let cheatButton = document.getElementById('cheat');
	cheatButton.addEventListener('click', mainGame.cheat, false);
	cheatButton.self = this;
	let saveButton = document.getElementById('saveGame');
	saveButton.addEventListener('click', mainGame.save, false);
	saveButton.self = this;
	// Advanced the tutorial step
	if (gameTutorial.currentStep === 3) {
		gameTutorial.nextStep();
	}

};
// Click handler for Restart Game button
Game.prototype.restartGame = function(e) {
	e.target.removeEventListener(e.type, arguments.callee);
	let self = e.target.self;
	document.getElementById('restart-sidebar').setAttribute('class', 'hidden');
	self.resetFogOfWar();
	self.init();
};

Game.prototype.cheat = function(e) {
	e.target.removeEventListener(e.type, arguments.callee);
	let self = e.target.self;
	document.getElementById('cheat-sidebar').setAttribute('class', 'hidden');
	// reveal computer fleet
	let grid = mainGame.computerGrid;
	let size = mainGame.getSize();
	for (let i=0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			if (grid.cells[i][j] === CONST.TYPE_SHIP) {
				grid.updateCell(i, j, CONST.CSS_TYPE_SHIP, CONST.COMPUTER_PLAYER);
			}
		}
	}
};

Game.prototype.save = function(e) {
	console.log("saving game");
	let size = mainGame.getSize();
	localStorage.setItem("size", size);
	for (let i=0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			localStorage.setItem("computerGrid-"+i+'-'+j, mainGame.computerGrid.cells[i][j]);
		}
	}
	for (let i=0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			qs = document.querySelector('.human-player .grid-cell-' + i + '-' + j)
			let cellclass = qs.getAttribute('class');
			localStorage.setItem("humanGrid-"+i+'-'+j, cellclass);
		}
	}
	for (let i=0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			localStorage.setItem("virtualGrid-"+i+'-'+j, mainGame.robot.virtualGrid.cells[i][j]);
		}
	}
	for (let i=0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			let qs = document.querySelector('.computer-player' + ' .grid-cell-' + i + '-' + j);
			let cellclass = qs.getAttribute('class');
			localStorage.setItem("visibilityGrid-"+i+'-'+j, cellclass);
		}
	}

	for (let i = 0; i < mainGame.computerFleet.fleetRoster.length; i++) {
		let ship = mainGame.computerFleet.fleetRoster[i];
		localStorage.setItem("computerFleet.ship-"+i+".xPosition", ship.xPosition);
		localStorage.setItem("computerFleet.ship-"+i+".yPosition", ship.yPosition);
		localStorage.setItem("computerFleet.ship-"+i+".damage", ship.damage);
		localStorage.setItem("computerFleet.ship-"+i+".direction", ship.direction);
	}
	for (let i = 0; i < mainGame.humanFleet.fleetRoster.length; i++) {
		let ship = mainGame.humanFleet.fleetRoster[i];
		localStorage.setItem("humanFleet.ship-"+i+".xPosition", ship.xPosition);
		localStorage.setItem("humanFleet.ship-"+i+".yPosition", ship.yPosition);
		localStorage.setItem("humanFleet.ship-"+i+".damage", ship.damage);
		localStorage.setItem("humanFleet.ship-"+i+".direction", ship.direction);
	}
	for (let i = 0; i < mainGame.robot.virtualFleet.fleetRoster.length; i++) {
		let ship = mainGame.robot.virtualFleet.fleetRoster[i];
		localStorage.setItem("virtualFleet.ship-"+i+".xPosition", ship.xPosition);
		localStorage.setItem("virtualFleet.ship-"+i+".yPosition", ship.yPosition);
		localStorage.setItem("virtualFleet.ship-"+i+".damage", ship.damage);
		localStorage.setItem("virtualFleet.ship-"+i+".direction", ship.direction);
	}
}

// Debugging function used to place all ships and just start
Game.prototype.placeRandomly = function(e){
	e.target.removeEventListener(e.type, arguments.callee);
	e.target.self.humanFleet.placeShipsRandomly();
	e.target.self.readyToPlay = true;
	document.getElementById('roster-sidebar').setAttribute('class', 'hidden');
	document.getElementById('cheat-sidebar').removeAttribute('class', 'hidden');
	let cheatButton = document.getElementById('cheat');
	cheatButton.addEventListener('click', mainGame.cheat, false);
	cheatButton.self = this;
	let saveButton = document.getElementById('saveGame');
	saveButton.addEventListener('click', mainGame.save, false);
	saveButton.self = this;
	this.setAttribute('class', 'hidden');
};
// Ends placing the current ship
Game.prototype.endPlacing = function(shipType) {
	document.getElementById(shipType).setAttribute('class', 'placed');

	// Mark the ship as 'used'
	Game.usedShips[CONST.AVAILABLE_SHIPS.indexOf(shipType)] = CONST.USED;

	// Wipe out the variable when you're done with it
	Game.placeShipDirection = null;
	Game.placeShipType = '';
	Game.placeShipCoords = [];
};
// Checks whether or not all ships are done placing
// Returns boolean
Game.prototype.areAllShipsPlaced = function() {
	let playerRoster = document.querySelectorAll('.fleet-roster li');
	for (let i = 0; i < playerRoster.length; i++) {
		if (playerRoster[i].getAttribute('class') === 'placed') {
		} else {
			return false;
		}
	}
	// Reset temporary variables
	Game.placeShipDirection = 0;
	Game.placeShipType = '';
	Game.placeShipCoords = [];
	return true;
};
// Resets the fog of war
Game.prototype.resetFogOfWar = function() {
	for (let i = 0; i < Game.size; i++) {
		for (let j = 0; j < Game.size; j++) {
			this.humanGrid.updateCell(i, j, CONST.CSS_TYPE_EMPTY, CONST.HUMAN_PLAYER);
			this.computerGrid.updateCell(i, j, CONST.CSS_TYPE_EMPTY, CONST.COMPUTER_PLAYER);
		}
	}
	// Reset all values to indicate the ships are ready to be placed again
	Game.usedShips = Game.usedShips.map(function(){return CONST.UNUSED;});
};
// Resets CSS styling of the sidebar
Game.prototype.resetRosterSidebar = function() {
	let els = document.querySelector('.fleet-roster').querySelectorAll('li');
	for (let i = 0; i < els.length; i++) {
		els[i].removeAttribute('class');
	}

	if (gameTutorial.showTutorial) {
		gameTutorial.nextStep();
	} else {
		document.getElementById('roster-sidebar').removeAttribute('class');
	}
	document.getElementById('rotate-button').removeAttribute('class');
	document.getElementById('start-game').setAttribute('class', 'hidden');
	if (DEBUG_MODE) {
		document.getElementById('place-randomly').removeAttribute('class');
	}
};
Game.prototype.showRestartSidebar = function() {
	let sidebar = document.getElementById('restart-sidebar');
	sidebar.setAttribute('class', 'highlight');

	// Deregister listeners
	let computerCells = document.querySelector('.computer-player').childNodes;
	for (let j = 0; j < computerCells.length; j++) {
		computerCells[j].removeEventListener('click', this.shootListener, false);
	}
	let playerRoster = document.querySelector('.fleet-roster').querySelectorAll('li');
	for (let i = 0; i < playerRoster.length; i++) {
		playerRoster[i].removeEventListener('click', this.rosterListener, false);
	}

	let restartButton = document.getElementById('restart-game');
	let f = this.restartGame
	restartButton.addEventListener('click', this.restartGame, false);
	restartButton.self = this;
};

Game.prototype.showCheatSidebar = function() {
	let sidebar = document.getElementById('cheat-sidebar');
	sidebar.setAttribute('class', 'highlight');

	// Deregister listeners
	let computerCells = document.querySelector('.computer-player').childNodes;
	for (let j = 0; j < computerCells.length; j++) {
		computerCells[j].removeEventListener('click', this.shootListener, false);
	}
	let playerRoster = document.querySelector('.fleet-roster').querySelectorAll('li');
	for (let i = 0; i < playerRoster.length; i++) {
		playerRoster[i].removeEventListener('click', this.rosterListener, false);
	}

	let cheatButton = document.getElementById('cheat');
	cheatButton.addEventListener('click', this.cheat, false);
	cheatButton.self = this;
};
// Generates the HTML divs for the grid for both players
Game.prototype.createGrid = function() {
	let gridDiv = document.querySelectorAll('.grid');
	for (let grid = 0; grid < gridDiv.length; grid++) {
//		gridDiv[grid].removeChild(gridDiv[grid].querySelector('.no-js')); // Removes the no-js warning
		gridDiv[grid].innerHTML = '';
		for (let i = 0; i < Game.size; i++) {
			for (let j = 0; j < Game.size; j++) {
				let el = document.createElement('div');
				el.setAttribute('data-x', ''+i);
				el.setAttribute('data-y', ''+j);
				el.setAttribute('class', 'grid-cell grid-cell-' + i + '-' + j);
				gridDiv[grid].appendChild(el);
			}
		}
	}
};
// Initializes the Game. Also resets the game if previously initialized
Game.prototype.init = function() {
	this.humanGrid = new Grid(Game.size);
	this.computerGrid = new Grid(Game.size);
	this.humanFleet = new Fleet(this.humanGrid, CONST.HUMAN_PLAYER);
	this.computerFleet = new Fleet(this.computerGrid, CONST.COMPUTER_PLAYER);

	this.robot = new AI(this);

	// Reset game variables
	this.readyToPlay = false;
	this.placingOnGrid = false;
	Game.placeShipDirection = 0;
	Game.placeShipType = '';
	Game.placeShipCoords = [];

	document.getElementById("humanfleet").style.width = "" + 43 * Game.size +"px";
	document.getElementById("humanfleetinner").style.width = "" + 43 * Game.size +"px";
	document.getElementById("computerfleet").style.width = "" + 43 * Game.size + "px";
	document.getElementById("computerfleetinner").style.width = "" + 43 * Game.size + "px";

	document.getElementById("humanfleet").style.height = "" + 43 * Game.size +"px";
	document.getElementById("humanfleetinner").style.height = "" + 43 * Game.size +"px";
	document.getElementById("computerfleet").style.height = "" + 43 * Game.size + "px";
	document.getElementById("computerfleetinner").style.height = "" + 43 * Game.size + "px";

	this.resetRosterSidebar();

	let f = this.shootListener

	// Add a click listener for the Grid.shoot() method for all cells
	// Only add this listener to the computer's grid
	let computerCells = document.querySelector('.computer-player').childNodes;
	for (let j = 0; j < computerCells.length; j++) {
		computerCells[j].self = this;
		computerCells[j].addEventListener('click', this.shootListener, false);
	}

	// Add a click listener to the roster
	let playerRoster = document.querySelector('.fleet-roster').querySelectorAll('li');
	for (let i = 0; i < playerRoster.length; i++) {
		playerRoster[i].self = this;
		playerRoster[i].addEventListener('click', this.rosterListener, false);
	}

	// Add a click listener to the human player's grid while placing
	let humanCells = document.querySelector('.human-player').childNodes;
	for (let k = 0; k < humanCells.length; k++) {
		humanCells[k].self = this;
		humanCells[k].addEventListener('click', this.placementListener, false);
		humanCells[k].addEventListener('mouseover', this.placementMouseover, false);
		humanCells[k].addEventListener('mouseout', this.placementMouseout, false);
	}

	let rotateButton = document.getElementById('rotate-button');
	rotateButton.addEventListener('click', this.toggleRotation, false);
	let startButton = document.getElementById('start-game');
	startButton.self = this;
	startButton.addEventListener('click', this.startGame, false);
	let randomButton = document.getElementById('place-randomly');
	randomButton.self = this;
	randomButton.addEventListener('click', this.placeRandomly, false);
	this.computerFleet.placeShipsRandomly();
};

// Grid object
// Constructor
function Grid(size) {
	this.size = size;
	this.cells = [];
	this.init();
}

// Initialize and populate the grid
Grid.prototype.init = function() {
	for (let x = 0; x < this.size; x++) {
		let row = [];
		this.cells[x] = row;
		for (let y = 0; y < this.size; y++) {
			row.push(CONST.TYPE_EMPTY);
		}
	}
};

// Updates the cell's CSS class based on the type passed in
Grid.prototype.updateCell = function(x, y, type, targetPlayer) {
	let player;
	if (targetPlayer === CONST.HUMAN_PLAYER) {
		player = 'human-player';
	} else if (targetPlayer === CONST.COMPUTER_PLAYER) {
		player = 'computer-player';
	} else {
		// Should never be called
		console.log("There was an error trying to find the correct player's grid");
	}

	switch (type) {
		case CONST.CSS_TYPE_EMPTY:
			this.cells[x][y] = CONST.TYPE_EMPTY;
			break;
		case CONST.CSS_TYPE_SHIP:
			this.cells[x][y] = CONST.TYPE_SHIP;
			break;
		case CONST.CSS_TYPE_MISS:
			this.cells[x][y] = CONST.TYPE_MISS;
			break;
		case CONST.CSS_TYPE_HIT:
			this.cells[x][y] = CONST.TYPE_HIT;
			break;
		case CONST.CSS_TYPE_SUNK:
			this.cells[x][y] = CONST.TYPE_SUNK;
			break;
		default:
			this.cells[x][y] = CONST.TYPE_EMPTY;
			break;
	}
	let classes = ['grid-cell', 'grid-cell-' + x + '-' + y, 'grid-' + type];
	document.querySelector('.' + player + ' .grid-cell-' + x + '-' + y).setAttribute('class', classes.join(' '));
};
// Checks to see if a cell contains an undamaged ship
// Returns boolean
Grid.prototype.isUndamagedShip = function(x, y) {
	return this.cells[x][y] === CONST.TYPE_SHIP;
};
// Checks to see if the shot was missed. This is equivalent
// to checking if a cell contains a cannonball
// Returns boolean
Grid.prototype.isMiss = function(x, y) {
	return this.cells[x][y] === CONST.TYPE_MISS;
};
// Checks to see if a cell contains a damaged ship,
// either hit or sunk.
// Returns boolean
Grid.prototype.isDamagedShip = function(x, y) {
	return this.cells[x][y] === CONST.TYPE_HIT || this.cells[x][y] === CONST.TYPE_SUNK;
};

// Fleet object
// This object is used to keep track of a player's portfolio of ships
// Constructor
function Fleet(playerGrid, player) {
	this.numShips = CONST.AVAILABLE_SHIPS.length;
	this.playerGrid = playerGrid;
	this.player = player;
	this.fleetRoster = [];
	this.populate();
}
// Populates a fleet
Fleet.prototype.populate = function() {
	for (let i = 0; i < this.numShips; i++) {
		// loop over the ship types when numShips > Constants.AVAILABLE_SHIPS.length
		let j = i % CONST.AVAILABLE_SHIPS.length;
		this.fleetRoster.push(new Ship(CONST.AVAILABLE_SHIPS[j], this.playerGrid, this.player));
	}
};
// Places the ship and returns whether or not the placement was successful
// Returns boolean
Fleet.prototype.placeShip = function(x, y, direction, shipType) {
	let shipCoords;
	for (let i = 0; i < this.fleetRoster.length; i++) {
		let shipTypes = this.fleetRoster[i].type;

		if (shipType === shipTypes &&
			this.fleetRoster[i].isLegal(x, y, direction)) {
			this.fleetRoster[i].create(x, y, direction, false);
			shipCoords = this.fleetRoster[i].getAllShipCells();

			for (let j = 0; j < shipCoords.length; j++) {
				this.playerGrid.updateCell(shipCoords[j].x, shipCoords[j].y, CONST.CSS_TYPE_SHIP, this.player);
			}
			return true;
		}
	}
	return false;
};
// Places ships randomly on the board
Fleet.prototype.placeShipsRandomly = function() {
	let shipCoords;
	for (let i = 0; i < this.fleetRoster.length; i++) {
		let illegalPlacement = true;

		// Prevents the random placement of already placed ships
		if(this.player === CONST.HUMAN_PLAYER && Game.usedShips[i] === CONST.USED) {
			continue;
		}
		while (illegalPlacement) {
			let randomX = Math.floor(Game.size * Math.random());
			let randomY = Math.floor(Game.size * Math.random());
			let randomDirection = Math.floor(2*Math.random());

			if (this.fleetRoster[i].isLegal(randomX, randomY, randomDirection)) {
				this.fleetRoster[i].create(randomX, randomY, randomDirection, false);
				shipCoords = this.fleetRoster[i].getAllShipCells();
				illegalPlacement = false;
			}
		}
		if (this.player === CONST.HUMAN_PLAYER && Game.usedShips[i] !== CONST.USED) {
			for (let j = 0; j < shipCoords.length; j++) {
				this.playerGrid.updateCell(shipCoords[j].x, shipCoords[j].y, CONST.CSS_TYPE_SHIP, this.player);
				Game.usedShips[i] = CONST.USED;
			}
		}
	}
};
// Finds a ship by location
// Returns the ship object located at (x, y)
// If no ship exists at (x, y), this returns null instead
Fleet.prototype.findShipByCoords = function(x, y) {
	for (let i = 0; i < this.fleetRoster.length; i++) {
		let currentShip = this.fleetRoster[i];
		if (currentShip.direction === Ship.DIRECTION_VERTICAL) {
			if (y === currentShip.yPosition &&
				x >= currentShip.xPosition &&
				x < currentShip.xPosition + currentShip.shipLength) {
				return currentShip;
			}
		} else {
			if (x === currentShip.xPosition &&
				y >= currentShip.yPosition &&
				y < currentShip.yPosition + currentShip.shipLength) {
				return currentShip;
			}
		}
	}
	return null;
};
// Checks to see if all ships have been sunk
// Returns boolean
Fleet.prototype.allShipsSunk = function() {
	for (let i = 0; i < this.fleetRoster.length; i++) {
		// If one or more ships are not sunk, then the sentence "all ships are sunk" is false.
		if (this.fleetRoster[i].sunk === false) {
			return false;
		}
	}
	return true;
};

// Ship object
// Constructor
function Ship(type, playerGrid, player) {
	this.damage = 0;
	this.type = type;
	this.playerGrid = playerGrid;
	this.player = player;

	switch (this.type) {
		case CONST.AVAILABLE_SHIPS[0]:
			this.shipLength = 5;
			break;
		case CONST.AVAILABLE_SHIPS[1]:
			this.shipLength = 4;
			break;
		case CONST.AVAILABLE_SHIPS[2]:
			this.shipLength = 3;
			break;
		case CONST.AVAILABLE_SHIPS[3]:
			this.shipLength = 3;
			break;
		case CONST.AVAILABLE_SHIPS[4]:
			this.shipLength = 2;
			break;
		default:
			this.shipLength = 3;
			break;
	}
	this.maxDamage = this.shipLength;
	this.sunk = false;
}
// Checks to see if the placement of a ship is legal
// Returns boolean
Ship.prototype.isLegal = function(x, y, direction) {
	// first, check if the ship is within the grid...
	if (this.withinBounds(x, y, direction)) {
		// ...then check to make sure it doesn't collide with another ship
		for (let i = 0; i < this.shipLength; i++) {
			if (direction === Ship.DIRECTION_VERTICAL) {
				if (this.playerGrid.cells[x + i][y] === CONST.TYPE_SHIP ||
					this.playerGrid.cells[x + i][y] === CONST.TYPE_MISS ||
					this.playerGrid.cells[x + i][y] === CONST.TYPE_SUNK) {
					return false;
				}
			} else {
				if (this.playerGrid.cells[x][y + i] === CONST.TYPE_SHIP ||
					this.playerGrid.cells[x][y + i] === CONST.TYPE_MISS ||
					this.playerGrid.cells[x][y + i] === CONST.TYPE_SUNK) {
					return false;
				}
			}
		}
		return true;
	} else {
		return false;
	}
};
// Checks to see if the ship is within bounds of the grid
// Returns boolean
Ship.prototype.withinBounds = function(x, y, direction) {
	if (direction === Ship.DIRECTION_VERTICAL) {
		return x + this.shipLength <= Game.size;
	} else {
		return y + this.shipLength <= Game.size;
	}
};
// Increments the damage counter of a ship
// Returns Ship
Ship.prototype.incrementDamage = function() {
	this.damage++;
	if (this.isSunk()) {
		this.sinkShip(false); // Sinks the ship
	}
};
// Checks to see if the ship is sunk
// Returns boolean
Ship.prototype.isSunk = function() {
	return this.damage >= this.maxDamage;
};
// Sinks the ship
Ship.prototype.sinkShip = function(virtual) {
	this.damage = this.maxDamage; // Force the damage to exceed max damage
	this.sunk = true;

	// Make the CSS class sunk, but only if the ship is not virtual
	if (!virtual) {
		let allCells = this.getAllShipCells();
		for (let i = 0; i < this.shipLength; i++) {
			this.playerGrid.updateCell(allCells[i].x, allCells[i].y, CONST.CSS_TYPE_SUNK, this.player);
		}
	}
};

 //  Gets all the ship cells
 //  Returns an array with all (x, y) coordinates of the ship:

Ship.prototype.getAllShipCells = function() {
	let resultObject = [];
	for (let i = 0; i < this.shipLength; i++) {
		if (this.direction === Ship.DIRECTION_VERTICAL) {
			resultObject[i] = {'x': this.xPosition + i, 'y': this.yPosition};
		} else {
			resultObject[i] = {'x': this.xPosition, 'y': this.yPosition + i};
		}
	}
	return resultObject;
};
// Initializes a ship with the given coordinates and direction (bearing).
// If the ship is declared "virtual", then the ship gets initialized with
// its coordinates but DOESN'T get placed on the grid.
Ship.prototype.create = function(x, y, direction, virtual) {
	// This function assumes that you've already checked that the placement is legal
	this.xPosition = x;
	this.yPosition = y;
	this.direction = direction;

	// If the ship is virtual, don't add it to the grid.
	if (!virtual) {
		for (let i = 0; i < this.shipLength; i++) {
			if (this.direction === Ship.DIRECTION_VERTICAL) {
				this.playerGrid.cells[x + i][y] = CONST.TYPE_SHIP;
			} else {
				this.playerGrid.cells[x][y + i] = CONST.TYPE_SHIP;
			}
		}
	}

};
// direction === 0 when the ship is facing north/south
// direction === 1 when the ship is facing east/west
Ship.DIRECTION_VERTICAL = 0;
Ship.DIRECTION_HORIZONTAL = 1;

// Tutorial Object
// Constructor
function Tutorial() {
	this.currentStep = 0;
	// Check if 'showTutorial' is initialized, if it's uninitialized, set it to true.
	this.showTutorial = localStorage.getItem('showTutorial') !== 'false';
}
// Advances the tutorial to the next step
Tutorial.prototype.nextStep = function() {
	let humanGrid = document.querySelector('.human-player');
	let computerGrid = document.querySelector('.computer-player');
	switch (this.currentStep) {
		case 0:
			document.getElementById('roster-sidebar').setAttribute('class', 'highlight');
			document.getElementById('step1').setAttribute('class', 'current-step');
			this.currentStep++;
			break;
		case 1:
			document.getElementById('roster-sidebar').removeAttribute('class');
			document.getElementById('step1').removeAttribute('class');
			humanGrid.setAttribute('class', humanGrid.getAttribute('class') + ' highlight');
			document.getElementById('step2').setAttribute('class', 'current-step');
			this.currentStep++;
			break;
		case 2:
			document.getElementById('step2').removeAttribute('class');
			let humanClasses = humanGrid.getAttribute('class');
			humanClasses = humanClasses.replace(' highlight', '');
			humanGrid.setAttribute('class', humanClasses);
			this.currentStep++;
			break;
		case 3:
			computerGrid.setAttribute('class', computerGrid.getAttribute('class') + ' highlight');
			document.getElementById('step3').setAttribute('class', 'current-step');
			this.currentStep++;
			break;
		case 4:
			let computerClasses = computerGrid.getAttribute('class');
			document.getElementById('step3').removeAttribute('class');
			computerClasses = computerClasses.replace(' highlight', '');
			computerGrid.setAttribute('class', computerClasses);
			document.getElementById('step4').setAttribute('class', 'current-step');
			this.currentStep++;
			break;
		case 5:
			document.getElementById('step4').removeAttribute('class');
			this.currentStep = 6;
			this.showTutorial = false;
			localStorage.setItem('showTutorial', "false");
			break;
		default:
			break;
	}
};

// AI Object
// Optimal battleship-playing AI
// Constructor
function AI(gameObject) {
	this.gameObject = gameObject;
	this.virtualGrid = new Grid(Game.size);
	this.virtualFleet = new Fleet(this.virtualGrid, CONST.VIRTUAL_PLAYER);

}
AI.prototype.shoot = function() {
	let guess_x = 0;
	let guess_y = 0;
	let found = CONST.TYPE_SHIP
	while (found != CONST.TYPE_EMPTY) {
		guess_x = getRandom(Game.size)
		guess_y = getRandom(Game.size)
		found = this.virtualGrid.cells[guess_x][guess_y];
	}

	let result = this.gameObject.shoot(guess_x, guess_y, CONST.HUMAN_PLAYER);
	this.virtualGrid.cells[guess_x][guess_y] = result;

	// If the game ends, the next lines need to be skipped.
	if (Game.gameOver) {
		Game.gameOver = false;
		return;
	}

	// If you hit a ship, check to make sure if you've sunk it.
	if (result === CONST.TYPE_HIT) {
		let humanShip = this.findHumanShip(guess_x, guess_y);
		if (humanShip.isSunk()) {
			// Remove any ships from the roster that have been sunk
			let shipTypes = [];
			for (let k = 0; k < this.virtualFleet.fleetRoster.length; k++) {
				shipTypes.push(this.virtualFleet.fleetRoster[k].type);
			}
			let index = shipTypes.indexOf(humanShip.type);
			this.virtualFleet.fleetRoster.splice(index, 1);

			// Update the virtual grid with the sunk ship's cells
			let shipCells = humanShip.getAllShipCells();
			for (let _i = 0; _i < shipCells.length; _i++) {
				this.virtualGrid.cells[shipCells[_i].x][shipCells[_i].y] = CONST.TYPE_SUNK;
			}
		}
	}
}

// Finds a human ship by coordinates
// Returns Ship
AI.prototype.findHumanShip = function(x, y) {
	return this.gameObject.humanFleet.findShipByCoords(x, y);
};
function board_init() {
	let board_resize = document.getElementById('resizeButton');
	board_resize.addEventListener('click', resize_board, false);
	let loadbtn = document.getElementById('loadGame');
	loadbtn.addEventListener('click', load, false);
}

function load() {
	console.log("loading game");
	let size = localStorage.getItem("size");
	mainGame.setSize(size);
	for (let i=0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			let classes = mainGame.robot.virtualGrid.cells[i][j] = localStorage.getItem("humanGrid-"+i+'-'+j);
			qs = document.querySelector('.human-player .grid-cell-' + i + '-' + j)
			qs.setAttribute('class', classes);
		}
	}
	for (let i=0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			mainGame.robot.virtualGrid.cells[i][j] = parseInt(localStorage.getItem("virtualGrid-"+i+'-'+j));
		}
	}

	for (let i=0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			if (mainGame.humanGrid.cells[i][j] === CONST.TYPE_SHIP) {
				mainGame.humanGrid.updateCell(i, j, CONST.CSS_TYPE_SHIP, CONST.HUMAN_PLAYER);
			}
		}
	}
	for (let i=0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			let classes = mainGame.computerGrid.cells[i][j] = localStorage.getItem("visibilityGrid-"+i+'-'+j);
			qs = document.querySelector('.computer-player .grid-cell-' + i + '-' + j)
			qs.setAttribute('class', classes);
		}
	}
	for (let i=0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			mainGame.computerGrid.cells[i][j] = parseInt(localStorage.getItem("computerGrid-"+i+'-'+j));
		}
	}
	for (let i = 0; i < mainGame.computerFleet.fleetRoster.length; i++) {
		let ship = mainGame.computerFleet.fleetRoster[i];
		ship.xPosition = parseInt(localStorage.getItem("computerFleet.ship-"+i+".xPosition"));
		ship.yPosition = parseInt(localStorage.getItem("computerFleet.ship-"+i+".yPosition"));
		ship.damage = parseInt(localStorage.getItem("computerFleet.ship-"+i+".damage"));
		ship.direction = parseInt(localStorage.getItem("computerFleet.ship-"+i+".direction"));
	}
	for (let i = 0; i < mainGame.humanFleet.fleetRoster.length; i++) {
		let ship = mainGame.humanFleet.fleetRoster[i];
	    ship.xPosition = parseInt(localStorage.getItem("humanFleet.ship-"+i+".xPosition"));
		ship.yPosition = parseInt(localStorage.getItem("humanFleet.ship-"+i+".yPosition"));
		ship.damage = parseInt(localStorage.getItem("humanFleet.ship-"+i+".damage"));
		ship.direction = parseInt(localStorage.getItem("computerFleet.ship-"+i+".direction"));
	}
	for (let i = 0; i < mainGame.robot.virtualFleet.fleetRoster.length; i++) {
		let ship = mainGame.robot.virtualFleet.fleetRoster[i];
		ship.xPosition = parseInt(localStorage.getItem ("virtualFleet.ship-"+i+".xPosition"));
		ship.yPosition = parseInt(localStorage.getItem("virtualFleet.ship-"+i+".yPosition"));
		ship.damage = parseInt(localStorage.getItem("virtualFleet.ship-"+i+".damage"));
		ship.direction = parseInt(localStorage.getItem("computerFleet.ship-"+i+".direction"));


	}
	let e = {}
	e.target = {}
	e.target.self = mainGame
	mainGame.startGame(e)
}

// Global constant only initialized once
board_init();

let gameTutorial = new Tutorial();

// Start the game
let mainGame = new Game(10);

function resize_board() {
	let size = parseInt(document.getElementById("size").value);
	mainGame.setSize(size);
	mainGame.gameOver = false;
	mainGame.createGrid();
	mainGame.init();
}

})();

// Returns a random number between min (inclusive) and max (exclusive)
function getRandom(max) {
	return Math.floor( Math.random() * max);
}

// Toggles on or off DEBUG_MODE
function setDebug(val) {
	DEBUG_MODE = val;
	localStorage.setItem('DEBUG_MODE', val);
	localStorage.setItem('showTutorial', 'false');
	window.location.reload();
}

function str_to_int(parm){
	return parseInt(parm,10)
}


function do_animation() {
	let numberOfStars = 200;
	$('.congrats')
    console.log("starting anim")
	for (let i = 0; i < numberOfStars; i++) {
		$('.congrats').append('<div class="blob fa fa-star ' + i + '"></div>');

	}
	animateBlobs();


}

function random(from,to) {
	return Math.floor((to-from) * Math.random()+from);
}

function animateBlobs() {
	var xSeed = random(350, 380);
	var ySeed = random(120, 170);

	$.each($('.blob'), function(i) {
		var $blob = $(this);
		var speed = random(1, 5);
		var rotation = random(5, 100);
		var scale = random(0.8, 1.5);
		var x = random(-xSeed, xSeed);
		var y = random(-ySeed, ySeed);

		TweenMax.to($blob, speed, {
			x: x,
			y: y,
			ease: Power1.easeOut,
			opacity: 0,
			rotation: rotation,
			scale: scale,
			onStartParams: [$blob],
			onStart: function($element) {
				$element.css('display', 'block');
			},
			onCompleteParams: [$blob],
			onComplete: function($element) {
				$element.css('display', 'none');
			}
		});
	});
}
