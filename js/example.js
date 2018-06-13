'use strict';

const csvDataPath = 'data/cars.json';
const jsonDataPath = 'data/cars.json';

// todo: there should be defaults for these options in respParcoords
const options = {
  svgSelector: '#chart',
  minSegmentSize: 40
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
