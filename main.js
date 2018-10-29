/* Disclamer
	* Author : Segan Salomon
	* email  : segan.salomon@he-arc.ch
	* date	 : april-may 2018

	* This project is not intended to replicate the real world exactly
	* Its purpose is to provide a simulation of what you might observe

 	* With the help of :
		- https://en.wikipedia.org/wiki/Verlet_integration
		- https://en.wikipedia.org/wiki/Drag_equation
 		-	http://lonesock.net/article/verlet.html
		- https://www.youtube.com/watch?v=3HjO_RGIjCU
		- https://www.gamedev.net/articles/programming/math-and-physics/a-verlet-based-approach-for-2d-game-physics-r2714/
		- http://hyperphysics.phy-astr.gsu.edu/hbase/airfri2.html#c2
 		- https://gamedevelopment.tutsplus.com/tutorials/simulate-tearable-cloth-and-ragdolls-with-simple-verlet-integration--gamedev-519
		- https://codepen.io/DonKarlssonSan/post/particles-in-simplex-noise-flow-field
		- http://www.southernropes.co.za/catalogue/physical-rope-properties.html

		Draw methods
		- As demonstrated here https://jsperf.com/test-Math.floor-and-math-floor Math.floor is mush faster than Math.floor()
		- That is the reason why I'm converting my floating coordinates into integer coordinates. This way no antialiasing will be applied which speed up the rendering

		- If you want to have a proof, go in pointMass and add somme parseFloat before
			accX, accY, newX and newY
			You will see a gain of ~2ms without them if you use a curtain with a 800mm rope length and a distance of 60mm !
*/

// ---------- MAIN ----------- //
const PIXEL_PER_METER = 500.0;
document.getElementById("ppmLabel").innerHTML = PIXEL_PER_METER + " pixels = 1 meter";

function MillimetersToMeters(arg) {
	return parseFloat(arg * 0.001);
}

function MetersToMillimeters(arg) {
	return parseFloat(arg * 1000.0);
}

// vars
var canvas = document.getElementById("canvas"),
		context = canvas.getContext("2d"),
		width = canvas.width = Math.floor(document.getElementById("simulator").offsetWidth), //window.innerWidth,
		height = canvas.height = Math.floor(document.getElementById("simulator").offsetHeight);//window.innerHeight;

// const
var STRINGSTART = "Start";
var STRINGSTOP = "Stop";
var STRINGPAUSE = "Pause";
var STRINGRESUME = "Resume";

// GUI ref
// CONTROLS
var _gui_button_startStop = document.getElementById("btnStartStop");
var _gui_button_pauseResume = document.getElementById("btnPauseResume");

// CONTROLS parameters
var _gui_checkBox_switchSimMode = document.getElementById("chbSwitchMode");
var _gui_spinBox_fixedDeltaT = document.getElementById("spinBoxStepMS");
var _gui_spinBox_refreshRate = document.getElementById("spinBoxHertz");
var _gui_spinBox_simAccuracy = document.getElementById("spinBoxAccuracy");

// Graphic parameters
var _gui_checkBox_renderNodes = document.getElementById("chbShowNode");
var _gui_checkBox_renderWindVectors = document.getElementById("chbShowWind");
var _gui_checkBox_renderWindGrid = document.getElementById("chbShowGrid");

// CONTROLS FLUSH AND STEP
var _gui_button_flush = document.getElementById("btnFlushSim");
var _gui_button_step = document.getElementById("btnStemSim");

// CREATION-KIT PARAMETERS
var _gui_spinBox_ropeOffsetX = document.getElementById("spinBoxNewRopeX");
var _gui_spinBox_ropeOffsetY = document.getElementById("spinBoxNewRopeY");
var _gui_spinBox_ropeLength = document.getElementById("spinBoxNewRopeLength");
var _gui_spinBox_ropeNodeMass = document.getElementById("spinBoxNewNodeMass");
var _gui_spinBox_ropeStiffness = document.getElementById("spinBoxNewRopeStiffness");
var _gui_spinBox_ropeDistance = document.getElementById("spinBoxNewRopeDistance");
var _gui_spinBox_ropeMaxDistance = document.getElementById("spinBoxNewRopeMaxDistance");
var _gui_checkBox_ropeBreakable = document.getElementById("checkBoxNewRopeBreakable");

// WIND PARAMETERS
var _gui_spinBox_windGridSize = document.getElementById("spinBoxWindSize");
var _gui_spinBox_windEvolutionStep = document.getElementById("spinBoxWindZ");
var _gui_spinBox_windForce = document.getElementById("spinBoxWindForce");

// ___ VARS INIT ___ //

var _simConfigSimulationIsFixed = false;
var _simConfigSimulationRefreshRate = 0;
var _simConfigSimulationFixedDeltaT = 0;
var _simConfigSimulationAccuracy = 0;

// config render
var _simConfigRenderShowNodes = true;
var _simConfigRenderShowWind = true;
var _simConfigRenderWindGrid = false;

// config new rope
var _simConfigNewRopePositionX = 0;
var _simConfigNewRopePositionY = 0;
var _simConfigNewRopeMass = 0;
var _simConfigNewRopeLength = 0;
var _simConfigNewRopeDistance = 0;
var _simConfigNewRopeMaxDistance = 0;
var _simConfigNewRopeStiffness = 0;

// config wind
var _simConfigWindCellSize = 0;
var _simConfigWindChaosFactor = 0;
var _simConfigWindSpeedFactor = 0;

// init vars
init();

// refresh debug output
setInterval(function() {
	if(_simPhysics != null) {
		setDebug(
			_simPhysics.stepCount,
			_simPhysics.watcherUpdating.fps,
			_simPhysics.watcherUpdating.averageTime.toFixed(2),
			_simPhysics.watcherRendering.averageTime.toFixed(2)
		);
	}
}, 10);

// simulation
var _simArrayObjects = [];
var _simPhysics = new PhysicEngine();

// load some new values in objects
loadConfig();

/* ------------------------- *\
|* ---- CONTROL METHODS ---- *|
\* ------------------------- */

function init() {

	// gui update
	updateGUINewRopeBreakable();

	// simulation
	setGUISimulationTimeStepMode(false);
	setGUISimulationFixedDeltaT(16);
	setGUISimulationRefreshRate(60);
	setGUISimulationAccuracy(5);

	// render
	setGUIRenderShowNode(true);
	setGUIRenderShowWind(true);
	setGUIRenderWindGrid(false);

	setGUINewRopePositionX(Math.floor(width / 2));
	setGUINewRopePositionX(Math.floor(width / 4));
	setGUINewNodeMass(500);
	setGUINewRopeLength(150);
	setGUINewRopeStiffness(0.5);
	setGUINewRopeMaxDistance(30);
	setGUINewRopeDistance(15);

	//wind
	setGUIWindCellSize(36);
	setGUIWindChaosFactor(17);
	setGUIWindSpeedFactor(10);

	loadConfig();
}

function resetAll() {
	_simPhysics.reset();
	init();
}

function startStopSimulation() {
	if(_simPhysics.isStarted == true) {
		_simPhysics.stop();
	}
	else {
		_simPhysics.start();
	}
}

function pauseResumeSim() {
	if(_simPhysics.isPaused == true) {
		_simPhysics.resume();
	}
	else {
		_simPhysics.pause();
	}
}

function stepSimulation() {
	_simPhysics.step();
}

function flushSimulation() {
	_simPhysics.flush();
}

function setDebug(stepCount, fps, averageUpdateTime, averageRenderTime) {
	document.getElementById("stepCountLabel").innerHTML 				= stepCount;
	document.getElementById("fpsLabel").innerHTML 							= fps;
	document.getElementById("averageUpdateTimeLabel").innerHTML = averageUpdateTime + " ms";
	document.getElementById("averageRenderTimeLabel").innerHTML = averageRenderTime + " ms";
}

/* ---------------------- *\
|* ---- READ METHODS ---- *|
\* ---------------------- */

function loadConfig() {
	resetDebug();

	// sim
	readConfigSimulationTimeStepMode();
	readConfigSimulationFixedDeltaT();
	readConfigSimulationRefreshRate();
	readConfigSimulationAccuracy();

	//render
	readConfigRenderShowNode();
	readConfigRenderShowWind();
	readConfigRenderWindGrid();

	// config wind
	readConfigWindCellSize();
	readConfigWindChaosFactor();
	readConfigWindSpeedFactor();

	// config rope
	readConfigNewRopePositionX();
	readConfigNewRopePositionY();
	readConfigNewRopeMass();
	readConfigNewRopeLength();
	readConfigNewRopeStiffness();
	readConfigNewRopeMaxDistance();
	readConfigNewRopeDistance();
}

function resetDebug() {
	setDebug(0, 0, 0, 0);
}

/* ---------------------------- *\
|* ---- SIM CONFIG METHODS ---- *|
\* ---------------------------- */

function readConfigSimulationTimeStepMode() {
	_simConfigSimulationIsFixed = _gui_checkBox_switchSimMode.checked;
	_gui_spinBox_fixedDeltaT.disabled = !_simConfigSimulationIsFixed;
}

function readConfigSimulationFixedDeltaT() {
	_simConfigSimulationFixedDeltaT = Math.floor(_gui_spinBox_fixedDeltaT.value);
}

function readConfigSimulationRefreshRate() {
	_simConfigSimulationRefreshRate = parseFloat(1000.0 / _gui_spinBox_refreshRate.value);
}

function readConfigSimulationAccuracy() {
	_simConfigSimulationAccuracy = Math.floor(_gui_spinBox_simAccuracy.value);
}

// set
function setGUISimulationTimeStepMode(arg) {
	_gui_checkBox_switchSimMode.checked = arg || _simConfigSimulationIsFixed;
}

function setGUISimulationFixedDeltaT(arg) {
	_gui_spinBox_fixedDeltaT.value = arg || _simConfigSimulationFixedDeltaT;
}

function setGUISimulationRefreshRate(arg) {
	_gui_spinBox_refreshRate.value = arg || _simConfigSimulationRefreshRate;
}

function setGUISimulationAccuracy(arg) {
	_gui_spinBox_simAccuracy.value = arg || _simPhysics.accuracy;
}

/* ------------------------------- *\
|* ---- RENDER CONFIG METHODS ---- *|
\* ------------------------------- */

function readConfigRenderShowNode() {
	_simConfigRenderShowNodes = _gui_checkBox_renderNodes.checked;
	if(_simPhysics != null) _simPhysics.draw();
}

function readConfigRenderShowWind() {
	_simConfigRenderShowWind = _gui_checkBox_renderWindVectors.checked;
	if(_simPhysics != null) _simPhysics.draw();
}

function readConfigRenderWindGrid() {
	_simConfigRenderWindGrid = _gui_checkBox_renderWindGrid.checked;
	if(_simPhysics != null) _simPhysics.draw();
}

function setGUIRenderShowNode(arg) {
	_gui_checkBox_renderNodes.checked = arg || _simPhysics.nodeVisible;
}

function setGUIRenderShowWind(arg) {
	_gui_checkBox_renderWindVectors.checked = arg || _simPhysics.windVisible;
}

function setGUIRenderWindGrid(arg) {
	_gui_checkBox_renderWindGrid.checked = arg || _simConfigRenderWindGrid;
}

/* ----------------------------- *\
|* ---- ROPE CONFIG METHODS ---- *|
\* ----------------------------- */
function readConfigNewRopePositionX() {
	_simConfigNewRopePositionX = parseFloat(_gui_spinBox_ropeOffsetX.value / PIXEL_PER_METER);
}

function readConfigNewRopePositionY() {
	_simConfigNewRopePositionY = parseFloat(_gui_spinBox_ropeOffsetY.value / PIXEL_PER_METER);
}

function readConfigNewRopeMass() {
	_simConfigNewRopeMass = MillimetersToMeters(_gui_spinBox_ropeNodeMass.value);
}

function readConfigNewRopeLength() {
	_simConfigNewRopeLength = MillimetersToMeters(_gui_spinBox_ropeLength.value);
}

function readConfigNewRopeStiffness() {
	_simConfigNewRopeStiffness = _gui_spinBox_ropeStiffness.value;
}

function readConfigNewRopeDistance() {
	// commented because it is not working as intended on reset
	/*var maxDistanceInMM = MetersToMillimeters(_simConfigNewRopeMaxDistance);
	if(_gui_checkBox_ropeBreakable.checked && _gui_spinBox_ropeDistance.value >= maxDistanceInMM) {
		alert("Resting distance is too high !");
		var tmp = maxDistanceInMM - 15;
		setGUINewRopeDistance(tmp < 5 ? tmp : 5);
		readConfigNewRopeDistance();
	}
	else {*/
		_simConfigNewRopeDistance = MillimetersToMeters(_gui_spinBox_ropeDistance.value);
	//}
}

function readConfigNewRopeMaxDistance() {
	// commented because it is not working as intended on reset
	/*var distanceInMM = MetersToMillimeters(_simConfigNewRopeDistance);
	if(_gui_spinBox_ropeMaxDistance.value <= distanceInMM) {
		alert("Tear sensitivity is too low !");
		var tmp = distanceInMM - 15;
		setGUINewRopeMaxDistance(tmp > 10 ? tmp : 10);
		readConfigNewRopeMaxDistance();
	}
	else {*/
		_simConfigNewRopeMaxDistance = MillimetersToMeters(_gui_spinBox_ropeMaxDistance.value);
	//}
}

// set
function setGUINewRopePositionX(arg) {
	_gui_spinBox_ropeOffsetX.value = arg || Math.floor(_simConfigNewRopePositionX * PIXEL_PER_METER);
}

function setGUINewRopePositionY(arg) {
	_gui_spinBox_ropeOffsetY.value = arg || Math.floor(_simConfigNewRopePositionY * PIXEL_PER_METER);
}

function setGUINewNodeMass(arg) {
	_gui_spinBox_ropeNodeMass.value = arg || MetersToMillimeters(_simConfigNewRopeMass);
}

function setGUINewRopeLength(arg) {
	_gui_spinBox_ropeLength.value = arg || Math.floor(MetersToMillimeters(_simConfigNewRopeLength));
}

function setGUINewRopeStiffness(arg) {
	_gui_spinBox_ropeStiffness.value = arg || _simConfigNewRopeStiffness;
}

function setGUINewRopeDistance(arg) {
	_gui_spinBox_ropeDistance.value = arg || Math.floor(MetersToMillimeters(_simConfigNewRopeDistance));
}

function setGUINewRopeMaxDistance(arg) {
	_gui_spinBox_ropeMaxDistance.value = arg || Math.floor(MetersToMillimeters(_simConfigNewRopeMaxDistance));
}

// update
function updateGUINewRopeBreakable() {
	_gui_spinBox_ropeStiffness.disabled = !_gui_checkBox_ropeBreakable.checked;
	_gui_spinBox_ropeMaxDistance.disabled = !_gui_checkBox_ropeBreakable.checked;
}

/* ----------------------------- *\
|* ---- WIND CONFIG METHODS ---- *|
\* ----------------------------- */

function readConfigWindCellSize() {
	_simConfigWindCellSize = _gui_spinBox_windGridSize.value;
}

function readConfigWindChaosFactor() {
	_simConfigWindChaosFactor = _gui_spinBox_windEvolutionStep.value / 10000.0;
}

function readConfigWindSpeedFactor() {
	_simConfigWindSpeedFactor = _gui_spinBox_windForce.value;
	document.getElementById("speedInKMH").innerHTML = (_simConfigWindSpeedFactor * 3.6).toFixed(2) + "km/h";
}

function setGUIWindCellSize(arg) {
	_gui_spinBox_windGridSize.value = arg || _simConfigWindCellSize;
}

function setGUIWindChaosFactor(arg) {
	_gui_spinBox_windEvolutionStep.value = arg || _simPhysics.wind.evolutionStep;
}

function setGUIWindSpeedFactor(arg) {
	_gui_spinBox_windForce.value = arg || parseFloat(_simPhysics.windForce);
}

/* ------------------------ *\
|* ---- CREATE METHODS ---- *|
\* ------------------------ */

function createNewCable() {
	if(_gui_checkBox_ropeBreakable.checked) {
		_simArrayObjects.push(
			_simPhysics.addElastic(
				_simConfigNewRopePositionX,
				_simConfigNewRopePositionY,
				_simConfigNewRopeMass,
				_simConfigNewRopeLength,
				_simConfigNewRopeDistance,
				_simConfigNewRopeStiffness,
				_simConfigNewRopeMaxDistance
			)
		);
	}
	else {
		_simArrayObjects.push(
			_simPhysics.addRope(
				_simConfigNewRopePositionX,
				_simConfigNewRopePositionY,
				_simConfigNewRopeMass,
				_simConfigNewRopeLength,
				_simConfigNewRopeDistance
			)
		);
	}
	_simPhysics.draw();
}

function createSimplePointMass() {

	_simPhysics.addPointMass(_simConfigNewRopePositionX, _simConfigNewRopePositionY, _simConfigNewRopeMass);
	_simPhysics.draw();
}

function createNewPendulum() {
	_simPhysics.addPendulum(_simConfigNewRopePositionX, _simConfigNewRopePositionY, _simConfigNewRopeMass, _simConfigNewRopeDistance);
	_simPhysics.draw();
}

function createNewCurtain() {
	_simPhysics.addCurtain(_simConfigNewRopePositionX, _simConfigNewRopePositionY, _simConfigNewRopeMass, _simConfigNewRopeLength, _simConfigNewRopeDistance,	_simConfigNewRopeStiffness, _simConfigNewRopeMaxDistance);
	_simPhysics.draw();
}

// -------------------------- //
// ------ PHYSIC CLASS ------ //
// -------------------------- //

function PhysicEngine() {
	this.minX = 0;
	this.minY = 0;
	this.maxX = width  / PIXEL_PER_METER;
	this.maxY = height / PIXEL_PER_METER;

	// timing (use this instead of watcher.js since it lags the code by 8 ms);
	this.previousTime = performance.now();

	// physic storage
	this.pointMasses = [];
	this.watcherUpdating = new Watcher();
	this.watcherRendering = new Watcher();
	this.wind = new Wind(Math.ceil(width / _simConfigWindCellSize), Math.ceil(height / _simConfigWindCellSize), _simConfigWindCellSize);

	// PUBLIC
	this.stepCount = 0;

	// intervals
	this.updateInterval;

	// controls
	this.isPaused = false;
	this.isStarted = false;

	/* --------------- *\
	|* --- METHODS --- *|
	\* --------------- */

	this.updateGUIControls = function() {
		_gui_button_startStop.innerHTML = this.isStarted ? STRINGSTOP : STRINGSTART;
		_gui_button_pauseResume.innerHTML = this.isPaused ? STRINGRESUME : STRINGPAUSE;
	}

	this.startRendering = function() {
		// FROM : https://gist.github.com/paulirish/1579671 stoikerty, 6 Mar 2014
		var hasPerformance = !!(window.performance && window.performance.now);

		// Add new wrapper for browsers that don't have performance
		if (!hasPerformance) {
		    // Store reference to existing rAF and initial startTime
		    var rAF = window.requestAnimationFrame,
		        startTime = +new Date;

		    // Override window rAF to include wrapped callback
		    window.requestAnimationFrame = function (callback, element) {
		        // Wrap the given callback to pass in performance timestamp
		        var wrapped = function (timestamp) {
		            // Get performance-style timestamp
		            var performanceTimestamp = (timestamp < 1e12)
		                ? timestamp
		                : timestamp - startTime;

		            return callback(performanceTimestamp);
		        };

		        // Call original rAF with wrapped callback
		        rAF(wrapped, element);
		    }
		}

		(function render(){
		  requestAnimationFrame(render);
		  _simPhysics.draw();
		})();
	}

	this.reset = function() {
		this.stop();
		this.wind.reset(Math.ceil(width / _simConfigWindCellSize), Math.ceil(height / _simConfigWindCellSize), _simConfigWindCellSize);
	}

	/* ----------------------- *\
	|* --- CONTROL METHODS --- *|
	\* ----------------------- */

	this.start = function() {
		if(this.isStarted == true)
			this.reset();
		this.isStarted = true;
		this.isPaused = true;

		this.startRendering();

		this.resume();
		this.updateGUIControls();
	}

	this.step = function() {
		if(this.isStarted == false) {
			this.isStarted = true;
			this.isPaused = false;
		}
		// pause sim
		this.pause();

		// step sim
		this.nextStep(_simConfigSimulationFixedDeltaT);
		this.draw();
	}

	this.pause = function() {
		if(this.isStarted == true && this.isPaused == false) {
			clearInterval(this.updateInterval);
			this.isPaused = true;
			this.updateGUIControls();
		}
	}

	this.resume = function() {
		if(this.isStarted == true && this.isPaused == true) {
			this.updateInterval = setInterval(function() { _simPhysics.update(); }, 4);
			this.isPaused = false;
			this.updateGUIControls();
		}
	}

	this.stop = function() {
		this.pause();
		this.flush();

		// reset security
		this.isStarted = false;
		this.isPaused = false;

		this.watcherUpdating = new Watcher();
		this.watcherRendering = new Watcher();

		this.maxX = width  / PIXEL_PER_METER;
		this.maxY = height / PIXEL_PER_METER;

		this.stepCount = 0;

		// config render
		readConfigRenderShowNode();
		readConfigRenderShowWind();

		// update config
		readConfigSimulationTimeStepMode();

		// reset debug GUI
		resetDebug();

		// update gui
		this.updateGUIControls();

		delete _simArrayObjects;

		this.draw();

		this.previousTime = performance.now();
	}

	/* ------------------------ *\
	|* --- CREATION METHODS --- *|
	\* ------------------------ */
	this.flush = function() {
		this.pointMasses.length = 0;
		this.draw();
	}

	this.addPointMass = function(x, y, mass) {
		var pointMass = new PointMass(x, y, mass);
		this.pointMasses.push(pointMass);
		return pointMass;
	}

	this.removePointMass = function(pointMass) {
		this.pointMasses = this.pointMasses.filter(function(item) {
			if(item !== pointMass)
			{
				return true;
			}
			else {
				item.links = item.links.splice(0,item.links.length);
				return false;
			}
		});
	};

	this.generateCable = function(x, y, ropeMass, length, distance, stiffness, maxDistance, isElastic) {
		// count nodes
		var nodeCount = Math.ceil(length / distance);
		var nodeMass = ropeMass / nodeCount;

		// get root
		var root = this.addPointMass(x, y, nodeMass);
		root.fixAt(x, y);

		// store root as previousnode
		var previousNode = root;

		// distance used in loop
		var d = distance;

		for(var i = 1; i < nodeCount; i++) {
			var newX = x + d * i;

			if(newX > this.maxX || newX < this.minX) {
				d = -d;
				newX += d;
			}
			var node = this.addPointMass(newX, y, nodeMass);

			if(isElastic) {
				node.attachTo(previousNode, distance, stiffness, maxDistance);
			}
			else {
				node.attachTo(previousNode, distance);
			}

			// store node as root for the next one
			previousNode = node;
		}

		// draw freshly created rope
		this.draw();

		return root;
	};

	this.addRope = function(x, y, ropeMass, length, distance) {
		return this.generateCable(x, y, ropeMass, length, distance, 0, 0, false);
	};

	this.addElastic = function(x, y, ropeMass, length, distance, stiffness, maxDistance) {
		return this.generateCable(x, y, ropeMass, length, distance, stiffness, maxDistance, true);
	};

	this.addCurtain = function(x, y, mass, length, distance, stiffness, maxDistance) {

		// temp vars
		var node;
		var curtain = [];

		var width = Math.floor(length / distance);
		var height = width;

		var nodeMass = parseFloat(mass / (width * height));
		var breakable = _gui_checkBox_ropeBreakable.checked;

		// create the curtain
	  for (var j = 0; j < width; j++) {
			curtain[j] = [];
	    for (var i = 0; i < height; i++) {
	      node = this.addPointMass(x + i * distance, y + j * distance, nodeMass);

	      if (i != 0)
				{
					if(breakable) {
						node.attachTo(curtain[j][i - 1], distance, stiffness, maxDistance);
					}
					else {
						node.attachTo(curtain[j][i - 1], distance);
					}
				}
	      // the index for the PointMasss are one dimensions,
	      // so we convert x,y coordinates to 1 dimension using the formula y*width+x
	      if (j != 0)
				{
					if(breakable) {
						node.attachTo(curtain[j - 1][i], distance, stiffness, maxDistance);
					}
					else {
						node.attachTo(curtain[j - 1][i], distance);
					}
				}

	      // we pin the very top PointMasss to where they are
	      if (j == 0)
	        node.fixAt(node.x, node.y);

				// store the point
				curtain[j].push(node);
	    }
	  }

		// draw freshly created rope
		this.draw();

	}

	this.addPendulum = function(x, y, mass, distance) {
		//var rand = Math.random();
		var root = this.addPointMass(x, y, 10);
		var pendulum1 = this.addPointMass(x + 0.01, y - distance, mass);
		var pendulum2 = this.addPointMass(x + 0.01, y - distance * 2, mass);

		pendulum2.attachTo(pendulum1, distance);
		pendulum1.attachTo(root, distance);
		root.fixAt(x, y);

		return root;
	}

	/* ------------------------ *\
	|* --- HANDLING METHODS --- *|
	\* ------------------------ */

	this.nextStep = function(deltaTimeMS) {

		// start the timer
		this.watcherUpdating.start();

		// slice time
		let deltaTimeSChunck = parseFloat(deltaTimeMS / (1000.0 * _simConfigSimulationAccuracy));

		for (let x = 0; x < _simConfigSimulationAccuracy; x++) {
			// update each PointMass's position
			for (let i = 0; i < this.pointMasses.length; this.pointMasses[i++].update(deltaTimeSChunck, this.wind));
			for (let i = 0; i < this.pointMasses.length; this.pointMasses[i++].solveConstraints(this.minX, this.minY, this.maxX, this.maxY));
		}

		// step wind simulation
		this.wind.step();

		// increase step
		this.stepCount++;

		// store deltaT
		this.watcherUpdating.stop();
	};

	this.update = function() {
		// dt
		var currentTime = performance.now();
		var dt = parseFloat(currentTime - this.previousTime);

		if(dt + this.watcherUpdating.averageTime >= _simConfigSimulationRefreshRate) {
			// refresh previous time
			this.previousTime = currentTime;

			// step simulation
			if(_simConfigSimulationIsFixed) {
				this.nextStep(_simConfigSimulationFixedDeltaT);
			}
			else {
				let fps = this.watcherUpdating.fps || _gui_spinBox_refreshRate.value;
				let dtms = Math.floor(1000.0 / fps);
				_gui_spinBox_fixedDeltaT.value = dtms;
				this.nextStep(dtms);
			}
		}
	};

	this.draw = function() {
		// init
		this.watcherRendering.start();

		// clear context
		context.clearRect(this.minX, this.minY, width, height);

		// draw wind vectors
		this.wind.draw(context);

		// draw points and links
		for(let i = 0; i < this.pointMasses.length; this.pointMasses[i++].draw(context, _simConfigRenderShowNodes));

		// store deltaT
		this.watcherRendering.stop();
	};
}

// --------------------------- //
// --- END OF PHYSIC CLASS --- //
// --------------------------- //
