window.addEventListener("keyup", onKeyUp);

function showExamples() // eslint-disable-line
{
	if(document.getElementById("modal").style.display === "none" || document.getElementById("modal").style.display === "")
	{
		document.getElementById("modal").style.display = "flex";
	}
}

function hideExamples()
{
	if(document.getElementById("modal").style.display === "flex")
	{
		document.getElementById("modal").style.display = "none";
	}
}

function tryMe(index) // eslint-disable-line
{
	// TODO: Fill these in programatically.
	switch(index)
	{
		case 0:
			document.getElementById("function1").value = "y=x";
			document.getElementById("function2").value = "y=x^2";
			document.getElementById("bound1").value = "x=1";
			document.getElementById("bound2").value = "x=5";
			document.getElementById("rotation").value = "y=0";
			hideExamples();
			document.getElementById("rotate-button").click();
			break;
		case 1:
			document.getElementById("function1").value = "y=3";
			document.getElementById("function2").value = "y=-x^2";
			document.getElementById("bound1").value = "x=-3";
			document.getElementById("bound2").value = "x=3";
			document.getElementById("rotation").value = "y=4";
			hideExamples();
			document.getElementById("rotate-button").click();
			break;
		case 2:
			document.getElementById("function1").value = "x=y";
			document.getElementById("function2").value = "x=sqrt(y)";
			document.getElementById("bound1").value = "y=1";
			document.getElementById("bound2").value = "y=5";
			document.getElementById("rotation").value = "x=1";
			hideExamples();
			document.getElementById("rotate-button").click();
			break;
		case 3:
			document.getElementById("function1").value = "y=sin(x)";
			document.getElementById("function2").value = "";
			document.getElementById("bound1").value = "x=0";
			document.getElementById("bound2").value = "x=pi";
			document.getElementById("rotation").value = "y=0";
			hideExamples();
			document.getElementById("rotate-button").click();
			break;
	}
}

function onKeyUp(event)
{
	if(event.key === "Escape")
	{
		hideExamples();
	}
}
