/* Disclamer
	* Author : Segan Salomon
	* email  : segan.salomon@he-arc.ch
	* date	 : april-may 2018

	see main.js for more informations !
*/
function Link(pointMass1, pointMass2, distance, breakable, stiffness, maxLength) {
	this.breakable = breakable || false;
	this.pointMass1 = pointMass1;
	this.pointMass2 = pointMass2;
	this.distance = distance;
	this.stiffness = stiffness || 1;
	this.maxLength = maxLength || Number.MAX_SAFE_INTEGER;

	this.solve = function() {

	  // calculate the distance between the two PointMasss
	  let dX = this.pointMass2.x - this.pointMass1.x;
	  let dY = this.pointMass2.y - this.pointMass1.y;
	  let length = Math.sqrt(dX * dX + dY * dY);

	  // if the distance > maxLength, the cloth tears
		if(this.breakable && length > this.maxLength)
	  	this.pointMass1.removeLink(this);

		// find the difference, or the ratio of how far along the restingDistance the actual distance is.
	  let difference = (this.distance - length) / length;

	  // Inverse the mass quantities
	  let im1 = 1.0 / this.pointMass1.getMass();
	  let im2 = 1.0 / this.pointMass2.getMass();
	  let scalarP1 = (im1 / (im1 + im2)) * this.stiffness;
	  let scalarP2 = this.stiffness - scalarP1;

		// Push/pull based on mass
	  // heavier objects will be pushed/pulled less than attached light objects
		if(!this.pointMass1.fixed) {
			let diffP1X = (dX * scalarP1 * difference);
			let diffP1Y = (dY * scalarP1 * difference);
			this.pointMass1.x -= diffP1X;
			this.pointMass1.y -= diffP1Y;
		}
		if(!this.pointMass2.fixed) {
			let diffP2X = (dX * scalarP2 * difference);
			let diffP2Y = (dY * scalarP2 * difference);
			this.pointMass2.x += diffP2X;
			this.pointMass2.y += diffP2Y;
		}

	};

	this.draw = function(renderTarget) {

		let posX1Pixels = Math.floor(this.pointMass1.x * PIXEL_PER_METER);
		let posY1Pixels = Math.floor(this.pointMass1.y * PIXEL_PER_METER);
		let posX2Pixels = Math.floor(this.pointMass2.x * PIXEL_PER_METER);
		let posY2Pixels = Math.floor(this.pointMass2.y * PIXEL_PER_METER);

		renderTarget.beginPath();
		renderTarget.moveTo(posX1Pixels, posY1Pixels);
		renderTarget.lineTo(posX2Pixels, posY2Pixels);
		renderTarget.stroke();
	};
};
// --- END OF LINK CLASS --- //
