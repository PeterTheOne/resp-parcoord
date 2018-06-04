'use strict';

function respParcoords(data, options) {
  //arrays of ids for axes and checkbuttons
  let myAxes = Object.keys(data[0]);
  myAxes.splice(0, 1); // remove name column
  myAxes = myAxes.map(value => value.substr(0, 2)); // not sure why this is needed
  const myChks = myAxes.map(value => 'chk_' + value);
  const numberDimensions = myAxes.length; //number of used properties

  const minSegmentSize = 40; // minimal default size of a segment;
  var svg, g, line;
  var unfocused;
  var focused;
  var x, y;
  var selectedDimensions;
  var dimensions;
  var variable = [];
  var breakpoint = [];
  var dragging;
  var dy = 2, dW = 0.5; //displacement for top margin; stroke width and displacement
  var titley = 2.5, titleStep = -1.5; //displacement for axes titles
  var angStep = -45; // rotation step
  var margin = {top: 20, right: 30, bottom: 5, left: 2};
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
    changed : true
    // selectedDimensions : [],
    // inverted : []
  };

  let a;

  let vbmx = 0, vbmy = 0, vbw = 100, vbh = 100;
  let vbr = vbmx + " " + vbmy + " " + vbw + " " + vbh;
  let width = vbw - vbmx;
  let height = vbh - vbmy;
  let fontSize = vbh / 30; // set font size to 1/30 th of height??

  init("35em", "50em");
  plot();
  d3.select(window).on('resize', plot);

  function init(bp1, bp2) {
    breakpoint = [bp1, bp2];

    var inv = [];

    d3.select("svg").attr("viewBox", vbr);

    x = d3.scalePoint().range([margin.left, width - margin.right]);
    y = {};
    dragging = {};
    line = d3.line();
    axis = d3.axisLeft();
    // chart setting
    svg = d3.select(options.svgSelector)
      .append("g")
      .attr("transform", "translate(" + 0 + "," + margin.top + ")");

    // Extract the list of dimensions and create a scale for each.
    selectedDimensions = "";
    x.domain(selectedDimensions = d3.keys(data[0])
      .filter(function (d) {
        return (d != "name" && d != "0-60 mph (s)") && // TODO should not be hardcoded
          (y[d] = d3.scaleLinear()
              .domain(d3.extent(data
                , function (p) {
                  return +p[d];
                }))
              .range([height - margin.top - dy, margin.bottom])
          );
      })
    );
    dimensions = selectedDimensions;

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
        console.log(d);
        dimensionSpec.hard = true;
        if(selectedDimensions.includes(d)){
          selectedDimensions.splice(selectedDimensions.indexOf(d),1);
        } else {
          selectedDimensions.push(d);
        }
        plot();

      });
    // dimensionsMenu.enter()
    //   .data(dimensions)
    //   .enter()
    //     .append("li")
    //     .text(function(d){return d;})
    //     .attr("class","chosen");
    g = svg.selectAll(".dimension");
    plot();
  }


  // Returns the path for a given data point.
  function path(d) {
    return line(
      selectedDimensions
        .map(function (p) {
          return [position(p) + dW, y[p](d[p]) + dW];
        })
    );
  }

  function position(d) {
    var v = dragging[d];
    return v == null ? x(d) : v;
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
    vbw = (widthpx / heightpx * 100);
    vbh = 100;
    vbr = vbmx + " " + vbmy + " " + vbw + " " + vbh;
    width = vbw - 0;
    height = vbh - 0;

    d3.select("svg").attr("viewBox", vbr);

    // Set breakpoints in pixels.
    var narrowpx = parseFloat(breakpoint[0]) * getBaseFontSize();
    var mediumpx = parseFloat(breakpoint[1]) * getBaseFontSize();

    // Automatic adjustment of the number of segments.
    if (!dimensionSpec.hard) { // soft adjustment
      var numberSegementsShown = Math.floor(width / minSegmentSize);
      if (numberSegementsShown < 2) numberSegementsShown = 2;
      if (numberSegementsShown > numberDimensions) numberSegementsShown = numberDimensions;
      if(selectedDimensions.length != numberSegementsShown){ // if it's the same number, don't change
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
    brushSpec.type = REGULAR;
    brushSpec.changed = true;
    var lb1 = Math.floor(Math.random() * 4) + 3;
    var ub1 = Math.floor(Math.random() * 4) + 5;
    console.log(lb1 + " " + ub1);
    brushSpec.b.cylinders = [lb1, ub1];

    var lb2 = Math.floor(Math.random() * 100) + 1;
    var ub2 = Math.floor(Math.random() * 100) + 100;
    console.log(lb2 + " " + ub2);
    brushSpec.b.power = [lb2, ub2];

    /// END OF IT ////

    if(dimensionSpec.changed){ // replot unfocused stuff
      svg.selectAll("g.unfocused").remove();

      // Add gray foreground lines; thickness in css.
      unfocused = svg.append("g")
        .attr("class", "unfocused")
        .selectAll("path")
        .data(data)
        .enter().append("path")
        .attr("d", path);

        // IMPORTANT: should not include 'dimensionSpec.changed = false;' here,
        // the next if-body takes care of it
    }

    if(dimensionSpec.changed || brushSpec.changed){
      svg.selectAll("g.focused").remove();

      // Add blue focused foreground lines; thickness in css.
      focused = svg.append("g") // can we make the text always on top?
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
      svg.selectAll("g.dimension").remove();
      svg.selectAll("g.axis").remove();
      svg.selectAll("text").remove();

      // Add a group elements for each dimension.
      g = svg.selectAll(".dimension")
        .data(selectedDimensions)
        .enter().append("g")
        .attr("class", "dimension")
        .attr("id", function (d, i) {
          return d.slice(0, 2);
        })
      // Add an axis and title; d3 v4 requires filling the title.
      a = g.append("g")
        .attr("class", "axis")
        .each(function (d) {
          d3.select(this)
            .call(
              axis.scale(y[d])
                .tickSize("1.5")
                .tickPadding("1.5")
            );
        })
        .append("text")
        .attr("class", "title")
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .attr("y", titley)
        .text(function (d) {
          return d;
        });

      fontSize = vbh / 30; // set font size to 1/30 th of height??

      svg.selectAll(".axis")
        .attr("font-size", fontSize)
        .attr("stroke-width", dW);

      dimensionSpec.changed = false;
      brushSpec.changed = false;
    }


    var anchort = "start", brp;
    if (widthpx > mediumpx) {
      brp = 0;
      anchort = "middle"
    }
    else if (widthpx > narrowpx) brp = 1;
    else brp = 2;
    var anglet = brp * angStep; // rotating the text
    var dxt = brp * (titleStep);
    var dyt = brp * (titleStep);

    x.range([margin.left, width - margin.right]);
    g.attr("transform", function (d) {
      if (x(d)) return "translate(" + x(d) + ")";
    });
    unfocused.attr("d", path);
    focused.attr("d", path);
    a.style("text-anchor", anchort);
    a.attr("transform", "rotate(" + anglet + ")");
    a.attr("dy", dyt);
    a.attr("dx", dxt);
  }

  function showMenu(){
    dimensionsMenu.selectAll("li")
    .attr("class",function(d){
      return selectedDimensions.includes(d) ? "chosen" : "unchosen";
    });
  }

  function show(element) {
    variable = [];
    let ids = '#' + element.id;
    if (element.checked) {
      for (let i in myChks) {
        if (myChks[i] == element.id) {
          document.getElementById(myAxes[i]).removeAttribute("style");
          hid[myAxes[i]] = 0;
        }
      }
    }
    else {
      for (let i in myChks) {
        if (myChks[i] == element.id) {
          d3.select("#" + myAxes[i]).style("display", "none");
          hid[myAxes[i]] = 1;
        }
      }
    }

    for (let i = 0; i < myChks.length; i++) {
      var elt = document.getElementById(myChks[i]);
      //if (elt.checked) {variable.push(elt.value);}
      variable.push(elt.value);
    }
    selectedDimensions = dimensions.filter(function (d, i) {
      if (variable.indexOf(d) > -1) return d;
    });
    x.domain(selectedDimensions);

    var widthpx = parseInt(d3.select(options.svgSelector).style("width")),
      heightpx = parseInt(d3.select(options.svgSelector).style("height"));
    var width = (widthpx / heightpx * 100);

    x.range([margin.left, width - margin.right], 2);
    g.attr("transform", function (d) {
      if (x(d)) return "translate(" + x(d) + ")";
    })
    unfocused.attr("d", path);
    focused.attr("d", path);
  }


  function showDimension(dimension) {
    selectedDimensions.append(dimension);
    dimensionSpec.changed = true;
    plot();
  }

  function hideDimension(dimension) {
    selectedDimensions.remove(dimension);
    dimensionSpec.changed = true;
    plot();
  }

  function brush(dims, frm, to) {
    clearBrush();
    brushSpec.type = REGULAR;
    for (var i in dims)
      brushSpec.b[i] = [frm[i], to[i]];
    brushSpec.changed = true;
    plot();
  }

  function angularBrush(dim1, dim2, frm, to) {
    clearBrush();
    brushSpec.type = ANGULAR;
    brushSpec.angular.dim = [dim1, dim2];
    brushSpec.angular.range = [frm, to];
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
