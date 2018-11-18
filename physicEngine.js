// -------------------------- //
// ------ PHYSIC CLASS ------ //
// -------------------------- //
class PhysicEngine {
	constructor(renderTarget) {
		// display
		this.canvas = renderTarget;
		this.renderTarget = this.canvas.getContext("2d");
		this.displayNodes = true;

		this.minX = 0;
		this.minY = 0;
		this.maxX = this.canvas.width / PIXEL_PER_METER;
		this.maxY = this.canvas.height / PIXEL_PER_METER;

		// timing (use this instead of watcher.js since it lags the code by 8 ms);
		this.previousTime = performance.now();

		// physic storage
		this.pointMasses = [];
		this.watcherUpdating = new Watcher();
		this.watcherRendering = new Watcher();

		// wind
		this.wind = new Wind(Math.ceil(this.canvas.width / 36), Math.ceil(this.canvas.height / 36), 36);

		// PUBLIC
		this.stepCount = 0;
		this.fixedDeltaT = 60;
		this.accuracy = 3;
		this.fixedSimulationRefreshRate = false;
		this.simulationRefreshRateTarget = 1000.0 / this.fixedDeltaT;

		// intervals
		this.updateInterval;
		this.drawingInterval;

		// controls
		this.isPaused = false;
		this.isStarted = false;
	}

	/* --------------- *\
	|* --- METHODS --- *|
	\* --------------- */

	startRendering() {
		/*
		// FROM : https://gist.github.com/paulirish/1579671 stoikerty, 6 Mar 2014
		var hasPerformance = !!(window.performance && window.performance.now);

		// Add new wrapper for browsers that don't have performance
		if (!hasPerformance) {
			// Store reference to existing rAF and initial startTime
			var rAF = window.requestAnimationFrame, startTime = +new Date;

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
			};
		}
		(function render() {
			requestAnimationFrame(render);
			this.draw();
		})();
		*/
	};

	reset() {
		this.stop();
		this.wind.reset(Math.ceil(this.canvas.width / 36), Math.ceil(this.canvas.height / 36), 36);
	};

	/* ----------------------- *\
	|* --- CONTROL METHODS --- *|
	\* ----------------------- */
	start() {
		if (this.isStarted == true)
			this.reset();
		this.isStarted = true;
		this.isPaused = true;
		let that = this;
		this.drawingInterval = setInterval(function() { that.draw() }, 1);
		this.resume();
	};

	step() {
		if (this.isStarted == false) {
			this.isStarted = true;
			this.isPaused = false;
		}

		// pause sim
		this.pause();

		// step sim
		this.nextStep(this.fixedDeltaT);
		this.draw();
	};

	pause() {
		if (this.isStarted == true && this.isPaused == false) {
			clearInterval(this.drawingInterval);
			clearInterval(this.updateInterval);
			this.isPaused = true;
		}
	};

	resume() {
		if (this.isStarted == true && this.isPaused == true) {
			let that = this;
			this.drawingInterval = setInterval(function() { that.draw() }, 1);
			this.updateInterval = setInterval(function() { that.update() }, 1);
			this.isPaused = false;
		}
	};

	stop() {
		this.pause();
		this.flush();

		// reset security
		this.isStarted = false;
		this.isPaused = false;
		this.watcherUpdating = new Watcher();
		this.watcherRendering = new Watcher();
		this.maxX = this.canvas.width / PIXEL_PER_METER;
		this.maxY = this.canvas.height / PIXEL_PER_METER;
		this.stepCount = 0;

		// config render
		readConfigRenderShowNode();
		readConfigRenderShowWind();

		// reset debug GUI
		resetDebug();

		this.draw();
		this.previousTime = performance.now();
	};
	
	flush() {
		this.pointMasses.length = 0;
		this.draw();
	};

	/* ------------------------ *\
	|* --- CREATION METHODS --- *|
	\* ------------------------ */

	addPointMass(x, y, mass) {
		var pointMass = new PointMass(x, y, mass);
		this.pointMasses.push(pointMass);
		return pointMass;
	};

	removePointMass(pointMass) {
		this.pointMasses = this.pointMasses.filter(function (item) {
			if (item !== pointMass) {
				return true;
			}
			else {
				item.links = item.links.splice(0, item.links.length);
				return false;
			}
		});
	};

	generateCable(x, y, ropeMass, length, distance, stiffness, maxDistance, isElastic) {
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
		for (var i = 1; i < nodeCount; i++) {
			var newX = x + d * i;
			if (newX > this.maxX || newX < this.minX) {
				d = -d;
				newX += d;
			}
			var node = this.addPointMass(newX, y, nodeMass);
			if (isElastic) {
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

	addRope(x, y, ropeMass, length, distance) {
		return this.generateCable(x, y, ropeMass, length, distance, 0, 0, false);
	};

	addElastic(x, y, ropeMass, length, distance, stiffness, maxDistance) {
		return this.generateCable(x, y, ropeMass, length, distance, stiffness, maxDistance, true);
	};

	addCurtain(x, y, mass, length, distance, stiffness, maxDistance) {
		// temp vars
		var node;
		var curtain = [];
		var width = Math.floor(length / distance);
		var height = width;
		var nodeMass = parseFloat(mass / (width * height));

		// create the curtain
		for (var j = 0; j < width; j++) {
			curtain[j] = [];
			for (var i = 0; i < height; i++) {
				node = this.addPointMass(x + i * distance, y + j * distance, nodeMass);
				if (i != 0) {
					node.attachTo(curtain[j][i - 1], distance);
				}
				// the index for the PointMasss are one dimensions,
				// so we convert x,y coordinates to 1 dimension using the formula y*width+x
				if (j != 0) {
					node.attachTo(curtain[j - 1][i], distance);
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
	};

	addPendulum(x, y, mass, distance) {
		//var rand = Math.random();
		var root = this.addPointMass(x, y, 10);
		var pendulum1 = this.addPointMass(x + 0.01, y - distance, mass);
		var pendulum2 = this.addPointMass(x + 0.01, y - distance * 2, mass);
		pendulum2.attachTo(pendulum1, distance);
		pendulum1.attachTo(root, distance);
		root.fixAt(x, y);
		return root;
	};

	/* ------------------------ *\
	|* --- HANDLING METHODS --- *|
	\* ------------------------ */
	nextStep(deltaTimeMS) {
		// start the timer
		this.watcherUpdating.start();
		// slice time
		let deltaTimeSChunck = parseFloat(deltaTimeMS / (1000.0 * this.accuracy));
		for (let x = 0; x < this.accuracy; x++) {
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

	update() {
		// dt
		var currentTime = performance.now();
		var dt = parseFloat(currentTime - this.previousTime);
		
		if (dt + this.watcherUpdating.averageTime >= this.simulationRefreshRateTarget) {
			// refresh previous time
			this.previousTime = currentTime;

			// step simulation
			if (this.fixedSimulationRefreshRate == true) {
				this.nextStep(this.fixedDeltaT);
			}
			else {
				let fps = this.watcherUpdating.fps;
				let dtms = Math.floor(1000.0 / fps);
				this.nextStep(dtms);
			}
		}
	};

	draw() {
		// init
		this.watcherRendering.start();

		// clear context
		this.renderTarget.clearRect(this.minX, this.minY, this.canvas.width, this.canvas.height);

		// draw wind vectors
		this.wind.draw(this.renderTarget);

		// draw points and links
		for (let i = 0; i < this.pointMasses.length; this.pointMasses[i++].draw(this.renderTarget, this.displayNodes));

		// store deltaT
		this.watcherRendering.stop();
	};
}

// --------------------------- //
// --- END OF PHYSIC CLASS --- //
// --------------------------- //
