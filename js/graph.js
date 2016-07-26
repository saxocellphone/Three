"use strict";
let camera, controls, scene, renderer;
let bound1, bound2, rotationAxis;
const size = 28;

const EquationType = {
	EQUATION_NONE: 0,
	EQUATION_X: 1,
	EQUATION_Y: 2,
	EQUATION_INVALID: 3
};

class Equation
{
	constructor(equation, type)
	{
		this.equation = equation;
		this.type = type;
		this.points = this.getPoints();
	}

	getPoints()
	{
		let points = [];
		const compiledEquation = math.compile(this.equation);
		if(this.type === EquationType.EQUATION_Y)
		{
			for(let x = -size; x <= size + 1; x += 0.01) // Add 1 to the ending size because of the origin
			{
				points.push(compiledEquation.eval({x}));
			}
		}
		else if(this.type === EquationType.EQUATION_X)
		{
			for(let y = -size; y <= size + 1; y += 0.01)
			{
				points.push(compiledEquation.eval({y})); // Add 1 to the ending size because of the origin
			}
		}
		else
		{
			for(let x = -size; x <= size + 1; x += 0.01) // Add 1 to the ending size because of the origin
			{
				points.push(undefined);
			}
		}
		return points;
	}

	getCoord(point)
	{
		//getPoints iterates by 0.01 starting from 0, not -28, so multiply the converted coord by 100 to get actual indices
		return this.points[Math.round(100 * (size + point))];
	}

	getMax()
	{
		//Add 1 to the ending index because splice is exclusive
		return math.max(...this.points.slice(100 * (size + bound1), 100 * (size + bound2) + 1));
	}

	getMin()
	{
		//Add 1 to the ending index because splice is exclusive
		return math.min(...this.points.slice(100 * (size + bound1), 100 * (size + bound2) + 1));
	}

	getIntersections(otherEquation)
	{
		if(this.points.every((element) => element === undefined))
		{
			this.points.fill(rotationAxis);
		}
		else if(otherEquation.points.every((element) => element === undefined))
		{
			otherEquation.points.fill(rotationAxis);
		}

		let intersections = [];
		let larger;

		for(let x = math.round(100 * (size + bound1)); x < 100 * (size + bound2); x++)
		{
			if(this.points[x] > otherEquation.points[x])
			{
				if(larger === false)
				{
					intersections.push(x / 100 - size);  //Convert back into actual x coordinates
				}
				larger = true;
			}
			else if(this.points[x] < otherEquation.points[x])
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
		return [intersections, larger];
	}

	getType()
	{
		return this.type;
	}
}

class Graph
{
	constructor(equation1, equation2, quality, type)
	{
		this.group = new THREE.Object3D();
		this.equation1 = equation1;
		this.equation2 = equation2;
		this.quality = quality;
		this.type = type;
	}

	draw(equation)
	{
		if(equation.points.every((element) => element === undefined))
		{
			return;
		}

		let x = -size;
		let vector = [];
		let counter = x;  //I'll change this later, just using a counter variable for now
		const step = 0.01;
		for(let i = -size; i <= size; i += step)
		{
			if(this.type === EquationType.EQUATION_Y)
			{
				vector[counter + size] = new THREE.Vector3(x.toFixed(2), equation.points[counter + size], 0.05);
			}
			else if(this.type === EquationType.EQUATION_X)
			{
				vector[counter + size] = new THREE.Vector3(equation.points[counter + size], x.toFixed(2), 0.05);
			}
			x += step;
			counter++;
		}

		const geometry = new THREE.Geometry();
		const spline = new THREE.CatmullRomCurve3(vector);
		const splinePoints = spline.getPoints(vector.length - 1);
		for(let i = 0; i < splinePoints.length; i++)
		{
			if(this.type === EquationType.EQUATION_Y)
			{
				if(math.abs(spline.points[i].y) <= size)
				{
					geometry.vertices.push(spline.points[i]);
				}
			}
			else if(this.type === EquationType.EQUATION_X)
			{
				if(math.abs(spline.points[i].x) <= size)
				{
					geometry.vertices.push(spline.points[i]);
				}
			}
		}

		const line = new THREE.Line(geometry, new THREE.LineBasicMaterial());
		line.name = "line";
		scene.add(line);
		Graph.render();
	}

	drawSupplementaryLine(value, options, invert = false) // Draw the bounds and axis of rotation
	{
		let x = -size;
		const geometry = new THREE.Geometry();
		const step = 0.01;
		for(let i = -size; i <= size; i += step)
		{
			if(this.type === EquationType.EQUATION_Y)
			{
				if(invert)
				{
					geometry.vertices.push(new THREE.Vector3(x, value, 0.05));
				}
				else
				{
					geometry.vertices.push(new THREE.Vector3(value, x, 0.05));
				}
			}
			else if(this.type === EquationType.EQUATION_X)
			{
				if(invert)
				{
					geometry.vertices.push(new THREE.Vector3(value, x, 0.05));
				}
				else
				{
					geometry.vertices.push(new THREE.Vector3(x, value, 0.05));
				}
			}
			x += step;
		}

		geometry.computeLineDistances();

		const line = new THREE.Line(geometry, new THREE.LineDashedMaterial(options));
		line.name = "line";
		scene.add(line);
		Graph.render();
	}

	drawShape()
	{
		this.group.name = "solid";

		let boundY1 = this.equation1.getCoord(bound1);
		let boundY2 = this.equation2.getCoord(bound2);

		if(bound1 === bound2)
		{
			sweetAlert("Oh noes!", "We're still working on creating the solid when the bounds are equal.\nSorry about that :(", "warning");
			Graph.clear();
			return;
		}

		if(bound1 > bound2)  //Switch the bounds around so that the for loop works
		{
			[bound1, bound2] = [bound2, bound1];
			[boundY1, boundY2] = [boundY2, boundY1];
		}

		const [intersections, larger] = this.equation1.getIntersections(this.equation2);

		if(intersections[0] !== undefined)
		{
			sweetAlert("Invalid bounds", "An intersection point was detected at approximately " + math.round(intersections[0], 2) + " which cannot be between the bounds", "warning");
			this.drawSupplementaryLine(intersections[0], {color: "red", dashSize: 1, gapSize: 1});
			return;
		}

		//Switch the functions around so that the larger one is always first for consistency
		if(!larger && this.equation2 !== undefined && Number(this.equation2.equation) !== rotationAxis)
		{
			[this.equation1.equation, this.equation2.equation] = [this.equation2.equation, this.equation1.equation];
			[this.equation1.points, this.equation2.points] = [this.equation2.points, this.equation1.points];
		}

		if(this.equation2 === undefined || Number(this.equation2.equation) === rotationAxis)  //FIXME: This doesn't catch constants
		{
			console.log("No second function or second function is equal to the axis of rotation");
			this.addSolidWithoutHoles("Math.abs(this.equation1.getCoord(i))", "Math.abs(this.equation1.getCoord(i+step))");
		}
		else
		{
			console.log("Maximums: " + this.equation1.getMax() + " and " + this.equation2.getMax());
			console.log("Minimums: " + this.equation1.getMin() + " and " + this.equation2.getMin());
			if(boundY1 !== boundY2)
			{
				console.log("\tboundY1 and boundY2 are not equal");
				if(rotationAxis >= this.equation1.getMax() && rotationAxis >= this.equation2.getMax()
				|| rotationAxis <= this.equation1.getMin() && rotationAxis <= this.equation2.getMin())
				{
					this.addBSP("Math.abs(rotationAxis-this.equation2.getCoord(i))",
					            "Math.abs(rotationAxis-this.equation2.getCoord(i+step))",
					            "Math.abs(rotationAxis-this.equation1.getCoord(i))",
					            "Math.abs(rotationAxis-this.equation1.getCoord(i+step))");
				}
				else
				{
					sweetAlert("Oh noes!", "Axis of rotation cannot be between the functions", "warning");
					Graph.clear();
					return;
				}
			}
			else if(boundY1 === boundY2)
			{
				//Not complete yet (this is just for cylinders)
				console.log("\t\tBoundY1 is equal to boundY2 and bound1 does not equal bound2");
				if(rotationAxis > boundY1)
				{
					console.log("\t\t\tAxis of rotation is greater than boundY1");
					this.addBSP("Math.abs(rotationAxis-this.equation1.getCoord(i))", "Math.abs(rotationAxis-this.equation1.getCoord(i+step))", "Math.abs(rotationAxis)", "Math.abs(rotationAxis)");
				}
				else if(rotationAxis < boundY1)
				{
					console.log("\t\t\tAxis of rotation is less than boundY1");
					this.addBSP("Math.abs(rotationAxis)", "Math.abs(rotationAxis)", "Math.abs(rotationAxis)+this.equation1.getCoord(i)", "Math.abs(rotationAxis)+this.equation1.getCoord(i+step)");
				}
				else if(rotationAxis === boundY1)
				{
					console.log("\t\t\tAxis of rotation is equal to boundY1");
					this.addSolidWithoutHoles("Math.abs(this.equation1.getCoord(i))", "Math.abs(this.equation1.getCoord(i+step))");
				}
			}
		}
		scene.add(this.group);
		Graph.render();
	}

	addBSP(smallGeoR1, smallGeoR2, bigGeoR1, bigGeoR2)
	{
		let step = this.quality;
		for(let i = bound1; i < bound2; i += step)
		{
			if(this.equation1.getCoord(i) <= size)
			{
				if(!eval(smallGeoR1) || !eval(smallGeoR2))  //Hacky bugfix woo
				{
					smallGeoR1 += "+0.01";
					smallGeoR2 += "+0.01";
				}

				if(i + step > bound2)  //Prevent the solid from extending beyond the second bound if it can't be divided by the quality
				{
					step = bound2 - i;
				}

				const smallCylinderGeom = new THREE.CylinderGeometry(eval(smallGeoR1), eval(smallGeoR2), step, 50);
				if(this.type === EquationType.EQUATION_Y)
				{
					smallCylinderGeom.rotateZ(Math.PI / 2).translate(i + step / 2, rotationAxis, 0);
				}
				else if(this.type === EquationType.EQUATION_X)
				{
					smallCylinderGeom.rotateZ(Math.PI).translate(rotationAxis, i + step / 2, 0);
				}

				const largeCylinderGeom = new THREE.CylinderGeometry(eval(bigGeoR1), eval(bigGeoR2), step, 360);
				if(this.type === EquationType.EQUATION_Y)
				{
					largeCylinderGeom.rotateZ(Math.PI / 2).translate(i + step / 2, rotationAxis, 0);
				}
				else if(this.type === EquationType.EQUATION_X)
				{
					largeCylinderGeom.rotateZ(Math.PI).translate(rotationAxis, i + step / 2, 0);
				}

				const smallCylinderBSP = new ThreeBSP(smallCylinderGeom);
				const largeCylinderBSP = new ThreeBSP(largeCylinderGeom);
				smallCylinderGeom.dispose();
				largeCylinderGeom.dispose();
				const intersectionBSP = largeCylinderBSP.subtract(smallCylinderBSP);
				const hollowCylinder = intersectionBSP.toMesh(new THREE.MeshPhongMaterial({color: 0xFFFF00/*, transparent: true, opacity: 0.5*/}));
				this.group.add(hollowCylinder);
			}
		}
	}

	addSolidWithoutHoles(leftRadius, rightRadius)
	{
		let step = this.quality;
		for(let i = bound1; i < bound2; i += step)
		{
			if(this.equation1.getCoord(i) <= size)
			{
				if(i + step > bound2)  //Prevent the solid from extending beyond the second bound if it can't be divided by the quality
				{
					step = bound2 - i;
				}

				const geometry = new THREE.CylinderGeometry(eval(leftRadius), eval(rightRadius), step, 100);
				if(this.type === EquationType.EQUATION_Y)
				{
					geometry.rotateZ(Math.PI / 2).translate(i + step / 2, rotationAxis, 0);
				}
				else if(this.type === EquationType.EQUATION_X)
				{
					geometry.rotateZ(Math.PI).translate(rotationAxis, i + step / 2, 0);
				}
				const plane = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color: 0xFFFF00/*, transparent: true, opacity: 0.5*/}));
				geometry.dispose();
				this.group.add(plane);
			}
		}
	}

	static clear()
	{
		for(let i = 0; i < scene.children.length; i++)
		{
			if(scene.children[i] !== undefined)
			{
				if(scene.children[i].name === "line" || scene.children[i].name === "solid")
				{
					scene.remove(scene.children[i]);
					i--;
				}
			}
		}
		Graph.render();
	}

	static animate()
	{
		window.requestAnimationFrame(Graph.animate);
		controls.update();
	}

	static render()
	{
		renderer.render(scene, camera);
	}

	static addLights()
	{
		const pointLight = new THREE.PointLight(0xFFFF00, 1, 5000);
		pointLight.position.set(0, 100, 90);
		scene.add(pointLight);
		scene.add(new THREE.HemisphereLight(0x3284FF, 0xFFC87F, 0.6));
	}

	static addAxis()
	{
		const lines = new THREE.Geometry();
		const axes = new THREE.Geometry();
		for(let i = -size; i <= size; i++)
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
}

init();

function init()
{
	if(!Detector.webgl)  //No WebGL D:
	{
		Detector.addGetWebGLMessage();
		return;
	}

	const formID = document.getElementById("form");
	const wipID = document.getElementById("wip");
	const formHeight = formID.clientHeight + parseInt(window.getComputedStyle(formID).marginTop);  //Bottom is already covered by wip's top margin
	const wipHeight = wipID.clientHeight + parseInt(window.getComputedStyle(wipID).marginTop) + parseInt(window.getComputedStyle(wipID).marginBottom);
	const totalHeight = formHeight + wipHeight;

	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(45, window.innerWidth / (window.innerHeight - totalHeight), 1, 1000);
	camera.position.z = 75;

	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight - totalHeight);
	document.body.appendChild(renderer.domElement);

	controls = new THREE.TrackballControls(camera, renderer.domElement);
	controls.addEventListener("change", Graph.render);

	Graph.addAxis();
	Graph.addLights();
	Graph.animate();
	Graph.render();
}

function submit() // eslint-disable-line
{
	Graph.clear();

	let function1 = document.getElementById("function1").value;
	let function2 = document.getElementById("function2").value;
	const quality = Number(document.getElementById("quality").value);
	let drawSolid = true;

	let type1 = getEquationType(function1, "first function");
	let type2;
	if(type1 !== EquationType.EQUATION_INVALID)
	{
		type2 = getEquationType(function2, "second function");
		if(type2 === EquationType.EQUATION_INVALID)
		{
			return;
		}
	}
	else
	{
		return;
	}

	if(type1 === EquationType.EQUATION_NONE && type2 === EquationType.EQUATION_NONE)
	{
		return;
	}

	let type = type1 !== EquationType.EQUATION_NONE ? type1 : type2;
	if(type1 !== type2 && type1 !== EquationType.EQUATION_NONE && type2 !== EquationType.EQUATION_NONE)
	{
		sweetAlert("Invalid equation type", "The second function should be a function of " + (type === EquationType.EQUATION_X ? "x" : "y"), "error");
		return;
	}

	function1 = parseEquation(function1, "first function", type, false);
	const equation1 = new Equation(function1, type);

	function2 = parseEquation(function2, "second function", type, false);
	const equation2 = new Equation(function2, type);

	// We'll reassign these later to their actual values, but for now we just need to know if they're defined
	bound1 = document.getElementById("bound1").value.trim().length;
	bound2 = document.getElementById("bound2").value.trim().length;
	rotationAxis = document.getElementById("rotation").value.trim().length;

	// Only create the solid if we have both of the bounds and the axis of rotation
	if(!bound1 && !bound2 && !rotationAxis)
	{
		drawSolid = false;
	}
	else if(!bound1 || !bound2 || !rotationAxis)
	{
		const name = !bound1 ? "first bound" : !bound2 ? "second bound" : "axis of rotation";
		sweetAlert("Missing " + name, "Please specify the " + name, "warning");
		drawSolid = false;
	}
	else
	{
		// FIXME: I am NOT proud of this nested if chain AT ALL
		bound1 = parseEquation(document.getElementById("bound1").value, "first bound", type);
		if(bound1 === undefined)
		{
			drawSolid = false;
		}
		else
		{
			bound2 = parseEquation(document.getElementById("bound2").value, "second bound", type);
			if(bound2 === undefined)
			{
				drawSolid = false;
			}
			else
			{
				rotationAxis = parseEquation(document.getElementById("rotation").value, "axis of rotation", type);
				if(rotationAxis === undefined)
				{
					drawSolid = false;
				}
			}
		}
	}

	let graph = new Graph(equation1, equation2, quality, type);

	graph.draw(equation1);
	graph.draw(equation2);

	if(drawSolid)  //Only create the solid if we have both of the bounds and the axis of rotation
	{
		graph.drawSupplementaryLine(bound1, {color: 0xFFFF00, dashSize: 1, gapSize: 1});
		graph.drawSupplementaryLine(bound2, {color: 0xFFFF00, dashSize: 1, gapSize: 1});
		graph.drawSupplementaryLine(rotationAxis, {color: 0xFFFF00, dashSize: 1, gapSize: 1}, true);
		graph.drawShape();
	}
}

function getEquationType(equation, name)
{
	equation = equation.split(/=\s*/);
	if(equation.length === 2 && equation[0].trim() === "x")
	{
		return EquationType.EQUATION_X;
	}
	else if(equation.length === 1 && equation[0].trim() !== "" || equation[0].trim() === "y")
	{
		return EquationType.EQUATION_Y;
	}
	else if(equation.length > 2)
	{
		sweetAlert("Malformed equation", "The " + name + " cannot have more than one equals sign", "error");
		return EquationType.EQUATION_INVALID;
	}
	else if(equation[0].trim() !== "")
	{
		sweetAlert("Invalid equation type", "The " + name + " should be a function of x or y", "error");
		return EquationType.EQUATION_INVALID;
	}
	return EquationType.EQUATION_NONE;
}

function parseEquation(equation, name, equationType, constant = true)
{
	let type = getEquationType(equation, name);

	equation = equation.split(/=\s*/);
	if(type === EquationType.EQUATION_NONE || type === EquationType.EQUATION_INVALID)
	{
		if(constant)
		{
			return;
		}
		else
		{
			return equation.pop();
		}
	}

	if(constant)
	{
		if(type !== equationType && name.includes("rotation") || type === equationType && !name.includes("rotation"))
		{
			sweetAlert("Incorrect equation type", "The " + name + " should be a function of " + (type === EquationType.EQUATION_X ? "y" : "x"), "error");
			return;
		}

		try
		{
			let value = math.eval(equation.pop().toString());
			if(math.abs(value) > size)
			{
				sweetAlert("Invalid " + name, "The " + name + " must be within " + -size + " to " + size + ", inclusive", "warning");
				return;
			}
			return value;
		}
		catch(error)
		{
			sweetAlert("Invalid " + name, "Please enter a valid number for the " + name, "warning");
			return;
		}
	}
	else
	{
		return equation.pop();
	}
}

function reset()  //eslint-disable-line
{
	Graph.clear();
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
	const formID = document.getElementById("form");
	const wipID = document.getElementById("wip");
	const formHeight = formID.clientHeight + parseInt(window.getComputedStyle(formID).marginTop);  //Bottom is already covered by wip's top margin
	const wipHeight = wipID.clientHeight + parseInt(window.getComputedStyle(wipID).marginTop) + parseInt(window.getComputedStyle(wipID).marginBottom);
	const totalHeight = formHeight + wipHeight;

	camera.aspect = window.innerWidth / (window.innerHeight - totalHeight);
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight - totalHeight);
	Graph.render();
};
