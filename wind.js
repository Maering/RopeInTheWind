/* Disclamer
	* Author : Segan Salomon
	* email  : segan.salomon@he-arc.ch
	* date	 : april-may 2018

	see main.js for more informations !
*/
// 2 pi
let toolbox_twoPI = Math.PI * 2.0;

class Wind {
	constructor(columns, rows, cellSize) {

		this.z = 0;
		this.cellSize = cellSize;
		this.halfCellSize = this.cellSize / 2.0;
		this.columns = columns;
		this.rows = rows;
		this.min = Number.MAX_SAFE_INTEGER;
		this.max = Number.MIN_SAFE_INTEGER;

		// display
		this.displayVectors = true;
		this.displayGrid = false;

		// wind properties
		this.chaosFactor = 4 / 10000.0;
		this.windForceFactor = 10;

		// Init Vectors
		this.vectors = new Array(this.columns);
		for(let i = 0; i < this.columns; i++)
		{
			this.vectors[i] = new Array(this.rows);
			for(let j = 0; j < this.rows; j++)
			{
				this.vectors[i][j] = new Array(2);
			}
		}

		// https://www.html5rocks.com/en/tutorials/canvas/performance/
		this.grid_canvas = document.createElement('canvas');
		this.grid_canvas.width = canvas.width;
		this.grid_canvas.height = canvas.height;
		this.grid_context = this.grid_canvas.getContext('2d');
		this.grid_generated = false;
	}

	/* --------------- *\
	|* --- METHODS --- *|
	\* --------------- */
	reset(columns, rows, cellSize) {
		this.z = 0;
		this.cellSize = cellSize;
		this.columns = columns;
		this.rows = rows;
		this.min = Number.MAX_SAFE_INTEGER;
		this.max = Number.MIN_SAFE_INTEGER;
		// render reset
		this.grid_canvas = document.createElement('canvas');
		this.grid_canvas.width = canvas.width;
		this.grid_canvas.height = canvas.height;
		this.grid_context = this.grid_canvas.getContext('2d');
		this.grid_generated = false;
		noise.seed(Math.random());
		this.refreshField();
	};

	refreshField() {
		this.vectors = new Array(this.columns);
		for (let x = 0; x < this.columns; x++) {
			this.vectors[x] = new Array(this.rows);
			for (let y = 0; y < this.rows; y++) {
				let angle = noise.simplex3(x / 50.0, y / 50.0, this.z) * toolbox_twoPI;
				let length = Math.abs(noise.simplex3(x / 100.0 + 40000.0, y / 100.0 + 40000.0, this.z));
				if (length > this.max)
					this.max = length;
				if (length < this.min)
					this.min = length;
				this.vectors[x][y] = [length * Math.cos(angle), length * Math.sin(angle)];
			}
		}
	};

	step() {
		this.z += this.chaosFactor;
		this.refreshField();
	};

	generateRenderedGrid() {
		this.grid_context.strokeStyle = 'rgba(0,0,0,0.3)';
		this.grid_context.beginPath();
		for (let column = 0; column < this.columns; column++) {
			for (let row = 0; row < this.rows; row++) {
				let px = Math.floor(column * this.cellSize);
				let py = Math.floor(row * this.cellSize);
				let pwidth = Math.floor(px + this.cellSize);
				let pheight = Math.floor(py + this.cellSize);
				this.grid_context.moveTo(px, py);
				this.grid_context.lineTo(px, py + this.cellSize);
				this.grid_context.moveTo(px, py);
				this.grid_context.lineTo(px + this.cellSize, py);
			}
		}
		this.grid_context.stroke();
		this.grid_generated = true;
	};

	draw(renderTarget) {
		let iniStrokeStyle = renderTarget.strokeStyle;
		let iniFillStyle = renderTarget.fillStyle;

		// render grid
		if (this.displayGrid) {
			// optimized way to render a non-changing image
			if (!this.grid_generated)
				this.generateRenderedGrid();
				
			renderTarget.drawImage(this.grid_canvas, 0, 0);
		}
		if (this.displayVectors) {
			// set color to red
			renderTarget.strokeStyle = renderTarget.fillStyle = "#FF0000";
			// draw wind
			for (let i = 0; i < this.columns; i++) {
				for (let j = 0; j < this.rows; j++) {
					let _x = Math.floor((i * this.cellSize) + this.halfCellSize);
					let _y = Math.floor((j * this.cellSize) + this.halfCellSize);
					let _vx = this.vectors[i][j][0] * this.windForceFactor * 2;
					let _vy = this.vectors[i][j][1] * this.windForceFactor * 2;
					// Ugly way to render, would be better to merge batch call but the result is not what we could expect
					renderTarget.beginPath();
					renderTarget.arc(_x, _y, 2, 0, 2 * Math.PI, true);
					renderTarget.fill();
					renderTarget.beginPath();
					renderTarget.moveTo(_x, _y);
					renderTarget.lineTo(_x + _vx, _y + _vy);
					renderTarget.stroke();
				}
			}
		}
		// restor context
		renderTarget.strokeStyle = iniStrokeStyle;
		renderTarget.fillStyle = iniFillStyle;
	};

	// x and y position are given in meters
	getWindVector(x, y) {
		// transform point location given in meters to pixels
		let transform = PIXEL_PER_METER / this.cellSize;
		let _x = x * transform;
		let _y = y * transform;
		let column = Math.floor(_x);
		let row = Math.floor(_y);
		// protect column and width
		if (column < 0 || row < 0 || column >= this.columns || row >= this.rows) {
			return [0, 0];
		}
		else {
			return this.vectors[column][row];
		}
	};
}

