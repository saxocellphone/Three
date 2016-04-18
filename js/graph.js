"use strict";
let camera, controls, scene, renderer;
let bound1, bound2, axisOfRotation;
const size = 28;

class Equation
{
	constructor(equation)
	{
		this.equation = equation;
		this.points = this.getPoints();
	}

	getPoints()
	{
		let points = [];
		const compiledEquation = math.compile(this.equation);
		for(let x = -size; x <= size + 1; x += 0.01)  //Add 1 to the ending size because of the origin
		{
			points.push(compiledEquation.eval({x}));
		}
		return points;
	}

	getY(x)
	{
		//getPoints iterates by 0.01 starting from 0, not -28, so multiply the converted x coord by 100 to get actual indices
		return this.points[Math.round(100 * (size + x))];
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
		if(otherEquation.points.every((element) => element === undefined))
		{
			otherEquation.points.fill(axisOfRotation);
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
}

class Graph
{
	constructor(equation1, equation2, quality)
	{
		this.group = new THREE.Object3D();
		this.equation1 = equation1;
		this.equation2 = equation2;
		this.quality = quality;
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
			vector[counter + size] = new THREE.Vector3(x.toFixed(2), equation.points[counter + size], 0.05);
			x += step;
			counter++;
		}

		const geometry = new THREE.Geometry();
		const spline = new THREE.CatmullRomCurve3(vector);
		const splinePoints = spline.getPoints(vector.length - 1);
		for(let i = 0; i < splinePoints.length; i++)
		{
			if(Math.abs(spline.points[i].y) <= size)
			{
				geometry.vertices.push(spline.points[i]);
			}
		}

		const line = new THREE.Line(geometry, new THREE.LineBasicMaterial());
		line.name = "line";
		scene.add(line);
		Graph.render();
	}

	drawShape()
	{
		this.group.name = "solid";
		let boundY1 = this.equation1.getY(bound1);
		let boundY2 = this.equation1.getY(bound2);

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
			Graph.clear();
			return;
		}

		//Switch the functions around so that the larger one is always first for consistency
		if(!larger && this.equation2 !== undefined && Number(this.equation2.equation) !== axisOfRotation)
		{
			[this.equation1.equation, this.equation2.equation] = [this.equation2.equation, this.equation1.equation];
			[this.equation1.points, this.equation2.points] = [this.equation2.points, this.equation1.points];
		}

		if(this.equation2 === undefined || Number(this.equation2.equation) === axisOfRotation)  //FIXME: This doesn't catch constants
		{
			console.log("No second function or second function is equal to the axis of rotation");
			this.addSolidWithoutHoles("Math.abs(this.equation1.getY(i))", "Math.abs(this.equation1.getY(i+step))");
		}
		else
		{
			console.log("Maximums: " + this.equation1.getMax() + " and " + this.equation2.getMax());
			console.log("Minimums: " + this.equation1.getMin() + " and " + this.equation2.getMin());
			if(boundY1 !== boundY2)
			{
				console.log("\tboundY1 and boundY2 are not equal");
				if(axisOfRotation >= this.equation1.getMax() && axisOfRotation >= this.equation2.getMax()
				|| axisOfRotation <= this.equation1.getMin() && axisOfRotation <= this.equation2.getMin())
				{
					this.addBSP("Math.abs(axisOfRotation-this.equation2.getY(i))",
					            "Math.abs(axisOfRotation-this.equation2.getY(i+step))",
					            "Math.abs(axisOfRotation-this.equation1.getY(i))",
					            "Math.abs(axisOfRotation-this.equation1.getY(i+step))");
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
				if(axisOfRotation > boundY1)
				{
					console.log("\t\t\tAxis of rotation is greater than boundY1");
					this.addBSP("Math.abs(axisOfRotation-this.equation1.getY(i))", "Math.abs(axisOfRotation-this.equation1.getY(i+step))", "Math.abs(axisOfRotation)", "Math.abs(axisOfRotation)");
				}
				else if(axisOfRotation < boundY1)
				{
					console.log("\t\t\tAxis of rotation is less than boundY1");
					this.addBSP("Math.abs(axisOfRotation)", "Math.abs(axisOfRotation)", "Math.abs(axisOfRotation)+this.equation1.getY(i)", "Math.abs(axisOfRotation)+this.equation1.getY(i+step)");
				}
				else if(axisOfRotation === boundY1)
				{
					console.log("\t\t\tAxis of rotation is equal to boundY1");
					this.addSolidWithoutHoles("Math.abs(this.equation1.getY(i))", "Math.abs(this.equation1.getY(i+step))");
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
			if(this.equation1.getY(i) <= size)
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
				smallCylinderGeom.rotateZ(Math.PI / 2).translate(i + step / 2, axisOfRotation, 0);
				const largeCylinderGeom = new THREE.CylinderGeometry(eval(bigGeoR1), eval(bigGeoR2), step, 360);
				largeCylinderGeom.rotateZ(Math.PI / 2).translate(i + step / 2, axisOfRotation, 0);
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
			if(this.equation1.getY(i) <= size)
			{
				if(i + step > bound2)  //Prevent the solid from extending beyond the second bound if it can't be divided by the quality
				{
					step = bound2 - i;
				}

				const geometry = new THREE.CylinderGeometry(eval(leftRadius), eval(rightRadius), step, 100);
				geometry.rotateZ(Math.PI / 2).translate(i + step / 2, axisOfRotation, 0);
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

	const function1 = document.getElementById("function1").value;
	const function2 = document.getElementById("function2").value;
	const quality = Number(document.getElementById("quality").value);
	let drawSolid = true;

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

	const equation1 = new Equation(function1);
	const equation2 = new Equation(function2);

	let graph = new Graph(equation1, equation2, quality);

	graph.draw(equation1);
	graph.draw(equation2);

	if(drawSolid)  //Only create the solid if we have both of the bounds and the axis of rotation
	{
		graph.drawShape();
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
