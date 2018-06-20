'use strict';

function respParcoords(data, options) {
  const optionsDefault = {
    svgSelector: '#chart',
    minSegmentSize: 40,
    breakpoint1: '35em',
    breakpoint2: '50em',
    margin: {
      top: 20,
      right: 30,
      bottom: 5,
      left: 2
    },
    dy: 2, // displacement for top margin
    dW: 0.5, // stroke width and displacement
    titley: 2.5,  //displacement for axes titles
    titleStep: -1.5,
    angStep: -45,  // rotation step
    ignoreDimensions: []
  };
  options = Object.assign(optionsDefault, options);

  //arrays of ids for axes and checkbuttons
  let myAxes = Object.keys(data[0]);
  myAxes.splice(0, 1); // remove name column
  const myChks = myAxes.map(value => 'chk_' + value);
  const numberDimensions = myAxes.length; //number of used properties

  let svg = d3.select(options.svgSelector);
  let svgTranslated, g, line;
  var unfocused;
  var focused;
  var x, y;
  var selectedDimensions;
  var dimensions;
  var variable = [];
  const breakpoints = [options.breakpoint1, options.breakpoint2];
  var dragging;
  var axis;
  var dimensionsMenu;

  var NONE = "NONE", ANGULAR = "ANGULAR", REGULAR = "REGULAR";
  // specifies the brushing information
  var brushSpec = {
    type: NONE,
    b: [],
    angular: {
      dim1: undefined,
      dim2: undefined,
      frm: undefined,
      to: undefined
    },
    changed : true
  };

  // specifies which dimensions are shown, inverted, ...
  var dimensionSpec = {
    hard : false,
    changed : true,
    // selectedDimensions : [],
    inverted : []
  };

  var rangeInfo = {
  	frmX:0,toX:0,frmY:0,toY:0
  };

  let a;

  let vbmx = 0, vbmy = 0, vbw = 80, vbh = 80;
  let vbr = vbmx + " " + vbmy + " " + vbw + " " + vbh;
  let width = vbw - vbmx;
  let height = vbh - vbmy;
  let fontSize = vbh / 30; // set font size to 1/30 th of height??

  init();
  plot();
  d3.select(window).on('resize', plot);

  // touches test
  svg.on('touchstart', handleTouches);
  svg.on('touchmove', handleTouches);
  svg.on('touchend', handleTouches);

  function init() {
    svgTranslated = svg.attr("viewBox", vbr)
      .append("g")
      .attr("transform", "translate(" + 0 + "," + options.margin.top + ")");

    // Axis
    x = d3.scalePoint().range([options.margin.left, width - options.margin.right]);
    y = {};
    dragging = {};
    line = d3.line();
    axis = d3.axisLeft();

    // Extract the list of dimensions and create a scale for each.
    selectedDimensions = d3.keys(data[0]).filter(function (dimension) {
      return !options.ignoreDimensions.includes(dimension) && typeof(data[1][dimension]) == "number";
    });
    selectedDimensions.forEach(function(dimension) {
      y[dimension] = d3.scaleLinear()
        .domain(d3.extent(data, function (p) {
          return +p[dimension];
        }))
        .range([height - options.margin.top - options.dy, options.margin.bottom]);
    });
    x.domain(selectedDimensions);
    dimensions = selectedDimensions;

    // dimensionsMenu
    d3.select("body")
      .append("ul")
      .attr("id","dimensionsMenu");
    dimensionsMenu = d3.select("#dimensionsMenu");
    dimensionsMenu.selectAll(".chosen")
      .data(dimensions)
      .enter()
      .append("li")
      .text(function(d){return d;})
      .attr("class","chosen")
      .attr("id",function(d){return d;})
      .on("click",function(d){
        //console.log(d);
        dimensionSpec.hard = true;
        dimensionSpec.changed = true;
        if(selectedDimensions.includes(d)){
          selectedDimensions.splice(selectedDimensions.indexOf(d),1);
        } else {
          selectedDimensions.push(d);
        }
        plot();

      });
    d3.select('body')
      .append('button')
      .text('clear brush')
      .on('click', function() {
        clearBrush();
      });

    // dimensionsMenu.enter()
    //   .data(dimensions)
    //   .enter()
    //     .append("li")
    //     .text(function(d){return d;})
    //     .attr("class","chosen");
    g = svgTranslated.selectAll(".dimension");
    plot();
  }


  // Returns the path for a given data point.
  function path(d) {
    return line(
      selectedDimensions
        .map(function (p) {
          return [position(p) + options.dW, y[p](d[p]) + options.dW];
        })
    );
  }

  function position(data) {
    var v = dragging[data];
    return v == null ? x(data) : v;
  }

  function getBaseFontSize() {
    return (parseFloat(getComputedStyle(document.documentElement).fontSize));
  }


  // resize function
  function plot() {

    // set the view box for the chart
    var widthpx = parseInt(d3.select(options.svgSelector).style("width")),
      heightpx = parseInt(d3.select(options.svgSelector).style("height"));

    vbmx = -15, vbmy = 0;
    vbw = (widthpx / heightpx * 80);
    vbh = 80;
    vbr = vbmx + " " + vbmy + " " + vbw + " " + vbh;
    width = vbw - 0;
    height = vbh - 0;

    svg.attr("viewBox", vbr);

    // Set breakpoints in pixels.
    var narrowpx = parseFloat(breakpoints[0]) * getBaseFontSize();
    var mediumpx = parseFloat(breakpoints[1]) * getBaseFontSize();

    // Automatic adjustment of the number of segments.
    if (!dimensionSpec.hard) { // soft adjustment
      var numberSegementsShown = Math.floor(width / options.minSegmentSize);
      if (numberSegementsShown < 2) numberSegementsShown = 2;
      if (numberSegementsShown > numberDimensions) numberSegementsShown = numberDimensions;
      // if it's the same number, don't change
      if(selectedDimensions.length !== numberSegementsShown){
        dimensionSpec.changed = true;
        if(selectedDimensions.length > numberSegementsShown){
          selectedDimensions = selectedDimensions.slice(0,numberSegementsShown);
        } else {
          for(let dim in dimensions){
            if(selectedDimensions.length >= numberSegementsShown) break;
            if(!selectedDimensions.includes(dimensions[dim])){
              selectedDimensions.push(dimensions[dim]);
              //document.getElementById(myChks[i]).checked=true;
            }
          }
        }

        /*if (numberSegementsShown<dim){ // show or hide 'Dimensions' button
          document.getElementById("btn").removeAttribute("class");
        }
        else {
          document.getElementById("btn").setAttribute("class", "hide");
        }*/

      }
    } else { // if dimensions are chosen
      // TODO override whatever 'show(element)' method does
      // IMPORTANT: if #selected dimensions < 2 add until you get 2, and maybe alert
    }

    x.domain(selectedDimensions);
    g.data(selectedDimensions);
    showMenu();

    /// snippet only for testing regular brush ////
    // brushSpec.type = REGULAR;
    // brushSpec.changed = true;
    // var lb1 = Math.floor(Math.random() * 4) + 3;
    // var ub1 = Math.floor(Math.random() * 4) + 5;
    // //console.log(lb1 + " " + ub1);
    // brushSpec.b.cylinders = [lb1, ub1];

    // var lb2 = Math.floor(Math.random() * 100) + 1;
    // var ub2 = Math.floor(Math.random() * 100) + 100;
    // //console.log(lb2 + " " + ub2);
    // brushSpec.b.power = [lb2, ub2];

    /// END OF IT ////

    if(dimensionSpec.changed){ // replot unfocused stuff
      svgTranslated.selectAll("g.unfocused").remove();

      // Add gray foreground lines; thickness in css.
      unfocused = svgTranslated.append("g")
        .attr("class", "unfocused")
        .selectAll("path")
        .data(data)
        .enter().append("path")
        .attr("d", path);

        // IMPORTANT: should not include 'dimensionSpec.changed = false;' here,
        // the next if-body takes care of it
    }

    if(dimensionSpec.changed || brushSpec.changed){
      svgTranslated.selectAll("g.focused").remove();

      // Add blue focused foreground lines; thickness in css.
      focused = svgTranslated.append("g") // can we make the text always on top?
      // also a better solution could be to change the css class
      // of certain elements from foreground to focused
        .attr("class", "focused")
        .selectAll("path")
        .data(data
          .filter(function (p) {
            ///// The whole filtering (brushing) logic /////
            if (brushSpec.type == REGULAR) {
              for (var dim in brushSpec.b) {
                if (!selectedDimensions.includes(dim)) continue;
                if (brushSpec.b[dim] == undefined || brushSpec.b[dim] == -1) continue;
                if (brushSpec.b[dim][0] > p[dim] || p[dim] > brushSpec.b[dim][1]) return false;
              }
              return true;
            } else if (brushSpec.type == ANGULAR) {
              var d1 = brushSpec.angular.dim1;
              var d2 = brushSpec.angular.dim2;
              var frm = brushSpec.angular.frm;
              var to = brushSpec.angular.to;
              var dif = p[d1] - p[d2];
              return (frm <= dif && dif <= to);
            }
            return true; // No filter applied
          })
        )
        .enter().append("path")
        .attr("d", path);


      // redrawing here only to prevent elements from hiding each others
      svgTranslated.selectAll("g.dimension").remove();
      svgTranslated.selectAll("g.axis").remove();
      svgTranslated.selectAll("text").remove();

      // Add a group elements for each dimension.
      g = svgTranslated.selectAll(".dimension")
        .data(selectedDimensions)
        .enter().append("g")
        .attr("class", "dimension")
        .attr("id", function (data, i) {
          return data;
        });
      // Add an axis and title; d3 v4 requires filling the title.
      a = g.append("g")
        .attr("class", "axis")
        .each(function (data) {
          d3.select(this)
            .call(
              axis.scale(y[data])
                .tickSize("1.5")
                .tickPadding("1.5")
            );
        })
        .append("text")
        .attr("class", "title")
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .attr("y", options.titley)
        .text(function (data) {
          return data;
        });

      fontSize = vbh / 30; // set font size to 1/30 th of height??

      svgTranslated.selectAll(".axis")
        .attr("font-size", fontSize)
        .attr("stroke-width", options.dW);

      dimensionSpec.changed = false;
      brushSpec.changed = false;
      var yRange;
      d3.selectAll(".domain")
      	.each(function(){
      		var bbox = this.getBBox();
      		// var bbox = this.getBoundingClientRect();
      		var frm = bbox.y;
      		var to = frm + bbox.height;
      		yRange = [frm,to];
      		// yRange = [frm, to];
      		// document.getElementById("log_container").innerHTML = JSON.stringify(bbox);
      		// console.log(bbox);
      	});
     document.getElementById("log_container").innerHTML = "" + yRange;
     //svg.append('rect').attrs({ x: yRange[0], y: yRange[1], width: 1, height: 1, fill: 'red' });

      //console.log(yRange);
    }


    var anchort = "start", brp;
    if (widthpx > mediumpx) {
      brp = 0;
      anchort = "middle"
    }
    else if (widthpx > narrowpx) brp = 1;
    else brp = 2;
    var anglet = brp * options.angStep; // rotating the text
    var dxt = brp * (options.titleStep);
    var dyt = brp * (options.titleStep);

    x.range([options.margin.left, width - options.margin.right]);
    g.attr("transform", function (data) {
      if (x(data)) return "translate(" + x(data) + ")";
    });
    unfocused.attr("d", path);
    focused.attr("d", path);
    a.style("text-anchor", anchort);
    a.attr("transform", "rotate(" + anglet + ")");
    a.attr("dy", dyt);
    a.attr("dx", dxt);


    d3.selectAll(".unfocused")
		.each(function(){
      		var bbox = this.getBBox();
			rangeInfo.frmX = bbox.x;
			rangeInfo.toX = bbox.x + bbox.width;
		});
	d3.selectAll(".domain")
		.each(function(){
      		var bbox = this.getBBox();
			rangeInfo.frmY = options.margin.top + bbox.y;
			rangeInfo.toY = options.margin.top + bbox.y + bbox.height;
		});
	//console.log(rangeInfo);

  }

  function handleTouches() {
    const touches = d3.touches(this);

    showTouchOnAxis(touches);
    if(touches.length == 2){
    	handleSinleBrush(touches);
    } else if(touches.length == 4){
    	handleDoubleBrush(touches);
    } else if(touches.length == 3){

    	handleAngularBrush(touches);
    }
  }

  function handleAngularBrush(touches){
  	var x = [touches[0][0],touches[1][0],touches[2][0]];
  	x.sort();
  	var xMapper = d3.scaleLinear()
	  	.domain([rangeInfo.frmX,rangeInfo.toX])
	  	.range([0,selectedDimensions.length-1]);
  	var dim1,dim2;
  	var refy;
  	var frm,to;
  	// group x coords
  	if(x[1] - x[0] <= x[2] - x[1]){ // group 0 and 1 together
  		dim2 = selectedDimensions[Math.ceil(xMapper(x[1]))];
  		dim1 = selectedDimensions[Math.floor(xMapper(x[2]))];
  		var rng1 = getRange(dim1);
		var yMapper = d3.scaleLinear()
		  	.domain([rangeInfo.frmY,rangeInfo.toY])
		  	.range(rng1);
		refy = yMapper(touches[2][1]);
		var rng2 = getRange(dim2);
		yMapper = d3.scaleLinear()
		  	.domain([rangeInfo.frmY,rangeInfo.toY])
		  	.range(rng2);
		frm = Math.max(yMapper(touches[0][1]),yMapper(touches[1][1]));
		to = Math.min(yMapper(touches[0][1]),yMapper(touches[1][1]));
		frm = refy - frm;
		to = refy - to;
		console.log("dims = [" + dim1 + "," +  dim2 + "]");
		console.log([frm,to]);
		angularBrush(dim1,dim2,frm,to);
  	} else {
  		dim1 = selectedDimensions[Math.ceil(xMapper(x[0]))];
  		dim2 = selectedDimensions[Math.floor(xMapper(x[1]))];
  	}
  }

  function showTouchOnAxis(touches) {
    let xLinear = d3.scaleLinear()
      .range([rangeInfo.frmX,rangeInfo.toX])
      .domain([0, selectedDimensions.length - 1]);

    svgTranslated.selectAll('.rect').remove();

    for (let touch of touches) {
      const touchX = touch[0];
      const touchY = touch[1];

      const axisI = Math.round(xLinear.invert(touchX));
      const axisName = selectedDimensions[axisI];
      const axisX = x(axisName);

      //const axisY = y[axisName].invert(touchY);
      let axisY = Math.min(
        rangeInfo.toY,
        Math.max(rangeInfo.frmY, touchY)
      );
      axisY -= options.margin.top;

      svgTranslated.append("rect")
        .attr('class', 'rect')
        .attr("x", axisX - 2)
        .attr("y", axisY - 1)
        .attr("width", 4)
        .attr("height", 2)
        .attr('fill', 'red');
    }

  }

  function handleDoubleBrush(touches){
  	touches.sort();
  	var x = [touches[0][0],touches[3][0]];
  	var dim = [];
  	var xMapper = d3.scaleLinear()
	  	.domain([rangeInfo.frmX,rangeInfo.toX])
	  	.range([0,selectedDimensions.length-1]);
  	for(let i in x){
	  	x[i] = (i == 0) ? Math.ceil(xMapper(x[i])) : Math.floor(xMapper(x[i]));
  		x[i] = Math.min(selectedDimensions.length,Math.max(0,x[i]));
		dim[i] = selectedDimensions[x[i]];
  	}

  	var y = [touches[0][1],touches[1][1],touches[2][1],touches[3][1]];
  	var rng = [getRange(dim[0]),getRange(dim[1])];
  	var yMapper = [d3.scaleLinear()
	  	.domain([rangeInfo.frmY,rangeInfo.toY])
	  	.range(rng[0]),
	  	d3.scaleLinear()
	  	.domain([rangeInfo.frmY,rangeInfo.toY])
	  	.range(rng[1])]
  	for(let i in y){
	  	y[i] = Math.min(rangeInfo.toY,Math.max(rangeInfo.frmY,y[i]));
	  	y[i] = (yMapper[Math.floor(i/2)])(y[i]);

  	}
  	var b = [[y[0],y[1]].sort(),[y[2],y[3]].sort()];
  	brush(dim,b);
  }


  function handleSinleBrush(touches){
  	// which dimension? take one touch and select the closest dimension to it
  	var x = touches[0][0];
  	x = Math.min(rangeInfo.toX,Math.max(rangeInfo.frmX,x));

  	var xMapper = d3.scaleLinear()
	  	.domain([rangeInfo.frmX,rangeInfo.toX])
	  	.range([0,selectedDimensions.length-1]);
  	var dimensionIdx = Math.round(xMapper(x));
	var dim = selectedDimensions[dimensionIdx];

  	// what is the range?
  	// document.getElementById("touches_field").innerHTML += "</br>";
  	var y = [touches[0][1],touches[1][1]];
  	// document.getElementById("touches_field").innerHTML +=y+"</br>";
  	var rng= getRange(dim);
  	// document.getElementById("touches_field").innerHTML +=rng+"</br>";
  	var yMapper = d3.scaleLinear()
	  	.domain([rangeInfo.frmY,rangeInfo.toY])
	  	.range(rng);
  	for(let i in y){
	  	y[i] = Math.min(rangeInfo.toY,Math.max(rangeInfo.frmY,y[i]));
	  	y[i] = yMapper(y[i]);
  	}
  	y = [Math.min(y[0],y[1]),Math.max(y[0],y[1])];
  	//document.getElementById("touches_field").innerHTML += "</br>" + y;
  	brush([dim],[y]);
  }

  function getRange(dim){ // TODO can be much more elegant... preprocessing
  	var min = data[1][dim],max=data[1][dim];
  	// document.getElementById("touches_field").innerHTML += " " + min + " " + max;
  	for(let i in data) if(i > 0){ // skip the titles
  		min = Math.min(min,data[i][dim]);
  		max = Math.max(max,data[i][dim]);
  	}
  	if(dimensionSpec.inverted[dim])
  		return [min,max];
  	else
  		return [max,min];

  }

  function showMenu(){
    dimensionsMenu.selectAll("li")
    .attr("class",function(d){
      return selectedDimensions.includes(d) ? "chosen" : "unchosen";
    });
  }

  function brush(dims, rgs) {
    clearBrush();
    brushSpec.type = REGULAR;
    document.getElementById("touches_field").innerHTML = "";
    //console.log(rgs);
    for (var i in dims){
      brushSpec.b[dims[i]] = rgs[i];
    }
    brushSpec.changed = true;
  	document.getElementById("touches_field").innerHTML += "</br>" + JSON.stringify(brushSpec);
    plot();
  }

  function angularBrush(dim1, dim2, frm, to) {
    clearBrush();
    brushSpec.type = ANGULAR;
    brushSpec.angular.dim1 = dim1;
    brushSpec.angular.dim2 = dim2;
    brushSpec.angular.frm = frm;
    brushSpec.angular.to = to;
    brushSpec.changed = true;
    plot();
  }

  function clearBrush() {
    for (var i in brushSpec.b)
      brushSpec.b[i] = -1;
    brushSpec.type = NONE;
    brushSpec.changed = true;
    plot();
  }

  // modal (never called) because html template is missing.
  function initModal() {
    // Move the dimensions selection dialog
    var offset=[0,0];
    var div = document.getElementById('mheader');
    var dlg = document.getElementById('modal');
    var jumpMove=50; // step for dialog move if close to border on resize
    div.addEventListener('mousedown', mouseDown, true);
    window.addEventListener('mouseup', mouseUp, true);
    window.addEventListener('resize', dialogResMove,true);

    function mouseDown(e){
      window.addEventListener('mousemove', mouseMove, true);
      div.classList.add("move");
      offset= [e.clientY - dlg.offsetTop, e.clientX - dlg.offsetLeft];
    }
    function mouseUp() {
      window.removeEventListener('mousemove', mouseMove, true);div.classList.remove("move");
    }
    function mouseMove(e) {
      dlg.style.top = (e.clientY - offset[0]) + 'px';
      dlg.style.left = (e.clientX - offset[1]) + 'px';
    }
    function dialogResMove(e){
      if (dlg.offsetLeft+dlg.offsetWidth+jumpMove/2>window.innerWidth) dlg.style.left=(dlg.offsetLeft-jumpMove)+'px';
    }
    function showDialog(){
      var ww=window.innerWidth;
      document.getElementById('modal').style.display='initial';
      if (dlg.offsetLeft+dlg.offsetWidth+jumpMove/2>ww) dlg.style.left=(ww-dlg.offsetWidth-jumpMove)+'px';
    }

    for (let i in myChks) {document.getElementById(myChks[i]).checked = true;}
  }
}
