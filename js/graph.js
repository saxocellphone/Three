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
	constructor(parser, type)
	{
		this.equation = parser ? parser.compile() : undefined;
		this.type = type;
		this.points = this.getPoints();

		this.constant = true;
		if(parser)
		{
			parser.traverse((node) =>
			{
				switch(node.type)
				{
					case "ConstantNode":
						break;
					case "SymbolNode":
						if(node.name in math)
						{
							break;
						}
						else
						{
							this.constant = false;
							return;
						}
					default:
						this.constant = false;
						return;
				}
			});
		}
	}

	getPoints()
	{
		let points = [];
		if(this.equation === undefined || this.type === EquationType.EQUATION_NONE)
		{
			for(let x = -size; x <= size + 1; x += 0.01) // Add 1 to the ending size because of the origin
			{
				points.push(undefined);
			}
		}
		else if(this.type === EquationType.EQUATION_Y)
		{
			for(let x = -size; x <= size + 1; x += 0.01) // Add 1 to the ending size because of the origin
			{
				points.push(this.equation.eval({x}));
			}
		}
		else if(this.type === EquationType.EQUATION_X)
		{
			for(let y = -size; y <= size + 1; y += 0.01) // Add 1 to the ending size because of the origin
			{
				points.push(this.equation.eval({y}));
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

	getIntersectionWith(otherEquation)
	{
		if(this.equation === undefined)
		{
			this.points.fill(rotationAxis);
		}
		else if(otherEquation.equation === undefined)
		{
			otherEquation.points.fill(rotationAxis);
		}

		let larger;
		for(let x = math.round(100 * (size + bound1)); x < 100 * (size + bound2); x++)
		{
			if(this.points[x] > otherEquation.points[x])
			{
				if(larger === false)
				{
					return x / 100 - size; // Convert back into actual x coordinates
				}
				larger = true;
			}
			else if(this.points[x] < otherEquation.points[x])
			{
				if(larger === true)
				{
					return x / 100 - size; // Convert back into actual x coordinates
				}
				larger = false;
			}
			else // Obviously intersecting when the two functions are equal
			{
				return x / 100 - size; // Convert back into actual x coordinates
			}
		}
		return undefined;
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
		if(equation.equation === undefined)
		{
			return;
		}

		let x = -size;
		let counter = x;  //I'll change this later, just using a counter variable for now
		const geometry = new THREE.Geometry();
		const step = 0.01;
		for(let i = -size; i <= size; i += step)
		{
			if(math.abs(equation.points[counter + size]) <= size)
			{
				if(this.type === EquationType.EQUATION_Y)
				{
					geometry.vertices.push(new THREE.Vector3(x.toFixed(2), equation.points[counter + size], 0.05));
				}
				else if(this.type === EquationType.EQUATION_X)
				{
					geometry.vertices.push(new THREE.Vector3(equation.points[counter + size], x.toFixed(2), 0.05));
				}
			}
			x += step;
			counter++;
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
		let boundY2 = this.equation1.getCoord(bound2);

		if(bound1 === bound2)
		{
			sweetAlert("Oh noes!", "We're still working on creating the solid when the bounds are equal.\nSorry about that :(", "warning");
			return;
		}

		if(bound1 > bound2)  //Switch the bounds around so that the for loop works
		{
			[bound1, bound2] = [bound2, bound1];
			[boundY1, boundY2] = [boundY2, boundY1];
		}

		const intersection = this.equation1.getIntersectionWith(this.equation2);

		if(intersection !== undefined)
		{
			sweetAlert("Invalid bounds", "An intersection point was detected at approximately " + math.round(intersection, 2) + " which cannot be between the bounds", "warning");
			this.drawSupplementaryLine(intersection, {color: "red", dashSize: 1, gapSize: 1});
			return;
		}

		if(this.getFartherEquation() === this.equation2) // We assume in addBSP() that equation1 is farther away from the rotation axis than equation2
		{
			[this.equation1, this.equation2] = [this.equation2, this.equation1];
		}

		if(this.equation1.equation === undefined || this.equation1.constant && this.equation1.equation.eval() === rotationAxis)
		{
			console.log("No first function or first function is equal to the axis of rotation");
			this.addSolidWithoutHoles("abs(y2)", "abs(y2step)");
		}
		else if(this.equation2.equation === undefined || this.equation2.constant && this.equation2.equation.eval() === rotationAxis)
		{
			console.log("No second function or second function is equal to the axis of rotation");
			this.addSolidWithoutHoles("abs(y1)", "abs(y1step)");
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
					this.addBSP("abs(axis - y2)", "abs(axis - y2step)", "abs(axis - y1)", "abs(axis - y1step)");
				}
				else
				{
					sweetAlert("Oh noes!", "Axis of rotation cannot be between the functions", "warning");
					this.drawSupplementaryLine(rotationAxis, {color: "red", dashSize: 1, gapSize: 1}, true);
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
					this.addBSP("abs(axis - y1)", "abs(axis - y1step)", "abs(axis)", "abs(axis)");
				}
				else if(rotationAxis < boundY1)
				{
					console.log("\t\t\tAxis of rotation is less than boundY1");
					this.addBSP("abs(axis)", "abs(axis)", "abs(axis) + y1", "abs(axis) + y1step");
				}
				else if(rotationAxis === boundY1)
				{
					console.log("\t\t\tAxis of rotation is equal to boundY1");
					this.addSolidWithoutHoles("abs(y1)", "abs(y1step)");
				}
			}
		}
		scene.add(this.group);
		Graph.render();
	}

	addBSP(smallGeoR1, smallGeoR2, bigGeoR1, bigGeoR2)
	{
		const smallGeoR1Equation = math.compile(smallGeoR1);
		const smallGeoR2Equation = math.compile(smallGeoR2);
		const bigGeoR1Equation = math.compile(bigGeoR1);
		const bigGeoR2Equation = math.compile(bigGeoR2);
		let step = this.quality;
		for(let i = bound1; i < bound2; i += step)
		{
			if(this.equation1.getCoord(i) <= size)
			{
				if(i + step > bound2)  //Prevent the solid from extending beyond the second bound if it can't be divided by the quality
				{
					step = bound2 - i;
				}

				const smallCylinderGeom = new THREE.CylinderGeometry(smallGeoR1Equation.eval({axis: axisOfRotation, y1: this.equation1.getY(i), y1step: this.equation1.getY(i + step), y2: this.equation2.getY(i), y2step: this.equation2.getY(i + step)}),
				                                                     smallGeoR2Equation.eval({axis: axisOfRotation, y1: this.equation1.getY(i), y1step: this.equation1.getY(i + step), y2: this.equation2.getY(i), y2step: this.equation2.getY(i + step)}),
				                                                     step, 50);
				if(this.type === EquationType.EQUATION_Y)
 				{
 					smallCylinderGeom.rotateZ(Math.PI / 2).translate(i + step / 2, rotationAxis, 0);
 				}
 				else if(this.type === EquationType.EQUATION_X)
 				{
 					smallCylinderGeom.rotateZ(Math.PI).translate(rotationAxis, i + step / 2, 0);
 				}

				const largeCylinderGeom = new THREE.CylinderGeometry(bigGeoR1Equation.eval({axis: axisOfRotation, y1: this.equation1.getY(i), y1step: this.equation1.getY(i + step), y2: this.equation2.getY(i), y2step: this.equation2.getY(i + step)}),
				                                                     bigGeoR2Equation.eval({axis: axisOfRotation, y1: this.equation1.getY(i), y1step: this.equation1.getY(i + step), y2: this.equation2.getY(i), y2step: this.equation2.getY(i + step)}),
				                                                     step, 360);
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
		const leftRadiusEquation = math.compile(leftRadius);
		const rightRadiusEquation = math.compile(rightRadius);
		let step = this.quality;
		for(let i = bound1; i < bound2; i += step)
		{
			if(this.equation1.getCoord(i) <= size)
			{
				if(i + step > bound2)  //Prevent the solid from extending beyond the second bound if it can't be divided by the quality
				{
					step = bound2 - i;
				}

				const geometry = new THREE.CylinderGeometry(leftRadiusEquation.eval({y1: this.equation1.getY(i), y1step: this.equation1.getY(i + step)}),
				                                            rightRadiusEquation.eval({y1: this.equation1.getY(i), y1step: this.equation1.getY(i + step)}),
				                                            step, 100);
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

	getFartherEquation() // Returns the equation that is farther away from the rotation axis
	{
		if(this.equation1.equation === undefined)
		{
			return this.equation2;
		}
		else if(this.equation2.equation === undefined)
		{
			return this.equation1;
		}

		for(let x = math.round(100 * (size + bound1)); x < 100 * (size + bound2); x++)
		{
			if(math.abs(this.equation1.points[x] - rotationAxis) > math.abs(this.equation2.points[x] - rotationAxis))
			{
				return this.equation1;
			}
			else if(math.abs(this.equation1.points[x] - rotationAxis) < math.abs(this.equation2.points[x] - rotationAxis))
			{
				return this.equation2;
			}
		}
		return this.equation1; // Hopefully we never reach this point
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
		Graph.render();
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

	renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(window.innerWidth, window.innerHeight - totalHeight);
	renderer.setPixelRatio(window.devicePixelRatio);
	document.body.appendChild(renderer.domElement);

	controls = new THREE.TrackballControls(camera, renderer.domElement);
	controls.addEventListener("change", Graph.render);

	Graph.addAxis();
	Graph.addLights();
	Graph.animate();
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
	if(function1 === false)
	{
		return;
	}

	function2 = parseEquation(function2, "second function", type, false);
	if(function2 === false)
	{
		return;
	}

	const equation1 = new Equation(function1, type1);
	const equation2 = new Equation(function2, type2);

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
		if(bound1 === false)
		{
			drawSolid = false;
		}
		else
		{
			bound2 = parseEquation(document.getElementById("bound2").value, "second bound", type);
			if(bound2 === false)
			{
				drawSolid = false;
			}
			else
			{
				rotationAxis = parseEquation(document.getElementById("rotation").value, "axis of rotation", type);
				if(rotationAxis === false)
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

/**
 * Returns:
 * `false` if an invalid equation is passed
 * `undefined` if an empty equation is passed
 * The constant value if constant = true
 * The parser for the equation if constant = false
 */
function parseEquation(equation, name, equationType, constant = true)
{
	const type = getEquationType(equation, name);

	equation = equation.split(/=\s*/);
	if(type === EquationType.EQUATION_NONE)
	{
		return undefined;
	}
	else if(type === EquationType.EQUATION_INVALID)
	{
		return false;
	}

	if(constant)
	{
		if(type !== equationType && name.includes("rotation") || type === equationType && !name.includes("rotation"))
		{
			sweetAlert("Incorrect equation type", "The " + name + " should be a function of " + (type === EquationType.EQUATION_X ? "y" : "x"), "error");
			return false;
		}

		try
		{
			const value = math.eval(equation.pop().toString());
			if(math.abs(value) > size)
			{
				sweetAlert("Invalid " + name, "The " + name + " must be within " + -size + " to " + size + ", inclusive", "warning");
				return false;
			}
			return value;
		}
		catch(error)
		{
			sweetAlert("Invalid " + name, "Please enter a valid number for the " + name, "warning");
			return false;
		}
	}
	else
	{
		let parser;
		try
		{
			parser = math.parse(equation.pop());
		}
		catch(error) // Parsing can fail if unexpected values are passed in, eg '!', '(', '@', '.', etc.
		{
			sweetAlert("Invalid " + name, "Please enter a valid equation", "error");
			return false;
		}

		let valid = true;
		parser.traverse((node) =>
		{
			switch(node.type)
			{
				case "AccessorNode":
				case "ArrayNode":
				case "AssignmentNode":
				case "BlockNode":
				case "IndexNode":
				case "ObjectNode":
				case "RangeNode":
					sweetAlert("Invalid " + name, "Please make sure your equation is a valid function (detected " + node.type + ")", "error");
					valid = false;
					return;
				case "SymbolNode":
					if(node.name in math && typeof math[node.name] === "number"
					|| node.name === "x" && type === EquationType.EQUATION_Y
					|| node.name === "y" && type === EquationType.EQUATION_X)
					{
						break;
					}
					else
					{
						sweetAlert("Invalid " + name, "Unknown variable " + node.name, "error");
						valid = false;
						return;
					}
				case "FunctionNode":
					if(node.name in math && typeof math[node.name] === "function")
					{
						break;
					}
					else
					{
						sweetAlert("Invalid " + name, "Unknown function " + node.name, "error");
						valid = false;
						return;
					}
				case "FunctionAssignmentNode":
					sweetAlert("Invalid " + name, "f(x) syntax is currently unsupported.  Check back later!", "warning");
					valid = false;
					return;
			}
		});

		return valid ? parser : false;
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
	renderer.setPixelRatio(window.devicePixelRatio);
	Graph.render();
};
