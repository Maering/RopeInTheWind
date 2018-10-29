/* Disclamer
	* Author : Segan Salomon
	* email  : segan.salomon@he-arc.ch
	* date	 : april-may 2018

	This class is intended to provide an average execution time

	see main.js for more informations !
*/
function Watcher() {
	this.frameWatcher = 0;
	this.lastLoopTime = 0;
	this.startLoopTime = 0;
  this.numberOfTimeToKeep = 20;

	this.listLoopMS = [];
	this.loopCount = 0;
	this.fps = 0;
	this.averageTime = 0;

	//while(this.listLoopMS.length < this.numberOfTimeToKeep) this.listLoopMS.push(1);

	this.getAverageTime = function() {
		// averageTime
		if(this.listLoopMS.length > 0) {
			// reset sum
			let totalMS = 0.0;
			// sum deltaT
			for(let i = 0; i < this.listLoopMS.length; totalMS += this.listLoopMS[i++]);
			// set averageTime
			this.averageTime = parseFloat(totalMS / this.listLoopMS.length);
			// flush old values
			while(this.listLoopMS.length > this.numberOfTimeToKeep) this.listLoopMS.shift();
		}
	}

	this.update = function()
	{
		var currentTime = performance.now();
		var deltaTFPS = currentTime - this.frameWatcher;
		if (deltaTFPS >= 1000.0) {
				this.frameWatcher = currentTime;
				this.loopCount = 0;
		}
		else {
			// --- Get loop per second --- //
			this.fps = parseInt(Math.floor(parseFloat((this.loopCount / deltaTFPS)) * 1000));
		}
	};

	this.start = function() {
		this.startLoopTime = performance.now();
		this.loopCount += 1;
	};

	this.stop = function () {
		this.loopCount++;

		// store delay
		this.lastLoopTime = parseFloat(performance.now() - this.startLoopTime);

		// update timer and averageTime
		this.update();
		this.getAverageTime();

		// add delay to the list
		if(this.lastLoopTime > 0)
			this.listLoopMS.push(this.lastLoopTime);
	};
}
