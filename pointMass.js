/* Disclamer
	* Author : Segan Salomon
	* email  : segan.salomon@he-arc.ch
	* date	 : april-may 2018

	see main.js for more informations !
*/
function PointMass (x, y, mass) {
	this.x = parseFloat(x);
	this.y = parseFloat(y);

	this.lastX = this.x;
	this.lastY = this.y;

	this.forceX = 0.0;
	this.forceY = 0.0;

	this.mass = mass;
	this.gravity = mass * 9.81;
	// http://www.southernropes.co.za/catalogue/physical-rope-properties.html
	this.radius = Math.sqrt((this.mass / 1.14) / 12.56); // 1.14 -> nylon constant
	this.radiusVisual = this.radius * 30;

	this.fixed = false;
	this.fixX = -1.0;
	this.fixY = -1.0;
	this.links = [];

	// used to prevent crazy reaction when this hurt a constrait border
	this.invalidNextSpeed = false;

	this.getMass = function () {
		var totalMass = this.mass;

		/*
		//FIXME : max weight should be on the node between the two fixed ? Currently at the last link
		for(var i = 0; i < this.links.length; i++)
		{
			totalMass += this.links[i].pointMass2.getMass();
		}
		*/

		return totalMass;
	};

	this.draw = function(renderTarget, visible) {
		if(visible)
		{
			var posXPixels = Math.floor(this.x * PIXEL_PER_METER);
			var posYPixels = Math.floor(this.y * PIXEL_PER_METER);

			renderTarget.beginPath();
			// x, y, radius, starting angle, ending angle
			renderTarget.arc(posXPixels, posYPixels, this.radiusVisual, 0, 2 * Math.PI, true);
			renderTarget.fill();
	 	}
		// Draw links
		for(var i = 0; i < this.links.length; this.links[i++].draw(renderTarget));
	};

	this.update = function(deltaTimeS, wind) {

		// reduce useless cpu usage
		if(this.fixed == true)
			return;

		// default gravity
		this.applyForce(0, this.gravity);

		// winf force
		this.solveWind(deltaTimeS, wind);

		// get second^2
    var deltaTimeSquared = deltaTimeS * deltaTimeS;

		// acceleration = force / mass
		var accX = this.forceX/this.getMass();
		var accY = this.forceY/this.getMass();

		// calculate the next position using Verlet Integration
		var newX = (2.0 * this.x) + (accX * deltaTimeSquared) - this.lastX;
		var newY = (2.0 * this.y) + (accY * deltaTimeSquared) - this.lastY;

		// location assignation
		this.lastX = this.x;
		this.lastY = this.y;

		this.x = newX;
		this.y = newY;

		// reset force
    this.resetForce();

	};

	this.solveConstraints = function(minX, minY, maxX, maxY) {

		// Links make sure PointMasss connected to this one react
		for (var i = 0; i < this.links.length; this.links[i++].solve());

		// make sure the PointMass stays in its place if it's pinned
		if (this.fixed) {
			this.x = this.fixX;
			this.y = this.fixY;
		}
		else {
			// keep the PointMasss within the screen
			if(this.x > maxX) {
				this.lastX = this.x = maxX;
				this.invalidNextSpeed = true;
			}
			else if(this.x < minX) {
				this.lastX = this.x = minX;
				this.invalidNextSpeed = true;
			}
			if(this.y > maxY) {
				this.lastY = this.y = maxY;
				this.invalidNextSpeed = true;
			}
			else if(this.y < minY) {
				this.lastY = this.y = minY;
				this.invalidNextSpeed = true;
			}
		}
	};

	this.applyForce = function(fX, fY) {
		this.forceX += parseFloat(fX);
		this.forceY += parseFloat(fY);
	};

	this.resetForce = function() {
		this.forceX = 0;
		this.forceY = 0;
	};

	this.solveWind = function(deltaTimeS, wind) {
		/* --- WIND FORCE --- *\
		// http://hyperphysics.phy-astr.gsu.edu/hbase/airfri2.html#c2
		Drag depends on the properties of the fluid and on the size, shape, and speed of the object. One way to express this is by means of the drag equation:

		FORMULA => FD = 0.5 ρ*v2*CD*A

		where

		FD is the drag force,
		ρ  is the density of the fluid,
		v  is the speed of the object relative to the fluid,
		A  is the cross sectional area, and
		CD is the drag coefficient – a dimensionless number. 0.42 for a half sphere

		Air density = 1.29

		4 pi = 12.566370614359172953850573533118
		half spherical object area = 4 * pi * r * r

		FORMULA => F = 0.5 * 1.29 * (vObject - vWind)^2 * 0.42 * 4pi*radius^2
		FORMULA => F = 0.2709 * 12.5663 * (vObject - vWind)^2 * radius^2
		FORMULA => F = 3.40421067 * (vObject - vWind)^2 * radius^2
		*/

		// get wind vectors
		let windVectors = wind.getWindVector(this.x, this.y);

		// apply friction
		if(!this.invalidNextSpeed)
		{
			var deltaX = this.x - this.lastX;
			var deltaY = this.y - this.lastY;

			var velX = parseFloat(deltaX / deltaTimeS);
			var velY = parseFloat(deltaY / deltaTimeS);

			var relativeVelX = parseFloat(velX - (windVectors[0] * _simConfigWindSpeedFactor));
			var relativeVelY = parseFloat(velY - (windVectors[1] * _simConfigWindSpeedFactor));

			// precomputed data help run the code faster
			var formulaSimplified = 3.40421067 * this.radius * this.radius;

			// The force must oppose the object
			var xswitcher = relativeVelX < 0 ? 1.0 : -1.0;
			var yswitcher = relativeVelY < 0 ? 1.0 : -1.0;


			var forceX = formulaSimplified * relativeVelX * relativeVelX;
			var forceY = formulaSimplified * relativeVelY * relativeVelY;

			this.applyForce(forceX * xswitcher, forceY * yswitcher);

			// delta Location should now be correct
			this.invalidNextSpeed = false;
		}
	};

	this.fixAt = function(x, y) {
		this.fixed = true;
		this.fixX = parseFloat(x);
		this.fixY = parseFloat(y);
	};

	this.detach = function() {
		this.fixed = false;
		this.fixX = -1.0;
		this.fixY = -1.0;
	};

	// attachTo can be used to create links between this PointMass and other PointMasss
	this.attachTo = function(pointMass, distance, stiffness, maxLength) {
		if(stiffness != null) {
			this.links.push(new Link(this, pointMass, distance, true, stiffness, maxLength));
		}
		else {
			this.links.push(new Link(this, pointMass, distance));
		}
	};

	this.removeLink = function (lnk) {
		this.links = this.links.filter(function(item) {
			return item !== lnk;
		});
	}
}
// --- END OF POINTMASS CLASS --- //
