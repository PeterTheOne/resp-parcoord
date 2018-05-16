var props=[];
var cars=[];

// Parse the html table
var rows=document.getElementsByTagName("tr");
var head=rows[0].innerHTML.split("<th>");
for (i=1;i<head.length;i++){
  props.push(head[i].replace("</th>",""))
}
for (i=1;i<rows.length; i++){
  aRow=rows[i].innerHTML.split("<td>");
  aCar={};
  for (j=1;j<aRow.length;j++){
    aCar[props[j-1]]=aRow[j].replace("</td>", "").replace("&amp;","&").replace("&nbsp;","");
  }
  cars.push(aCar);
}
// Move the dimensions selection dialog
var isDown=false, offset=[0,0], loffset;
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
function mouseUp() {window.removeEventListener('mousemove', mouseMove, true);div.classList.remove("move");}
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

//arrays of ids for axes and checkbuttons
var myAxes=["ec", "cy", "di", "po", "we", "ye"];
var myChks=["chk_eco", "chk_cyl", "chk_disp", "chk_pow", "chk_wei", "chk_year"];
for (i in myChks) {document.getElementById(myChks[i]).checked = true;}

var dim=props.length-1; //number of used properties (name is excluded)
var mysdim=40; // minimal default size of a segment;
var svg, g, line;
var foreground;
var x,y;
var selectedDimensions;
var dimension;
var variable=[];
var breakpoint=[];
var dragging;
var dy=2, dW=0.5; //displacement for top margin; stroke width and displacement
var titley=2.5, titleStep=-1.5; //displacement for axes titles
var angStep=-45; // rotation step
var margin = {top:20, right: 30, bottom: 5, left: 2};



paralelCoordinates("35em", "50em")
resize();
d3.select(window).on('resize', resize);


function paralelCoordinates(bp1, bp2){
  breakpoint=[bp1, bp2];

  var vbmxI = 0, vbmyI = 0, vbwI = 100, vbhI = 100;
  var vbr=vbmxI + " " + vbmyI + " " + vbwI + " " + vbhI;
  var width = vbwI - vbmxI;
  var height = vbhI - vbmyI;
  var fontSize = vbhI / 30; // set font size to 1/30 th of height??

  d3.select("svg").attr("viewBox", vbr);

  x = d3.scalePoint().range([margin.left, width - margin.right]);
  y = {};
  dragging = {};
  line = d3.line();
  axis = d3.axisLeft();
  // chart setting
  svg = d3.select("#chart")
    .append("g")
    .attr("transform", "translate(" + 0 + "," + margin.top + ")");

  // Extract the list of dimensions and create a scale for each.
  selectedDimensions="";
  x.domain(selectedDimensions = d3.keys(cars[0])
    .filter(function(d) {
      return (d != "name" && d!="0-60 mph (s)") && (
        y[d] = d3.scaleLinear()
          .domain(d3.extent(cars, function(p) { return +p[d]; }))
          .range([height-margin.top-dy, margin.bottom]));
    })
  );
  dimension=selectedDimensions;

  // Add blue foreground lines; thickness in css.
  foreground = svg.append("g")
    .attr("class", "foreground")
    .selectAll("path")
    .data(cars)
    .enter().append("path")
    .attr("d", path)

  // Add a group element for each dimension.
  g = svg.selectAll(".dimension")
    .data(selectedDimensions)
    .enter().append("g")
    .attr("class", "dimension")
    .attr("id", function(d,i){return d.slice(0,2);})

  // Add an axis and title; d3 v4 requires filling the title.
  a=g.append("g")
    .attr("class", "axis")
    .each(function(d) {d3.select(this).call(axis.scale(y[d]).tickSize("1.5").tickPadding("1.5")); })
    .append("text")
    .attr("class", "title")
    .attr("fill", "black")
    .style("text-anchor", "middle")
    .attr("y",titley)
    .text(function(d) {return d;});

  svg.selectAll(".axis")
    .attr("font-size", fontSize)
    .attr("stroke-width", dW);
}


// Returns the path for a given data point.
function path(d) {
  return line(selectedDimensions.map(function(p) { return [position(p)+dW, y[p](d[p])+dW]; }));
}

function position(d) {
  var v = dragging[d];
  return v == null ? x(d) : v;
}

function getBaseFontSize(){
  return (parseFloat(getComputedStyle(document.documentElement).fontSize));
}

// resize function
function resize() {
  // set the view box for the chart
  var widthpx = parseInt(d3.select("#chart").style("width")) ,
    heightpx = parseInt(d3.select("#chart").style("height")) ;

  var vbmx = -15, vbmy = 0;
  vbw = (widthpx/heightpx*100);
  vbh = 100;
  var vbr = vbmx + " " + vbmy + " " + vbw + " " + vbh;

  var width = vbw - 0;
  var height = vbh - 0;
  d3.select("svg").attr("viewBox", vbr);

  // Set breakpoints in pixels.
  var narrowpx=parseFloat(breakpoint[0])*getBaseFontSize();
  var mediumpx=parseFloat(breakpoint[1])*getBaseFontSize();

  // Automatic adjustment of the number of segments.
  if (variable.length==0){
    var nrSeg=Math.floor(width/mysdim);
    if (nrSeg<2) nrSeg=2;
    if (nrSeg>dim) nrSeg=dim;
    selectedDimensions=[];

    var elements=document.getElementsByClassName("dimension");
    for (i=0;i<elements.length;i++) {elements[i].removeAttribute("style");}
    for (i=0;i<nrSeg;i++){
      selectedDimensions.push(dimension[i]);
      g.data(selectedDimensions);
      x.domain(selectedDimensions);
      document.getElementById(myChks[i]).checked=true;
    }
    for (i=nrSeg;i<dim;i++){
      d3.select("#"+myAxes[i]).style("display","none");
      document.getElementById(myChks[i]).checked=false;
    }
    if (nrSeg<dim){
      document.getElementById("btn").removeAttribute("class");
    }
    else {
      document.getElementById("btn").setAttribute("class", "hide");
    }
  }
  var anchort="start", brp;
  if (widthpx>mediumpx) {brp=0;anchort="middle"}
  else if (widthpx>narrowpx) brp=1;
  else brp=2;
  var anglet=brp*angStep;
  var dxt=brp*(titleStep);
  var dyt=brp*(titleStep);

  x.range([margin.left, width-margin.right]);
  g.attr("transform", function(d) {if (x(d)) return "translate(" + x(d) + ")"; })
  foreground.attr("d", path)
  a.style("text-anchor", anchort);
  a.attr("transform", "rotate("+anglet+")")
  a.attr("dy", dyt)
  a.attr("dx", dxt);
}

function show(element){
  variable=[]
  ids='#'+element.id
  if(element.checked){
    for (i in myChks) {
      if (myChks[i] == element.id) {
        document.getElementById(myAxes[i]).removeAttribute("style");
      }
    }
  }
  else{
    for (i in myChks) {
      if (myChks[i] == element.id) {
        d3.select("#"+myAxes[i]).style("display", "none");
      }
    }
  }

  for (i=0;i<myChks.length;i++){
    var elt=document.getElementById(myChks[i]);
    if (elt.checked) {variable.push(elt.value);}
  }
  selectedDimensions=dimension.filter(function(d,i){if(variable.indexOf(d)>-1) return d;})
  x.domain(selectedDimensions);

  var widthpx = parseInt(d3.select("#chart").style("width")) ,
    heightpx = parseInt(d3.select("#chart").style("height")) ;
  var width = (widthpx/heightpx*100);

  x.range([margin.left, width-margin.right], 2);
  g.attr("transform", function(d) { if (x(d)) return "translate(" + x(d) + ")";})
  foreground.attr("d", path);
}
