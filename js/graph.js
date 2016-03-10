"use strict";
var camera, controls, scene, renderer;
var size = 28;
var graphArray = [];

init();

function init()
{
	if(!Detector.webgl)  //No WebGL D:
	{
		Detector.addGetWebGLMessage();
		return;
	}

	var formID = document.getElementById("form");
	var wipID = document.getElementById("wip");
	var formHeight = formID.clientHeight + parseInt(window.getComputedStyle(formID).marginTop);  //Bottom is already covered by wip's top margin
	var wipHeight = wipID.clientHeight + parseInt(window.getComputedStyle(wipID).marginTop) + parseInt(window.getComputedStyle(wipID).marginBottom);
	var totalHeight = formHeight + wipHeight;

	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(45, window.innerWidth / (window.innerHeight - totalHeight), 1, 1000);
	camera.position.z = 75;

	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight - totalHeight);
	document.body.appendChild(renderer.domElement);

	controls = new THREE.TrackballControls(camera, renderer.domElement);
	controls.addEventListener("change", render);

	addAxis();
	addLights();
	animate();
	render();
}

function getPoints(equation)
{
	var points = [];
	var compiledEquation = math.compile(equation);
	for(var x = -size; x <= size + 1; x += 0.01)  //Add 1 to the ending size because of the origin
	{
		points.push(compiledEquation.eval({x}));
	}
	return points;
}

function getIntersections(points1, points2, bound1, bound2)
{
	var intersections = [];
	var larger;

	for(var x = math.round(100 * (size + bound1)); x <= 100 * (size + bound2); x++)
	{
		if(points1[x] > points2[x])
		{
			if(larger === false)
			{
				intersections.push(x / 100 - size);  //Convert back into actual x coordinates
			}
			larger = true;
		}
		else if(points1[x] < points2[x])
		{
			if(larger === true)
			{
				intersections.push(x / 100 - size);  //Convert back into actual x coordinates
			}
			larger = false;
		}
		else  //Obviously intersecting when the two functions are equal
		{
			intersections.push(x / 100 - size);  //Convert back into actual x coordinates
			larger = undefined;
		}
	}
	return intersections;
}

function Graph(given, bound1, bound2, axisOfRotation, points, quality, graphID)
{
	this.given = given;
	this.group = new THREE.Object3D();
	this.bound1 = bound1;
	this.bound2 = bound2;
	this.axisOfRotation = axisOfRotation;
	this.points = points;
	this.quality = quality;
	this.graphID = graphID;
}

Graph.prototype.getY = function(x)
{
	return this.points[Math.round(100 * (size + x))];  //getPoints iterates by 0.01 starting from 0, not -28, so multiply the converted x coord by 100 to get actual indices
};

Graph.prototype.getMax = function()
{
	return math.max(...this.points.slice(100 * (size + this.bound1), 100 * (size + this.bound2) + 1));  //Add 1 to the ending index because splice is exclusive
};

Graph.prototype.getMin = function()
{
	return math.min(...this.points.slice(100 * (size + this.bound1), 100 * (size + this.bound2) + 1));  //Add 1 to the ending index because splice is exclusive
};

Graph.prototype.draw = function()
{
	var x = -size;
	var vector = [];
	var counter = x;  //I'll change this later, just using a counter variable for now
	var step = 0.01;
	var i;
	for(i = -size; i <= size; i += step)
	{
		vector[counter + size] = new THREE.Vector3(x.toFixed(2), this.points[counter + size], 0.05);
		x += step;
		counter++;
	}

	var geometry = new THREE.Geometry();
	var spline = new THREE.CatmullRomCurve3(vector);
	var splinePoints = spline.getPoints(vector.length - 1);
	for(i = 0; i < splinePoints.length; i++)
	{
		if(Math.abs(spline.points[i].y) <= size)
		{
			geometry.vertices.push(spline.points[i]);
		}
	}

	var graph = new THREE.Line(geometry, new THREE.LineBasicMaterial());
	graph.name = "graph";
	scene.add(graph);
	render();
};

Graph.prototype.drawShape = function()
{
	this.group.name = "solid";
	var boundY1 = this.getY(this.bound1);
	var boundY2 = this.getY(this.bound2);

	if(this.bound1 === this.bound2)
	{
		sweetAlert("Oh noes!", "We're still working on creating the solid when the bounds are equal.\nSorry about that :(", "warning");
		clearGraph();
		return;
	}

	if(this.bound1 > this.bound2)  //Switch the bounds around so that the for loop works
	{
		var temp = this.bound2;  //TODO: Use ES6 destructuring here when it becomes widely available among modern browsers
		this.bound2 = this.bound1;
		this.bound1 = temp;

		temp = boundY2;
		boundY2 = boundY1;
		boundY1 = temp;
	}

	var intersections = getIntersections(this.points, graphArray[1] ? graphArray[1].points : Array(100 * size * 2 + 1).fill(this.axisOfRotation), this.bound1, this.bound2);
	for(var i = 0; i < intersections.length; i++)
	{
		if(this.bound1 < intersections[i] && this.bound2 > intersections[i])
		{
			sweetAlert("Invalid bounds", "An intersection point was detected at approximately " + math.round(intersections[i], 2) + " which cannot be between the bounds", "warning");
			clearGraph();
			return;
		}
	}

	if(graphArray[1] === undefined || Number(graphArray[1].given) === this.axisOfRotation)  //FIXME: This doesn't catch constants
	{
		console.log("No second function or second function is equal to the axis of rotation");
		this.addSolidWithoutHoles("Math.abs(this.getY(i))", "Math.abs(this.getY(i+step))");
	}
	else
	{
		var graph1ComparingPoint1 = graphArray[0].getY(this.bound1 + 0.5);
		var graph2ComparingPoint1 = graphArray[1].getY(this.bound1 + 0.5);
		var graph1ComparingPoint2 = graphArray[0].getY(this.bound2 - 0.5);
		var graph2ComparingPoint2 = graphArray[1].getY(this.bound2 - 0.5);

		console.log("Maximums: " + this.getMax() + " and " + graphArray[1].getMax());
		console.log("Minimums: " + this.getMin() + " and " + graphArray[1].getMin());
		//I know this is a lot of if statements, I did it to ensure there wouldn't be any bugs. There are probably ways you can have an abridged version, but this will do for now.
		if(boundY1 !== boundY2)
		{
			console.log("\tboundY1 and boundY2 are not equal");
			if(this.axisOfRotation >= this.getMax() && this.axisOfRotation >= graphArray[1].getMax())
			{
				console.log("\t\tAxis of rotation is greater than or equal to the max of the graph");
				if(graph2ComparingPoint1 > graph1ComparingPoint1 && graph2ComparingPoint2 > graph1ComparingPoint2)
				{
					console.log("\t\t\tGraph2 is higher than graph1");
					this.addBSP("this.axisOfRotation-graphArray[1].getY(i)", "this.axisOfRotation-graphArray[1].getY(i+step)", "this.axisOfRotation-this.getY(i)", "this.axisOfRotation-this.getY(i+step)");
				}
				else
				{
					console.log("\t\t\tGraph2 is lower than or equal to graph1");
					this.addBSP("this.axisOfRotation-this.getY(i)", "this.axisOfRotation-this.getY(i+step)", "this.axisOfRotation-graphArray[1].getY(i)", "this.axisOfRotation-graphArray[1].getY(i+step)");
				}
			}
			else if(this.axisOfRotation <= this.getMin() && this.axisOfRotation <= graphArray[1].getMin())
			{
				console.log("\t\tAxis of rotation is less than or equal to the minimum of the graph");
				if(graph2ComparingPoint1 > graph1ComparingPoint1 && graph2ComparingPoint2 > graph1ComparingPoint2)
				{
					console.log("\t\t\tGraph2 is higher than graph1");
					this.addBSP("Math.abs(this.axisOfRotation-this.getY(i))", "Math.abs(this.axisOfRotation-this.getY(i+step))", "Math.abs(this.axisOfRotation-graphArray[1].getY(i))", "Math.abs(this.axisOfRotation-graphArray[1].getY(i+step))");
				}
				else
				{
					console.log("\t\t\tGraph2 is lower than or equal to graph1");
					this.addBSP("Math.abs(this.axisOfRotation-graphArray[1].getY(i))", "Math.abs(this.axisOfRotation-graphArray[1].getY(i+step))", "Math.abs(this.axisOfRotation-this.getY(i))", "Math.abs(this.axisOfRotation-this.getY(i+step))");
				}
			}
			else
			{
				sweetAlert("Oh noes!", "Axis of rotation cannot be between the functions", "warning");
				clearGraph();
				return;
			}
		}
		else if(boundY1 === boundY2)
		{
			//Not complete yet (this is just for cylinders)
			console.log("\t\tBoundY1 is equal to boundY2 and bound1 does not equal bound2");
			if(this.axisOfRotation > boundY1)
			{
				console.log("\t\t\tAxis of rotation is greater than boundY1");
				this.addBSP("Math.abs(this.axisOfRotation-this.getY(i))", "Math.abs(this.axisOfRotation-this.getY(i+step))", "Math.abs(this.axisOfRotation)", "Math.abs(this.axisOfRotation)");
			}
			else if(this.axisOfRotation < boundY1)
			{
				console.log("\t\t\tAxis of rotation is less than boundY1");
				this.addBSP("Math.abs(this.axisOfRotation)", "Math.abs(this.axisOfRotation)", "Math.abs(this.axisOfRotation)+this.getY(i)", "Math.abs(this.axisOfRotation)+this.getY(i+step)");
			}
			else if(this.axisOfRotation === boundY1)
			{
				console.log("\t\t\tAxis of rotation is equal to boundY1");
				this.addSolidWithoutHoles("Math.abs(this.getY(i))", "Math.abs(this.getY(i+step))");
			}
		}
	}
	scene.add(this.group);
	render();
};

Graph.prototype.addBSP = function(smallGeoR1, smallGeoR2, bigGeoR1, bigGeoR2)
{
	var step = this.quality;
	for(var i = this.bound1; i < this.bound2; i += step)
	{
		if(this.getY(i) <= size)
		{
			if(!eval(smallGeoR1) || !eval(smallGeoR2))  //Hacky bugfix woo
			{
				smallGeoR1 += "+0.01";
				smallGeoR2 += "+0.01";
			}

			if(i + step > this.bound2)  //Prevent the solid from extending beyond the second bound if it can't be divided by the quality
			{
				step = this.bound2 - i;
			}

			var smallCylinderGeom = new THREE.CylinderGeometry(eval(smallGeoR1), eval(smallGeoR2), step, 50);
			smallCylinderGeom.rotateZ(Math.PI / 2).translate(i + step / 2, this.axisOfRotation, 0);
			var largeCylinderGeom = new THREE.CylinderGeometry(eval(bigGeoR1), eval(bigGeoR2), step, 360);
			largeCylinderGeom.rotateZ(Math.PI / 2).translate(i + step / 2, this.axisOfRotation, 0);
			var smallCylinderBSP = new ThreeBSP(smallCylinderGeom);
			var largeCylinderBSP = new ThreeBSP(largeCylinderGeom);
			smallCylinderGeom.dispose();
			largeCylinderGeom.dispose();
			var intersectionBSP = largeCylinderBSP.subtract(smallCylinderBSP);
			var hollowCylinder = intersectionBSP.toMesh(new THREE.MeshPhongMaterial({color: 0xFFFF00/*, transparent: true, opacity: 0.5*/}));
			this.group.add(hollowCylinder);
		}
	}
};

Graph.prototype.addSolidWithoutHoles = function(leftRadius, rightRadius)
{
	var step = this.quality;
	for(var i = this.bound1; i < this.bound2; i += step)
	{
		if(this.getY(i) <= size)
		{
			if(i + step > this.bound2)  //Prevent the solid from extending beyond the second bound if it can't be divided by the quality
			{
				step = this.bound2 - i;
			}

			var geometry = new THREE.CylinderGeometry(eval(leftRadius), eval(rightRadius), step, 100);
			geometry.rotateZ(Math.PI / 2).translate(i + step / 2, this.axisOfRotation, 0);
			var plane = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color: 0xFFFF00/*, transparent: true, opacity: 0.5*/}));
			geometry.dispose();
			this.group.add(plane);
		}
	}
};

function clearGraph()
{
	for(var i = 0; i < scene.children.length; i++)
	{
		if(scene.children[i] !== undefined)
		{
			if(scene.children[i].name === "graph" || scene.children[i].name === "solid")
			{
				scene.remove(scene.children[i]);
				i--;
			}
		}
	}
	render();
}

function submit() // eslint-disable-line
{
	clearGraph();

	var function1 = document.getElementById("function1").value;
	var function2 = document.getElementById("function2").value;
	var quality = Number(document.getElementById("quality").value);
	var drawSolid = true;

	var bound1, bound2, axisOfRotation;  //Prevents users from passing in undefined variables (eg 'x')
	try
	{
		bound1 = math.eval(document.getElementById("bound1").value);
		bound2 = math.eval(document.getElementById("bound2").value);
		axisOfRotation = math.eval(document.getElementById("rotation").value);
	}
	catch(error)
	{
		const type = isNaN(bound1) ? "first bound" : isNaN(bound2) ? "second bound" : "axis of rotation";
		sweetAlert("Invalid " + type, "Please enter a valid number for the " + type, "warning");
		drawSolid = false;
	}

	if(bound1 === undefined && bound2 === undefined && axisOfRotation === undefined)  //Only create the solid if we have both of the bounds and the axis of rotation
	{
		drawSolid = false;
	}
	else if(bound1 === undefined || bound2 === undefined || axisOfRotation === undefined)
	{
		const type = bound1 === undefined ? "first bound" : bound2 === undefined ? "second bound" : "axis of rotation";
		sweetAlert("Missing " + type, "Please specify the " + type, "warning");
		drawSolid = false;
	}
	else if(bound1 > size || bound1 < -size || bound2 > size || bound2 < -size)
	{
		sweetAlert("Invalid bounds", "Please make sure all bounds are within " + -size + " to " + size + ", inclusive", "warning");
		drawSolid = false;
	}
	else if(axisOfRotation > size || axisOfRotation < -size)
	{
		sweetAlert("Invalid axis of rotation", "Please make sure the axis of rotation is within " + -size + " to " + size + ", inclusive", "warning");
		drawSolid = false;
	}

	var points = getPoints(function1);

	var graph1 = new Graph(function1, bound1, bound2, axisOfRotation, points, quality, 0);
	graphArray[graph1.graphID] = graph1;
	graph1.draw();

	if(function2 !== "")  //We obviously don't want to graph an empty function
	{
		points = getPoints(function2);

		var graph2 = new Graph(function2, bound1, bound2, axisOfRotation, points, quality, 1);
		graphArray[graph2.graphID] = graph2;
		graph2.draw();
	}

	if(drawSolid)  //Only create the solid if we have both of the bounds and the axis of rotation
	{
		graph1.drawShape();
	}
}

function animate()
{
	window.requestAnimationFrame(animate);
	controls.update();
}

function render()
{
	renderer.render(scene, camera);
}

function addLights()
{
	var pointLight = new THREE.PointLight(0xFFFF00, 1, 5000);
	pointLight.position.set(0, 100, 90);
	scene.add(pointLight);
	scene.add(new THREE.HemisphereLight(0x3284FF, 0xFFC87F, 0.6));
}

function addAxis()
{
	var lines = new THREE.Geometry();
	var axes = new THREE.Geometry();
	for(var i = -size; i <= size; i++)
	{
		if(i)
		{
			lines.vertices.push(new THREE.Vector3(-size, i, 0),
			                    new THREE.Vector3(size, i, 0),
			                    new THREE.Vector3(i, -size, 0),
			                    new THREE.Vector3(i, size, 0));
		}
		else
		{
			axes.vertices.push(new THREE.Vector3(-size, i, 0),
			                   new THREE.Vector3(size, i, 0),
			                   new THREE.Vector3(i, -size, 0),
			                   new THREE.Vector3(i, size, 0));
		}
	}

	scene.add(new THREE.LineSegments(lines, new THREE.LineBasicMaterial({color: "green"})),
	          new THREE.LineSegments(axes, new THREE.LineBasicMaterial({color: "red"})));
}

function reset()  //eslint-disable-line
{
	clearGraph();
	controls.reset();

	document.getElementById("function1").value = "";
	document.getElementById("function2").value = "";
	document.getElementById("bound1").value = "";
	document.getElementById("bound2").value = "";
	document.getElementById("rotation").value = "";
	document.getElementById("quality").value = "0.5";
}

window.onresize = function()
{
	var formID = document.getElementById("form");
	var wipID = document.getElementById("wip");
	var formHeight = formID.clientHeight + parseInt(window.getComputedStyle(formID).marginTop);  //Bottom is already covered by wip's top margin
	var wipHeight = wipID.clientHeight + parseInt(window.getComputedStyle(wipID).marginTop) + parseInt(window.getComputedStyle(wipID).marginBottom);
	var totalHeight = formHeight + wipHeight;

	camera.aspect = window.innerWidth / (window.innerHeight - totalHeight);
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight - totalHeight);
	render();
};
