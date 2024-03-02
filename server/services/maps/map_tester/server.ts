import express from 'express';
import * as path from 'path';
import GameModel from '../../../db/models/Game';
import { plot, PlotType } from 'nodeplotlib';
import * as math from 'mathjs';
//import all from ../circular.ts
import { Game } from '../../types/Game';
import containerLoader from '../../../services';
import config from '../../../config';
import { array } from 'joi';
const app = express();
const port = Number(process.env.PORT ?? 12121);
const host = process.env.HOST ?? '0.0.0.0';
console.log(`Starting server at http://${host}:${port}`);
const container = containerLoader(config, null);
// Serve static files from 'public' directory
//Serve all files in the public directory 
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/map', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'map_testing.html'));
});


app.get('/sim', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sim.html'));
});


function flatten_complex_stars(locations) {
  let stars = locations.stars;
  let home_stars = locations.homeStars;
  //Make a list of stars
  const flat_stars: any[] = [];
  stars.forEach(element => {
    //console.log(element);
    delete element.location.closestReachable;
    //Check if element.id is in home_stars ids
    if(home_stars.includes(element._id)){
      element.is_home=true;
    } else{
      element.is_home=false;
    }
    flat_stars.push(element);
  });
  return flat_stars;

}

//Async function for location gathering
async function get_location() {
  const settings = require('../../../config/game/settings/official/32player.json');
  let game = new GameModel({
    settings
  }) as Game;
  game.settings.galaxy.galaxyType = 'polar';
  let resourceDistribution = 'balanced';
  let playerCount = 40;
  let starCount = playerCount*20;
  let locations = container.mapService.generateStars(game, starCount, playerCount);
  return {'stars': flatten_complex_stars(locations)};
}
//Endpoint to get locations
app.get('/locations', async (req, res) => {
  let locations = await get_location();
  res.json(locations);
});


function find_contested(stars) {
  const is_contested = (distanceA, distanceB) => Math.floor(distanceA) != Math.floor(distanceB);
  //get distances between each star
  let any_contested = false;
  let distances = [];
  for (let i = 0; i < stars.length; i++) {
    for (let j = 0; j < stars.length; j++) {
      if (i !== j) {
        //Absolute distance
        let dx = stars[i].location.x - stars[j].location.x;
        let dy = stars[i].location.y - stars[j].location.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        //Relative distance
        dx = (stars[i].location.x - stars[i].location.x) - (stars[j].location.x - stars[i].location.x);
        dy = (stars[i].location.y - stars[i].location.y) - (stars[j].location.y - stars[i].location.y);
        let relative_distance = Math.sqrt(dx * dx + dy * dy);

        if (is_contested(distance, relative_distance)) {
          console.log('Star', stars[i].id, 'is contested by', stars[j].id);
          any_contested = true;
        }
      }
    }
  }
  if (!any_contested) {
    console.log('No stars are contested');
  }
  return any_contested;
}

app.get('/simulate', async (req, res) => {
  let response = await get_location();
  let stars = response.stars;
  //log if stars are contested
  let contested = find_contested(stars);
  console.log(contested);
  res.json({ 'contested': contested });
});



const isFloatError = (lenA: number, lenB: number): boolean => {
  return Math.floor(lenA) !== Math.floor(lenB);
};
const getVec = (scale: number = 100): [number, number] => {
  return [Math.random() * (2 * scale + 1) - scale,
          Math.random() * (2 * scale + 1) - scale];
};

const norm = (vec: [number, number]): number => {
  return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);
};

const get_relative_distance = (vecA: [number, number], vecB: [number, number]) => {
  let t = [vecA[0],vecA[1]] as [number, number];
  t[0] -= vecA[0];
  t[1] -= vecA[1];
  t[0] -= vecB[0];
  t[1] -= vecB[1];
  t[0] += vecA[0];
  t[1] += vecA[1];
  return norm(t);
}
const testFloatError = (scale: number = 100, N: number = 1000): { errors: number[] } => {
  let errors: number[] = [];
  for (let i = 0; i < N; i++) {
    const v = getVec(scale);
    const w = getVec(scale);
    let distance = norm([v[0] - w[0], v[1] - w[1]]);
    let relativeDistance = get_relative_distance(v, w);
    errors.push(Math.abs(distance - relativeDistance));
    let count = 0
    while (distance > 10 && count < 1000){
      //translate w to be 10 units closer to v
      let dx = w[0] - v[0];
      let dy = w[1] - v[1];
      let d = norm([dx,dy]);
      dx = dx/d;
      dy = dy/d;
      w[0] -= dx;
      w[1] -= dy;
      distance = norm([v[0] - w[0], v[1] - w[1]]);
      relativeDistance = get_relative_distance(v, w);
      errors.push(Math.abs(distance - relativeDistance));
      count += 1;
    }
  }
  return { 'errors': errors };
};



app.get('/plot', (req, res) => {
  const x: number[] = [];
  const y: number[] = [];
  for (let scale = 1; scale < 10; scale++) {
    for (let c = 0; c < 10; c++) {
      console.log(`Simulating scale: ${Math.pow(10, scale)}ly, iteration: ${c} with N: ${Math.pow(10, 9)}`)
      const N = Math.pow(10, 6);
      //const N = 1;
      const { errors } = testFloatError(Math.pow(10, scale), N);
      x.push(Math.pow(10, scale));
      let sum_errors = errors.reduce((a, b) => a + b, 0);
      y.push(sum_errors);
      console.log(`Scale: 10^${scale}, Errors: ${sum_errors}, N: ${N}`);
    }
  }

  const data = [{ x, y, type: 'scatter' as PlotType, mode: 'markers' as const }];
  plot(data);
  res.send('Plot generated. Check your console.');
});



// Start Server
app.listen(port, host, () => {
  console.log(`Server listening at http://${host}:${port}`);
});

