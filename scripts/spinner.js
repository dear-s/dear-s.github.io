var spinner = {};
window.spinner = spinner;

window.requestAnimationFrame = window.requestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.msRequestAnimationFrame ||
	function (callback) {
		return setTimeout(callback, 1000 / 60)
	};

window.cancelAnimationFrame = window.cancelAnimationFrame ||
	window.mozCancelAnimationFrame ||
	window.webkitCancelAnimationFrame ||
	window.clearTimeout;

/** Converts num, on the range of fromMin to fromMax, mapped linearly
  * to the range toMin to toMax
  * @private
  */
spinner.map = function(num, fromMin, fromMax, toMin, toMax) {
	return (num - fromMin) / (fromMax - fromMin) * (toMax - toMin) + toMin;
}

/** Returns a random integer between min (inclusive) and max (exclusive)
  * @private
  */
spinner.randomInt = function(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(this.map(Math.random(), 0, 1, min, max));
}

/**
  * @private
  * @return {object}
  */
spinner.randomDesaturatedColor = function() {
	return {
		hue: this.randomInt(0, 360),
		sat: this.randomInt(20, 30),
		lum: this.randomInt(40, 50)
	};
}

spinner.container = document.getElementById('spinner-container');
spinner.canvas = document.createElement('canvas');
spinner.ctx = spinner.canvas.getContext('2d');
spinner.raf = null;
spinner.canvas.style.display = 'block';
spinner.container.appendChild(spinner.canvas);

spinner.color = spinner.randomDesaturatedColor();
spinner.BACKGROUND_COLOR = window.getComputedStyle(spinner.container).backgroundColor;
spinner.NUM_SPOKES = 6; // this should be an odd number if most of the spiral will be displayed at a time
spinner.D_THETA = Math.PI / spinner.NUM_SPOKES;

// We keep the normalized center coordinates the same no matter the viewport size.
// i.e., a value of 0.5 will always place the center in the middle of the screen, even
// as it is resized.
spinner.CENTER_X_NORM = Math.random();
spinner.CENTER_Y_NORM = Math.random();
spinner.RADIUS_NORM = Math.random();

spinner.COLOR_VELOCITY = 0.5; // how many degrees to increase the hue by every call
spinner.ANGULAR_VELOCITY = 0.005; // what angle the whole thing rotates by every call
spinner.DRAWING_SPEED = 5; // how much to add to the length each time drawLoader is called, in pixels

spinner.drawStart = 0;
spinner.startTheta = 0;

spinner.init = function () {
	spinner.canvas.width = window.innerWidth;
	spinner.canvas.height = window.innerHeight;
	spinner.ctx.fillStyle = spinner.BACKGROUND_COLOR;
	spinner.ctx.lineWidth = 4;

	var widthHeightMin = 0.8 * Math.min(spinner.canvas.width / 2, spinner.canvas.height / 2);
	spinner.RADIUS = spinner.map(spinner.RADIUS_NORM, 0, 1, widthHeightMin / 5, widthHeightMin);
	spinner.DRAWING_SPEED = spinner.RADIUS / 50;
	spinner.WEDGE_DISTANCE = spinner.RADIUS * (2 + spinner.D_THETA); // curve length of one wedge
	spinner.DRAWING_LENGTH = 4 * spinner.WEDGE_DISTANCE; // how much of the spiral to display at a time

	spinner.centerX = spinner.map(
		spinner.CENTER_X_NORM,
		0, 1,
		spinner.RADIUS,
		spinner.canvas.width - spinner.RADIUS
	);
	spinner.centerY = spinner.map(
		spinner.CENTER_Y_NORM,
		0, 1,
		spinner.RADIUS,
		spinner.canvas.height - spinner.RADIUS
	);
};
spinner.init();

spinner.drawLoader = function () {
	spinner.ctx.strokeStyle = 'hsl(' +
		Math.floor(spinner.color.hue) + 'deg, ' +
		spinner.color.sat + '%, ' +
		spinner.color.lum + '%)';
	spinner.color.hue = (spinner.color.hue + spinner.COLOR_VELOCITY) % 360;
	
	spinner.drawStart += spinner.DRAWING_SPEED;
	spinner.startTheta += spinner.ANGULAR_VELOCITY;
	var skipWedges = Math.floor(spinner.drawStart / spinner.WEDGE_DISTANCE);
	var theta = spinner.startTheta + skipWedges * Math.PI * (1 - 1/spinner.NUM_SPOKES);
	
	var skipLength = spinner.drawStart % spinner.WEDGE_DISTANCE; // how much to skip before starting drawing the first wedge
	
	spinner.ctx.fillRect(0, 0, spinner.canvas.width, spinner.canvas.height);
	
	spinner.ctx.beginPath();
	spinner.ctx.moveTo(spinner.centerX, spinner.centerY);
	
	var drawingRemaining = spinner.DRAWING_LENGTH;
	
	while (drawingRemaining > 0) {
		
		if (skipLength <= spinner.RADIUS){
			var line1Length = Math.min(skipLength + drawingRemaining, spinner.RADIUS);
			drawingRemaining -= line1Length - skipLength;

			spinner.ctx.moveTo(spinner.centerX + Math.cos(theta) * skipLength,
							   spinner.centerY + Math.sin(theta) * skipLength);
			spinner.ctx.lineTo(spinner.centerX + Math.cos(theta) * line1Length,
							   spinner.centerY + Math.sin(theta) * line1Length);
		}
		skipLength -= Math.min(skipLength, spinner.RADIUS);
		
		if (drawingRemaining > 0) {
			var phi = spinner.D_THETA; // phi is the angle swept through by this wedge
			if (skipLength <= spinner.RADIUS * spinner.D_THETA) {
				phi = Math.min(drawingRemaining / spinner.RADIUS, spinner.D_THETA);
				var thetaStart = theta - skipLength / spinner.RADIUS;
				drawingRemaining -= phi * spinner.RADIUS - skipLength;
				
				spinner.ctx.moveTo(spinner.centerX + Math.cos(thetaStart) * spinner.RADIUS,
								   spinner.centerY + Math.sin(thetaStart) * spinner.RADIUS);
				spinner.ctx.arc(spinner.centerX, spinner.centerY, spinner.RADIUS, thetaStart, theta - phi, true);
				
			}
			
			theta = theta - phi;
			skipLength -= Math.min(skipLength, spinner.RADIUS * spinner.D_THETA);
			
			
			if (drawingRemaining > 0) {
				var line2Start = spinner.RADIUS - skipLength;
				var line2End = Math.max(line2Start - drawingRemaining, 0);
				drawingRemaining -= line2Start - line2End;
				
				spinner.ctx.moveTo(spinner.centerX + Math.cos(theta) * line2Start,
						           spinner.centerY + Math.sin(theta) * line2Start);
				spinner.ctx.lineTo(spinner.centerX + Math.cos(theta) * line2End,
						           spinner.centerY + Math.sin(theta) * line2End);
				
				skipLength = 0;
			}
		}
		
		if (Math.abs(phi - spinner.D_THETA) < Number.EPSILON) {
			// like phi === D_THETA, but avoids problems with floating-point addition
			theta = (theta + Math.PI) % (2 * Math.PI);
		}
	}
	spinner.ctx.stroke();
	
	spinner.raf = window.requestAnimationFrame(spinner.drawLoader);
}

spinner.raf = window.requestAnimationFrame(spinner.drawLoader);

window.addEventListener('resize', function() {
	window.cancelAnimationFrame(spinner.raf);
	
	spinner.init();
	
	spinner.raf = window.requestAnimationFrame(spinner.drawLoader);
});
