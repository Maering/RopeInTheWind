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
var canvas = document.getElementById("canvas");
var	showcase = document.getElementById("ritw-div-showcase-canevas");

canvas.width = Math.floor(document.getElementById("simulator").offsetWidth), //window.innerWidth,
canvas.height = Math.floor(document.getElementById("simulator").offsetHeight);//window.innerHeight;

showcase.width = Math.floor(document.getElementById("ritw-div-showcase").offsetWidth), //window.innerWidth,
showcase.height = Math.floor(document.getElementById("ritw-div-showcase").offsetHeight);//window.innerHeight;

// GUI ref
// CONTROLS
var _gui_button_startStop = document.getElementById("btnStartStop");
var _gui_button_pauseResume = document.getElementById("btnPauseResume");

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

// WIND PARAMETERS
var _gui_spinBox_windEvolutionStep = document.getElementById("spinBoxWindZ");
var _gui_spinBox_windForce = document.getElementById("spinBoxWindForce");

// ___ VARS INIT ___ //

// config new rope
var _simConfigNewRopePositionX = 0;
var _simConfigNewRopePositionY = 0;
var _simConfigNewRopeMass = 0;
var _simConfigNewRopeLength = 0;
var _simConfigNewRopeDistance = 0;

// CONST
var NODEVALUE = "node";
var ROPEVALUE = "rope";
var CURTAINVALUE = "curtain";
var PENDULUMVALUE = "pendulum";

// simulation
var _simArrayObjects = [];
var _simPhysics = new PhysicEngine(canvas);

// showcase simulation
var _simPhysicsShowCase = new PhysicEngine(showcase);

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

/* ------------------------- *\
|* ---- CONTROL METHODS ---- *|
\* ------------------------- */

function init() {

	setGUINewRopePositionX(Math.floor(canvas.width / 2));
	setGUINewRopePositionY(Math.floor(canvas.height / 4));
	setGUINewNodeMass(500);
	setGUINewRopeLength(150);
	setGUINewRopeDistance(15);

	loadConfig();

	// disable vectors rendering
	_simPhysicsShowCase.wind.displayVectors = false;
	updateShowCase();
}

function updateShowCase()
{
	// flush showcase so we display only one element
	_simPhysicsShowCase.flush();

	// start the engine if it is stopped
	if(!_simPhysicsShowCase.isStarted)
		_simPhysicsShowCase.start();

	// create a new item
	var radiosItems = document.getElementsByName("objectType");
	for (var i = 0, length = radiosItems.length; i < length; i++)
	{
		if (radiosItems[i].checked)
		{
			var x = ((_simPhysicsShowCase.minX + _simPhysicsShowCase.maxX) / 2.0) - (_simConfigNewRopeLength / 2.0);
			var y = (_simPhysicsShowCase.minX + _simPhysicsShowCase.maxX) / 8.0;

			switch(radiosItems[i].value)
			{
				case NODEVALUE:
					_simPhysicsShowCase.addPointMass(x, y, _simConfigNewRopeMass);
					break;
				case ROPEVALUE:
					_simPhysicsShowCase.addRope(x, y, _simConfigNewRopeMass, _simConfigNewRopeLength, _simConfigNewRopeDistance);
					break;
				case CURTAINVALUE:
					_simPhysicsShowCase.addCurtain(x, y, _simConfigNewRopeMass, _simConfigNewRopeLength, _simConfigNewRopeDistance, 0.5, _simConfigNewRopeDistance * 2);
					break;
				case PENDULUMVALUE:
					setGUINewRopeDistance(80);
					readConfigNewRopeDistance();
					_simPhysicsShowCase.addPendulum(x, y, _simConfigNewRopeMass, _simConfigNewRopeDistance);
					break;
			}

			// only one radio can be logically checked, don't check the rest
			break;
		}
	}
}

function resetAll() {
	_simPhysics.reset();
	init();
}

function startStopSimulation() {
	if(_simPhysics.isStarted == true) {
		document.getElementById("ritw-icon-play").style.display = "inline";
		document.getElementById("ritw-icon-stop").style.display = "none";
		_simPhysics.stop();
	}
	else {
		document.getElementById("ritw-icon-play").style.display = "none";
		document.getElementById("ritw-icon-stop").style.display = "inline";
		_simPhysics.start();
	}
}

function pauseResumeSim() {
	if(_simPhysics.isPaused == true) {
		document.getElementById("ritw-icon-resume").style.display = "none";
		document.getElementById("ritw-icon-pause").style.display = "inline";
		_simPhysics.resume();
	}
	else {
		document.getElementById("ritw-icon-resume").style.display = "inline";
		document.getElementById("ritw-icon-pause").style.display = "none";
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

	//render
	readConfigRenderShowNode();
	readConfigRenderShowWind();
	readConfigRenderWindGrid();

	// config wind
	readConfigWindChaosFactor();
	readConfigWindSpeedFactor();

	// config rope
	readConfigNewRopePositionX();
	readConfigNewRopePositionY();
	readConfigNewRopeMass();
	readConfigNewRopeLength();
	readConfigNewRopeDistance();
}

function resetDebug() {
	setDebug(0, 0, 0, 0);
}

/* ------------------------------- *\
|* ---- RENDER CONFIG METHODS ---- *|
\* ------------------------------- */

function readConfigRenderShowNode() {
	
	if(_simPhysics != null) {
		_simPhysics.displayNodes = _gui_checkBox_renderNodes.checked;
		_simPhysics.draw();
	}
}

function readConfigRenderShowWind() {
	
	if(_simPhysics != null) 
	{
		_simPhysics.wind.displayVectors = _gui_checkBox_renderWindVectors.checked;
		_simPhysics.draw();
	}
}

function readConfigRenderWindGrid() {
	
	if(_simPhysics != null) 
	{
		_simPhysics.wind.displayGrid = _gui_checkBox_renderWindGrid.checked;
		_simPhysics.draw();
	}
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

function readConfigNewRopeDistance() {

	_simConfigNewRopeDistance = MillimetersToMeters(_gui_spinBox_ropeDistance.value);
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

function setGUINewRopeDistance(arg) {
	_gui_spinBox_ropeDistance.value = arg || Math.floor(MetersToMillimeters(_simConfigNewRopeDistance));
}

/* ----------------------------- *\
|* ---- WIND CONFIG METHODS ---- *|
\* ----------------------------- */

function readConfigWindChaosFactor() {
	if(_simPhysics != null) 
	{
		_simPhysics.wind.chaosFactor = _gui_spinBox_windEvolutionStep.value / 10000.0;
	}
}

function readConfigWindSpeedFactor() {
	if(_simPhysics != null) 
	{
		_simPhysics.wind.windForceFactor = _gui_spinBox_windForce.value;
		document.getElementById("speedInKMH").innerHTML = (_simPhysics.wind.windForceFactor * 3.6).toFixed(2) + "km/h";
	}
}

/* ------------------------ *\
|* ---- CREATE METHODS ---- *|
\* ------------------------ */

function createNewCable() {
	_simArrayObjects.push(
		_simPhysics.addRope(
			_simConfigNewRopePositionX,
			_simConfigNewRopePositionY,
			_simConfigNewRopeMass,
			_simConfigNewRopeLength,
			_simConfigNewRopeDistance
		)
	);
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
	_simPhysics.addCurtain(_simConfigNewRopePositionX, _simConfigNewRopePositionY, _simConfigNewRopeMass, _simConfigNewRopeLength, _simConfigNewRopeDistance, 0.5, _simConfigNewRopeDistance * 2);
	_simPhysics.draw();
}

function createSelectedItem() 
{
	var radiosItems = document.getElementsByName("objectType");
	for (var i = 0, length = radiosItems.length; i < length; i++)
	{
		if (radiosItems[i].checked)
		{
			switch(radiosItems[i].value)
			{
				case NODEVALUE:
					createSimplePointMass();
					break;
				case ROPEVALUE:
					createNewCable();
					break;
				case CURTAINVALUE:
					createNewCurtain();
					break;
				case PENDULUMVALUE:
					createNewPendulum();
					break;
			}

			// stop the showcase
			_simPhysicsShowCase.stop();

			// only one radio can be logically checked, don't check the rest
			break;
		}
	}
}