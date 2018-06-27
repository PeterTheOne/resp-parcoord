'use strict';

function respParcoords(data, options) {
  const optionsDefault = {
    svgSelector: '#chart',
    minSegmentSize: 50,
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
    titley: 0,  //displacement for axes titles
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
  var dataMin = [], dataMax = []; // maps dimension to range [min,max]

  var NONE = "NONE", ANGULAR = "ANGULAR", REGULAR = "REGULAR";
  // specifies the brushing information
  var brushSpec = {
    type: NONE,
    b: [],
    angular: {
      dim1: undefined,
      dim2: undefined,
      frm: undefined,
      to: undefined,
      ref: undefined
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
  let ax;
  let sortIcon;

  let vbmx = 0, vbmy = 0, vbw = 100, vbh = 100;
  let vbr = vbmx + " " + vbmy + " " + vbw + " " + vbh;
  let width = vbw - vbmx;
  let height = vbh - vbmy;
  let fontSize = vbh / 30; // set font size to 1/30 th of height??

  init();
  plot();
  d3.select(window).on('resize', plot);

  // touches test
  svg.on('touchstart', bboxStart);
  svg.on('touchmove', bboxMove);
  svg.on('touchend', bboxEnd);

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
        .range([height - options.margin.top - options.dy, options.margin.bottom])
        .clamp(true);
    });
    x.domain(selectedDimensions);
    dimensions = selectedDimensions;

    for(let i in dimensions){
    	var dim = dimensions[i];
	  	var min = data[1][dim],max=data[1][dim];
	  	// document.getElementById("touches_field").innerHTML += " " + min + " " + max;
	  	for(let i in data) if(i > 0){ // skip the titles
	  		min = Math.min(min,data[i][dim]);
	  		max = Math.max(max,data[i][dim]);
	  	}
	  	dataMin[dim] = min;
	  	dataMax[dim] = max;
	}

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
        dimensionSpec.hard = true;
        if(selectedDimensions.includes(d)){
        	hideDimension(d);
        } else {
  			showDimension(d);
        }
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

  function hideDimension(d){
    dimensionSpec.changed = true;
  	if(selectedDimensions.length > 2){
	  	selectedDimensions.splice(selectedDimensions.indexOf(d),1);
	  	plot();
  	}
  }

  function showDimension(d){
    dimensionSpec.changed = true;
    selectedDimensions.push(d);
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
    d3.select(options.svgSelector)
    .attr("style","height:"+Math.min(480,window.innerHeight));
    var widthpx = parseInt(d3.select(options.svgSelector).style("width")),
      heightpx = parseInt(d3.select(options.svgSelector).style("height"));
      console.log(d3.select(options.svgSelector).style("height")+" " + window.innerHeight);
    vbmx = -15, vbmy = 0;
    vbw = (widthpx / heightpx * 100);
    vbh = 100;
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
	    selectedDimensions.forEach(function(dimension) {
	    	if(dimensionSpec.inverted[dimension]){
		      y[dimension] = d3.scaleLinear()
		        .domain(d3.extent(data, function (p) {
		          return +p[dimension];
		        }))
		        .range([options.margin.bottom, height - options.margin.top - options.dy]);
	    	} else {
		      y[dimension] = d3.scaleLinear()
		        .domain(d3.extent(data, function (p) {
		          return +p[dimension];
		        }))
		        .range([height - options.margin.top - options.dy, options.margin.bottom]);

	    	}
	    });
        // IMPORTANT: should not include 'dimensionSpec.changed = false;' here,
        // the next if-body takes care of it
    }

    if (dimensionSpec.changed || brushSpec.changed) {
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
              var frm = Math.min(brushSpec.angular.frm,brushSpec.angular.to);
              var to = Math.max(brushSpec.angular.frm,brushSpec.angular.to);
              var mapper = d3.scaleLinear()
			  	.domain(getRange(d1))
			  	.range(getRange(d2));
			  var p1 = mapper(p[d1]);
              var dif = p[d2] - p1;
              var ref = brushSpec.angular.ref;
              return (frm-ref <= dif && dif <= to-ref);
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
      ax = g.append("g")
        .attr("class", "axis")
        .each(function (data) {
          d3.select(this)
            .call(
              axis.scale(y[data])
                .tickSize("1.5")
                .tickPadding("1.5")
            );
        });

      const polyX = -0.5;
      const polyY = -1;
      const sortPolyPoints = [
        {x: polyX - 2.5, y: polyY + 5},
        {x: polyX + 2.5, y: polyY + 5},
        {x: polyX, y: polyY + 0.5}
      ];
      sortIcon = ax.append('polygon')
        .attr('points', sortPolyPoints.map(function(d) {
          return [d.x, d.y].join(',');
        }).join(' '))
        .attr('fill', 'black')
        .attr("transform", function(d){
        	return "rotate(" + (dimensionSpec.inverted[d] ? "180)" : "0)");
        }).attr("class","sortIcon")
        .on('touchend',function(d){
      	invertAxis(d);
      });
        // the following line flips the sortIcon
      sortIcon.attr('transform-origin', polyX + ' ' + (polyY + 2));
      
      a = ax.append("text")
        .attr("class", "title")
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .attr("y", options.titley)
        .text(function (data) {
        	return data;
        }).on("touchend", function(d){
        	//hideDimension(d);
        }).call(d3.drag()
        //.on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

      //var tri = d3.symbol().size(options.dW).type(d3.symbolTriangle);
      //svgTranslated.selectAll(".axis").append("path").attr("d",tri());
      //g.append("path").attr("d",d3.svg.symbol().type("triangle-up"));

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



    showBrushSelectMarkers();
  }
  var dragSpec = {
  	x : undefined,
  	y : undefined
  };

  function dragged(d){
  	dragSpec.x = d3.event.x;
  	dragSpec.y = d3.event.y;
  }

  function dragended(d){
  	var x = Math.min(rangeInfo.toX,Math.max(rangeInfo.frmX,dragSpec.x));

  	var xMapper = d3.scaleLinear()
	  	.domain([rangeInfo.frmX,rangeInfo.toX])
	  	.range([0,selectedDimensions.length-1]);
  	var idx = Math.round(xMapper(x));
  	if(isNaN(idx)){
  		//invertAxis(d);
  	} else {
  		changeAxisIndex(d,idx)
  	}
  }

  function invertAxis(d){
  	dimensionSpec.inverted[d] = !dimensionSpec.inverted[d];
	dimensionSpec.changed = true;
	plot();
  }

  function changeAxisIndex(d,idx){
  	// console.log(d+ " " + idx +
  	// 	 " " +  selectedDimensions.indexOf(d));
  	// console.log(selectedDimensions);
  	selectedDimensions.splice(selectedDimensions.indexOf(d),1);
  	// console.log(selectedDimensions);
  	selectedDimensions.splice(idx, 0, d);
  	// console.log(selectedDimensions);
  	dimensionSpec.changed = true;
  	plot();
  }

  function handleTouches(origin) {
    const touches = d3.touches(origin);

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
  	var refidx;
  	var idx1,idx2;
  	// group x coords
  	if(x[1] - x[0] <= x[2] - x[1]){ // group 0 and 1 together
  		dim2 = selectedDimensions[Math.ceil(xMapper(x[1]))];
  		dim1 = selectedDimensions[Math.floor(xMapper(x[2]))];
		refidx = 2;
		idx1 = 0;
		idx2 = 1;
  	} else {
  		dim1 = selectedDimensions[Math.ceil(xMapper(x[0]))];
  		dim2 = selectedDimensions[Math.floor(xMapper(x[1]))];
		refidx = 0;
		idx1 = 1;
		idx2 = 2;
  	}
	var rng1 = getRange(dim1);
	var yMapper = d3.scaleLinear()
	  	.domain([rangeInfo.frmY,rangeInfo.toY])
	  	.range(rng1);
	refy = yMapper(touches[refidx][1]);
	var rng2 = getRange(dim2);
	yMapper = d3.scaleLinear()
	  	.domain([rangeInfo.frmY,rangeInfo.toY])
	  	.range(rng2);
	frm = Math.min(yMapper(touches[idx1][1]),yMapper(touches[idx2][1]));
	to = Math.max(yMapper(touches[idx1][1]),yMapper(touches[idx2][1]));
	//frm = refy - frm;
	//to = refy - to;
	var mapper = d3.scaleLinear()
	  	.domain(rng1)
	  	.range(rng2);
	angularBrush(dim1,dim2,mapper(refy),frm,to);
  }

  function showBrushSelectMarkers() {
    svgTranslated.selectAll('.select-marker').remove();
    svgTranslated.selectAll('.select-range').remove();
    if (brushSpec.type !== REGULAR) {
      for (let i in selectedDimensions) {
        const dim = selectedDimensions[i];
        const y1 = y[dim].invert(rangeInfo.frmY - options.margin.top);
        const y2 = y[dim].invert(rangeInfo.toY - options.margin.top);
        setSelectionMarker(dim, y1);
        setSelectionMarker(dim, y2);
        setSelectionRange(dim, y1, y2);
      }
      return;
    }
    for (let i in selectedDimensions) {
      const dim = selectedDimensions[i];
      console.log(brushSpec.b);
      if (brushSpec.b.hasOwnProperty(dim)
          && brushSpec.b[dim] != undefined && brushSpec.b[dim] !== -1) {
        setSelectionMarker(dim, brushSpec.b[dim][0]);
        setSelectionMarker(dim, brushSpec.b[dim][1]);
        setSelectionRange(dim, brushSpec.b[dim][0], brushSpec.b[dim][1]);
      } else {
        const y1 = y[dim].invert(rangeInfo.frmY - options.margin.top);
        const y2 = y[dim].invert(rangeInfo.toY - options.margin.top);
        setSelectionMarker(dim, y1);
        setSelectionMarker(dim, y2);
        setSelectionRange(dim, y1, y2);
      }
    }
  }

  function setSelectionMarker(dim, bY) {
    const axisX = x(dim);
    const axisY = y[dim](bY);

    const polygonPoints = [
      {x: axisX + 3, y: axisY - 1.5},
      {x: axisX + 3, y: axisY + 1.5},
      {x: axisX + 0.5, y: axisY}
    ];

    svgTranslated.append("polygon")
      .attr('class', 'select-marker')
      .attr('points', polygonPoints.map(function(d) {
        return [d.x, d.y].join(',');
      }).join(' '))
      .attr('fill', 'green');
  }

  function setSelectionRange(dim, bY1, bY2) {
    console.log('setSelectionRange');
    const axisX = x(dim);
    const axisY1 = y[dim](bY1);
    const axisY2 = y[dim](bY2);

    svgTranslated.append("line")
      .attr('class', 'select-range')
      .attr('x1', axisX)
      .attr('y1', axisY1)
      .attr('x2', axisX)
      .attr('y2', axisY2)
      .attr("stroke-width", 0.5)
      .attr('stroke', 'green');
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
  	var y1 = [Math.min(y[0],y[1]),Math.max(y[0],y[1])];
  	var y2 = [Math.min(y[2],y[3]),Math.max(y[2],y[3])];
  	var b = [y1,y2];
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

  var bboxSpec = {
  	strt : false,
  	x1 : undefined,
  	y1 : undefined,
  	x2 : undefined,
  	y2 : undefined,
  	box : undefined
  };
  function bboxStart(){
  	handleTouches(this);
    const touches = d3.touches(this);
    if(touches.length != 1) return;
    bboxSpec.start = true;
    bboxSpec.x1 = touches[0][0];
    bboxSpec.y1 = touches[0][1];
    bboxSpec.box = svg.append("rect")
    				.attr("id","bboxSelection")
    				.attr("x", bboxSpec.x1)
                    .attr("y", bboxSpec.y1)
                    .attr("width", 0)
                    .attr("height", 0);
  }
  function bboxMove(){
  	handleTouches(this);
  	if(!bboxSpec.start) return;
    const touches = d3.touches(this);
    if(touches.length != 1) {
    	bboxSpec.start = false;
    	return;
    }
    bboxSpec.x2 = touches[0][0];
    bboxSpec.y2 = touches[0][1];
    bboxSpec.box.attr("x", Math.min(bboxSpec.x2,bboxSpec.x1))
    			.attr("y", Math.min(bboxSpec.y2,bboxSpec.y1))
    			.attr("width", Math.abs(bboxSpec.x2 - bboxSpec.x1))
                .attr("height", Math.abs(bboxSpec.y2 - bboxSpec.y1));
    filterBBox();
  }


  function bboxEnd(){
    //handleTouches(this);
  	if(!bboxSpec.start) return;
  	bboxSpec.start = false;
  	filterBBox();
  	bboxSpec.box.remove();
  }

  function filterBBox(){
  	var x1 = Math.min(bboxSpec.x1,bboxSpec.x2);
  	var x2 = Math.max(bboxSpec.x1,bboxSpec.x2);

  	var y1 = Math.min(bboxSpec.y1,bboxSpec.y2);
  	var y2 = Math.max(bboxSpec.y1,bboxSpec.y2);

  	var xMapper = d3.scaleLinear()
	  	.domain([rangeInfo.frmX,rangeInfo.toX])
	  	.range([0,selectedDimensions.length-1]);
  	var fmX = Math.ceil(xMapper(x1));
  	var toX = Math.floor(xMapper(x2));
  	var ys = [];
  	var dims = [];
  	for(var i = fmX; i <= toX; i++){
  		var dim = selectedDimensions[i];
  		dims.push(dim);
  		var rng = getRange(dim);
	  	var yMapper = d3.scaleLinear()
		  	.domain([rangeInfo.frmY,rangeInfo.toY])
		  	.range(rng);
	  	var fmY = Math.min(rangeInfo.toY,Math.max(rangeInfo.frmY,y1));
	  	var toY = Math.min(rangeInfo.toY,Math.max(rangeInfo.frmY,y2));
	  	fmY = yMapper(fmY);
	  	toY = yMapper(toY);
	  	ys.push([Math.min(fmY,toY),Math.max(fmY,toY)]);
  	}
  	
  	brush(dims,ys);
  }

  function getRange(dim){ // TODO can be much more elegant... preprocessing
  	var min = dataMin[dim], max = dataMax[dim];
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

  function angularBrush(dim1, dim2, ref, frm, to) {
    clearBrush();
    brushSpec.type = ANGULAR;
    brushSpec.angular.dim1 = dim1;
    brushSpec.angular.dim2 = dim2;
    brushSpec.angular.frm = frm;
    brushSpec.angular.to = to;
    brushSpec.angular.ref = ref;
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