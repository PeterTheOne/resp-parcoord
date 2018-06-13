'use strict';

const csvDataPath = 'data/cars.json';
const jsonDataPath = 'data/cars.json';

const options = {
  svgSelector: '#chart',
};

async function init() {
  //const data = await d3.csv(csvDataPath);
  const data = await d3.json(jsonDataPath);
  respParcoords(data, options);

  // touchevents
  startup()
}

// wait until website is loaded
window.addEventListener('load', function() {
  init();
});
