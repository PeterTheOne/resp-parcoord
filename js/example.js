'use strict';

const csvDataPath = 'data/cars.json';
const jsonDataPath = 'data/cars.json';

const options = {
  // none, means that defaults are used.
  ignoreDimensions: [
    'name'
  ]
};

async function init() {
  //const data = await d3.csv(csvDataPath);
  const data = await d3.json(jsonDataPath);
  respParcoords(data, options);
}

// wait until website is loaded
window.addEventListener('load', function() {
  init();
});
