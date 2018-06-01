'use strict';

function respParcoords(data, options) {
  const props = Object.keys(data[0]);


  // weird modal stuff
  /*
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
  */

  //arrays of ids for axes and checkbuttons
  // todo: replace these with something dynamic
  var myAxes = ["ec", "cy", "di", "po", "we", "ye"];
  var myChks = ["chk_eco", "chk_cyl", "chk_disp", "chk_pow", "chk_wei", "chk_year"];
  //for (i in myChks) {document.getElementById(myChks[i]).checked = true;}

  // end of: weird modal stuff

  var dim = props.length - 1; //number of used properties (name is excluded)
  var mysdim = 40; // minimal default size of a segment;
  var svg, g, line;
  var foreground;
  var focused;
  var x, y;
  var selectedDimensions;
  var dimension;
  var variable = [];
  var breakpoint = [];
  var dragging;
  var dy = 2, dW = 0.5; //displacement for top margin; stroke width and displacement
  var titley = 2.5, titleStep = -1.5; //displacement for axes titles
  var angStep = -45; // rotation step
  var margin = {top: 20, right: 30, bottom: 5, left: 2};


  var NONE = "NONE", ANGULAR = "ANGULAR", REGULAR = "REGULAR";
  var brushSpec = {
    type: NONE,
    b: [],
    angular: {
      dim1: undefined,
      dim2: undefined,
      frm: undefined,
      to: undefined
    }
  };

  let a;


  parallelCoordinates("35em", "50em");
  plot();
  d3.select(window).on('resize', plot);


  var vbmxI = 0, vbmyI = 0, vbwI = 100, vbhI = 100;
  var vbr = vbmxI + " " + vbmyI + " " + vbwI + " " + vbhI;
  var width = vbwI - vbmxI;
  var height = vbhI - vbmyI;


  function parallelCoordinates(bp1, bp2) {
    breakpoint = [bp1, bp2];

    var inv = [];
    var vbmxI = 0, vbmyI = 0, vbwI = 100, vbhI = 100;
    var vbr = vbmxI + " " + vbmyI + " " + vbwI + " " + vbhI;
    var width = vbwI - vbmxI;
    var height = vbhI - vbmyI;

    var fontSize = vbhI / 30; // set font size to 1/30 th of height??

    d3.select("svg").attr("viewBox", vbr);

    x = d3.scalePoint().range([margin.left, width - margin.right]);
    y = {};
    dragging = {};
    line = d3.line();
    let axis = d3.axisLeft();
    // chart setting
    svg = d3.select(options.svgSelector)
      .append("g")
      .attr("transform", "translate(" + 0 + "," + margin.top + ")");
    // for(k in d3.keys(data[0])){
    //   inv[d3.keys(data[0])[k]] = 0;
    //   hid[d3.keys(data[0])[k]] = 0;
    // }
    // Extract the list of dimensions and create a scale for each.
    selectedDimensions = "";
    x.domain(selectedDimensions = d3.keys(data[0])
      .filter(function (d) {
        return (d != "name" && d != "0-60 mph (s)") &&
          (y[d] = d3.scaleLinear()
              .domain(d3.extent(data
                , function (p) {
                  return +p[d];
                }))
              .range([height - margin.top - dy, margin.bottom])
          );
      })
    );
    dimension = selectedDimensions;


    // Add gray foreground lines; thickness in css.
    foreground = svg.append("g")
      .attr("class", "foreground")
      .selectAll("path")
      .data(data)
      .enter().append("path")
      .attr("d", path);

    // Add a group element for each dimension.
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

    var vbmxI = 0, vbmyI = 0, vbwI = 100, vbhI = 100;
    var vbr = vbmxI + " " + vbmyI + " " + vbwI + " " + vbhI;
    var width = vbwI - vbmxI;
    var height = vbhI - vbmyI;

    var fontSize = vbhI / 30; // set font size to 1/30 th of height??

    svg.selectAll(".axis")
      .attr("font-size", fontSize)
      .attr("stroke-width", dW);


    // set the view box for the chart
    var widthpx = parseInt(d3.select(options.svgSelector).style("width")),
      heightpx = parseInt(d3.select(options.svgSelector).style("height"));

    var vbmx = -15, vbmy = 0;
    let vbw = (widthpx / heightpx * 100);
    let vbh = 100;
    var vbr = vbmx + " " + vbmy + " " + vbw + " " + vbh;

    var width = vbw - 0;
    var height = vbh - 0;
    d3.select("svg").attr("viewBox", vbr);

    // Set breakpoints in pixels.
    var narrowpx = parseFloat(breakpoint[0]) * getBaseFontSize();
    var mediumpx = parseFloat(breakpoint[1]) * getBaseFontSize();

    // Automatic adjustment of the number of segments.
    if (variable.length == 0) { // soft adjustment
      var nrSeg = Math.floor(width / mysdim);
      if (nrSeg < 2) nrSeg = 2;
      if (nrSeg > dim) nrSeg = dim;
      selectedDimensions = [];
      var elements = document.getElementsByClassName("dimension");
      for (let i = 0; i < elements.length; i++) {
        elements[i].removeAttribute("style");
      }
      for (let i = 0; i < nrSeg; i++) {
        selectedDimensions.push(dimension[i]);
        g.data(selectedDimensions);
        x.domain(selectedDimensions);
        //document.getElementById(myChks[i]).checked=true;
      }
      for (let i = nrSeg; i < dim; i++) {
        d3.select("#" + myAxes[i]).style("display", "none");
        //document.getElementById(myChks[i]).checked=false;
      }

      /*if (nrSeg<dim){ // show or hide 'Dimensions' button
        document.getElementById("btn").removeAttribute("class");
      }
      else {
        document.getElementById("btn").setAttribute("class", "hide");
      }*/
    } else { // if dimensions are chosen
      // TODO override whatever 'show(element)' method does
    }

    svg.selectAll("g.focused").remove();


    /// snippet only for testing regular brush ////
    brushSpec.type = REGULAR;
    var lb1 = Math.floor(Math.random() * 4) + 3;
    var ub1 = Math.floor(Math.random() * 4) + 5;
    console.log(lb1 + " " + ub1);
    brushSpec.b.cylinders = [lb1, ub1];

    var lb2 = Math.floor(Math.random() * 100) + 1;
    var ub2 = Math.floor(Math.random() * 100) + 100;
    console.log(lb2 + " " + ub2);
    brushSpec.b.power = [lb2, ub2];

    /// END OF IT ////


    // Add blue focused foreground lines; thickness in css.
    focused = svg.append("g") // can we make the text always on top?
    // also a better solution could be to change the css class
    // of certain elements from foreground to focused
      .attr("class", "focused")
      .selectAll("path")
      .data(data
        .filter(function (p) {
          //return lb <= p.cylinders && p.cylinders <= ub; // only a dummy filter
          //console.log(brushSpec.type);
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
    foreground.attr("d", path);
    focused.attr("d", path);
    a.style("text-anchor", anchort);
    a.attr("transform", "rotate(" + anglet + ")");
    a.attr("dy", dyt);
    a.attr("dx", dxt);
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
    selectedDimensions = dimension.filter(function (d, i) {
      if (variable.indexOf(d) > -1) return d;
    })
    x.domain(selectedDimensions);

    var widthpx = parseInt(d3.select(options.svgSelector).style("width")),
      heightpx = parseInt(d3.select(options.svgSelector).style("height"));
    var width = (widthpx / heightpx * 100);

    x.range([margin.left, width - margin.right], 2);
    g.attr("transform", function (d) {
      if (x(d)) return "translate(" + x(d) + ")";
    })
    foreground.attr("d", path);
    focused.attr("d", path);
  }


  function showDimension(dimension) {
    selectedDimensions.append(dimension);
    plot();
  }

  function hideDimension(dimension) {
    selectedDimensions.remove(dimension);
    plot();
  }

  function brush(dims, frm, to) {
    clearBrush();
    brushSpec.type = REGULAR;
    for (var i in dims)
      brushSpec.b[i] = [frm[i], to[i]];
    plot();
  }

  function angularBrush(dim1, dim2, frm, to) {
    clearBrush();
    brushSpec.type = ANGULAR;
    brushSpec.angular.dim = [dim1, dim2];
    brushSpec.angular.range = [frm, to];
    plot();
  }

  function clearBrush() {
    for (var i in brushSpec.b)
      brushSpec.b[i] = -1;
    brushSpec.type = NONE;
    plot();
  }
}
