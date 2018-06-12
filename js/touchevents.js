function startup() {
  var el = document.getElementsByTagName("body")[0];
  el.addEventListener("touchstart", handleTouches, false);
  el.addEventListener("touchend", handleEnded, false);
  el.addEventListener("touchcancel", handleEnded, false);
  el.addEventListener("touchmove", handleMove, false);
}

var ongoingTouches = [];

function handleTouches(evt) {
	evt.preventDefault();
	evt.returnValue = false;

	updateTouches(evt.changedTouches);
 	printOngoingTouches();
	calculateAngles();
	updateDots();
}

function handleMove(evt) {
	evt.preventDefault();
	evt.returnValue = false;

	updateTouches(evt.changedTouches);
	printOngoingTouches();
	calculateAngles();
	updateDots();
}

function handleEnded(evt) {
	evt.preventDefault();
	evt.returnValue = false;

	removeTouches(evt.changedTouches);
	printOngoingTouches();
}

function updateTouches(touches) {
	for (var i = 0; i < touches.length; i++) {
		var hasReplacedTouch = false;
		for (var j = 0; j < ongoingTouches.length; j++) {
			if (touches[i].identifier == ongoingTouches[j].identifier) {
				ongoingTouches.splice(j, 1, touches[i]);
				hasReplacedTouch = true;
			}
		}

		if (!hasReplacedTouch) {
			ongoingTouches.push(touches[i]);
		}
	}
}

function removeTouches(touches) {
	var newOngoingTouches = [];
	for (var i = 0; i < ongoingTouches.length; i++) {
		var shouldBeIncluded = true;
		for (var j = 0; j < touches; j++) {
			shouldBeIncluded = false;
		}

		if (shouldBeIncluded) {
			newOngoingTouches.push()
		}
	}

	ongoingTouches = newOngoingTouches;
}

function printOngoingTouches() {
	document.getElementById("touches_field").innerHTML = "";
	for (var i = 0; i < ongoingTouches.length; i++) {
		document.getElementById("touches_field").innerHTML += ongoingTouches[i].screenX + "/" + ongoingTouches[i].screenY + " ";
	}
}

function updateDots() {
	for (var i = 0; i < ongoingTouches.length; i++) {
		var name = "dot_" + (i + 1);
		document.getElementById(name).style["top"] = ongoingTouches[i].screenY + "px";
		document.getElementById(name).style["left"] = ongoingTouches[i].screenX + "px";
	}
}

function calculateAngles() {
	if (ongoingTouches.length == 2) {
		var touchA = ongoingTouches[0];
		var touchB = ongoingTouches[1];

		if (touchA.screenX < touchB.screenX) {
			document.getElementById("angle_1").innerHTML = calculateAngle(touchA, touchB);
		} else {
			document.getElementById("angle_1").innerHTML = calculateAngle(touchB, touchA);
		}
	}
}

function calculateAngle(touchA, touchB) {
	return -Math.atan2(touchB.screenY - touchA.screenY, touchB.screenX - touchA.screenX) * 180 / Math.PI;
}


document.addEventListener('touchmove', function (event) {
  if (event.scale !== 1) { event.preventDefault(); }
}, false);
