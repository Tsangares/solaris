const randomSeeded = require('random-seed');
//const simplexNoise = require('simplex-noise'); //Depricated
import { createNoise2D } from 'simplex-noise'; //Notes on change: https://www.npmjs.com/package/simplex-noise
import alea from 'alea';
import ValidationError from '../../errors/validation';
import { GameResourceDistribution } from '../types/Game';
import { Location } from '../types/Location';
import DistanceService from '../distance';
import GameTypeService from '../gameType';
import RandomService from '../random';
import ResourceService from '../resource';
import StarService from '../star';
import StarDistanceService from '../starDistance';

export default class PolarMapService {

    randomService: RandomService;
    starService: StarService;
    starDistanceService: StarDistanceService;
    distanceService: DistanceService;
    resourceService: ResourceService;
    gameTypeService: GameTypeService;

    constructor(
        randomService: RandomService,
        starService: StarService,
        starDistanceService: StarDistanceService,
        distanceService: DistanceService,
        resourceService: ResourceService,
        gameTypeService: GameTypeService) {
        this.randomService = randomService;
        this.starService = starService;
        this.starDistanceService = starDistanceService;
        this.distanceService = distanceService;
        this.resourceService = resourceService;
        this.gameTypeService = gameTypeService;
    }
    
    //TODO this is generator agnostic and could be on a base class or service
    _moveLocationTowards(location: Location, towards: Location, minDistance: number) {
        let dx = towards.x - location.x;
        let dy = towards.y - location.y;
        let dist = this.distanceService.getDistanceBetweenLocations(location, towards);
        if (dist < minDistance) { return; }
        let amount = 1.0-(minDistance/dist);
        location.x += dx*amount;
        location.y += dy*amount;
    }

    //TODO this is generator agnostic and could be on a base class or service
    _removeLocationFromArray(array, location) {
        let index = array.indexOf(location);
        array.splice(index, 1);
    }


    //TODO this is generator agnostic and could be on a base class or service
    _rotatedLocation(location: Location, angle: number) {
        return {
          x: Math.cos(angle)*location.x + Math.sin(angle)*location.y,
          y: Math.sin(angle)*-location.x + Math.cos(angle)*location.y
        };
    }

    
    //TODO this is generator agnostic and could be on a base class or service
    _displacedLocation(location1: Location, location2: Location) {
        return {
            x: location1.x + location2.x,
            y: location1.y + location2.y,
        };
    }

    // get how many rings of stars will be necessary to have at least starPerPlayerMin stars per player
    // then try to use as many rings as possible without going over starPerPlayerMax amount of stars per player
    _getRingCount(starsPerPlayerMin: number, starsPerPlayerMax: number) {
      let ringCount = this._getNecessaryRingCount(starsPerPlayerMin) + 1
      while(this._getStarCountInRings(ringCount)<starsPerPlayerMax) {
        ringCount += 1 
      }
      return ringCount-1 // -1 since the current count is actually 1 above
    }

    // get how many stars per player will be generated by using ringCount number of rings
    _getStarCountInRings(ringCount: number) {
        let starCount = 0;
        let ringIndex = 0;
        let lastRingPruning = 0;
        while(ringIndex<ringCount) {
            starCount += lastRingPruning; // refill the last ring with the pruned stars since this ring is no longer the last one
            starCount += 6+(ringIndex*6); // each ring on a hexagonal grid will have this amount of stars, this is not tweakable
            // last ring(outer ring) will actually have less stars. this is to ensure a perfect hexagonal tiling withouth any stars overlapping, values are not tweakable
            lastRingPruning = 4 + ( (ringIndex*6)/2 );
            starCount -= lastRingPruning;
            ringIndex += 1;
        }
        return starCount;
    }

    // get how many rings of stars  will be necessary to have at least starsPerPlayer stars generated per player
    _getNecessaryRingCount(starsPerPlayer: number) {
        let starCount = 0;
        let ringIndex = 0;
        let lastRingPruning = 0;
        while(starCount<starsPerPlayer) {
            starCount += lastRingPruning;
            starCount += 6+(ringIndex*6);
            lastRingPruning = 4 + ( (ringIndex*6)/2 );
            starCount -= lastRingPruning;
            ringIndex += 1;
        }
        return ringIndex;
    }

    _generateHomeLocations(pivotDistance: number, playerCount: number, rng, simplexNoiseGenerator, noiseSpread: number) {
        const ONE_SIXTH = 1.0/6.0;
        const TAU = 2.0*Math.PI;

        let homeLocations: Location[] = [];
        let firstLocation = { 
            x: 0.0,
            y: 0.0
        };

        homeLocations.push(firstLocation);

        while(homeLocations.length<playerCount) {
            let position;
            let positionIsValid = false;
            let attempts = 0;
            while(!positionIsValid) {
                let baseLocation = homeLocations[rng.range(homeLocations.length)];
                let pivot = { x: pivotDistance, y: 0.0 };
                let pivotRotation = ONE_SIXTH*TAU * rng.range(6);
                pivot = this._rotatedLocation(pivot, pivotRotation);
                pivot = this._displacedLocation(baseLocation, pivot);
                
                position = { x: pivotDistance, y: 0.0 };
                let rotation;
                if(rng.random()<0.5) {
                    rotation = pivotRotation - (ONE_SIXTH*TAU);
                }
                else{
                    rotation = pivotRotation + (ONE_SIXTH*TAU);
                }
                position = this._rotatedLocation(position, rotation);
                position = this._displacedLocation(position, pivot);
                position.noiseIntensity = simplexNoiseGenerator(position.x/noiseSpread, position.y/noiseSpread);

                positionIsValid = true;
                for( let homeLocation of homeLocations ) {
                    if( this.distanceService.getDistanceBetweenLocations(position, homeLocation) < pivotDistance ) {
                        positionIsValid = false;
                        break;
                    }
                    if( (position.noiseIntensity>0.65 ) && (attempts<6) ) { 
                        positionIsValid = false;
                        attempts += 1;
                        break;
                    }
                }
            }
            homeLocations.push(position);
        }
        
        return homeLocations;
    }

    _generateSupplementaryHomeLocations(pivotDistance: number, homeLocations: Location[]) {
        const ONE_SIXTH = 1.0/6.0;
        const TAU = 2.0*Math.PI;

        let supplementaryHomeLocations: Location[] = [];

        for( let homeLocation of homeLocations ) {
            for(let i = 0; i<6; i++) {
                let pivot = { x: pivotDistance, y: 0.0 };
                let pivotRotation = ONE_SIXTH*TAU * i;
                pivot = this._rotatedLocation(pivot, pivotRotation);
                pivot = this._displacedLocation(homeLocation, pivot);

                let position = { x: pivotDistance, y: 0.0 };
                let rotation = (ONE_SIXTH*TAU) * (i+1)
                position = this._rotatedLocation(position, rotation);
                position = this._displacedLocation(pivot, position);
                
                let isValidPosiiton = true;
                for( let homeLocation of homeLocations ) {
                    if(this.distanceService.getDistanceBetweenLocations(homeLocation, position) < pivotDistance) {
                        isValidPosiiton = false;
                    }
                }
                for( let supplementaryHomeLocation of supplementaryHomeLocations ) {
                    if(this.distanceService.getDistanceBetweenLocations(supplementaryHomeLocation, position) < pivotDistance) {
                        isValidPosiiton = false;
                    }
                }
                if(isValidPosiiton) {
                    supplementaryHomeLocations.push( position );
                }
            }
        }
        return supplementaryHomeLocations;
    }
    
    //populates the given `locations` array with new locations around the `baseLocation`
    //locations are created in hexagonal rings around the base locations, respecting a triangular grid
    _generateConcentricHexRingsLocations(baseLocation: Location, ringCount: number, distance: number, locations: Location[]) {
        const ONE_SIXTH = 1.0/6.0;
        const TAU = 2.0*Math.PI;
        
        for(let ringIndex = 0; ringIndex < ringCount; ringIndex++) {
            for(let sliceIndex = 0; sliceIndex < 6; sliceIndex++) {
                if( (ringIndex==(ringCount-1))&&(sliceIndex<3) ) { continue; } //only create the first 3 edges of the outer ring

                let position = { x: distance+(distance*ringIndex), y: 0.0 };
                let rotation = sliceIndex * ONE_SIXTH*TAU;
                position = this._rotatedLocation(position, rotation);
                position = this._displacedLocation(baseLocation, position);

                if( (ringIndex!=(ringCount-1))||(sliceIndex==3)||(sliceIndex==4) ) {
                    //only add 2 of the corner stars for the last ring
                    locations.push(position);
                }

                for(let i = 0; i < ringIndex; i++ ) {
                    let edgePosition = { x: distance*(i+1), y: 0.0 };
                    let edgeRotation = (sliceIndex+2) * (ONE_SIXTH*TAU);
                    edgePosition = this._rotatedLocation(edgePosition, edgeRotation);
                    edgePosition = this._displacedLocation(position, edgePosition);
                    locations.push(edgePosition);
                }
            }
        }
    }

    _randomlyDislocateLocations(locations: Location[], threshold: number, rng) {
        const ONE_SIXTH = 1.0/6.0;
        const TAU = 2.0*Math.PI;
        for( let location of locations ) {
            let amount = (3.0*(threshold/4.0)) + ((rng.random()*threshold)/4.0); // 0.75 to 1.0 times the threshold
            let rotation = rng.random()*TAU
            let dislocation = { x: amount, y: 0.0 };
            dislocation = this._rotatedLocation(dislocation, rotation);
            let newLocation = this._displacedLocation(location, dislocation);
            //cant set location directly
            location.x = newLocation.x;
            location.y = newLocation.y;
        }
    }

    _pruneLocationsWithNoise(locations: Location[], desiredLocationCount: number, simplexNoiseGenerator, noiseSpread: number) {
        for( let location of locations ) {
            (location as any).noiseIntensity = simplexNoiseGenerator(location.x/noiseSpread, location.y/noiseSpread);
        }
        locations.sort( (loc1, loc2) => {
            return ((loc1 as any).noiseIntensity-(loc2 as any).noiseIntensity);
        });
        locations.splice(desiredLocationCount);
    }

    //removes locations outside the metaball composed of home locations
    //locations have a chance of beeing removed based on the distance from the metaball
    _pruneLocationsOutsideMetaball(locations: Location[], homeLocations: Location[], homeStarRadius: number, rng) {
        const METABALL_FALLOFF = 8.0; //higher values reduces the spread of the metaball
        // probably better not to remove items while iterating, so add to this array instead
        let toRemove: Location[] = [];
        for( let location of locations ) {
            let metaballFieldIntensity = 0;
            for( let homeLocation of homeLocations ) {
                let distance = this.distanceService.getDistanceBetweenLocations(homeLocation, location);
                distance = homeStarRadius/distance;
                metaballFieldIntensity += Math.pow(distance, METABALL_FALLOFF);
            }
            let chanceToRemove = 1.0-metaballFieldIntensity;
            if(rng.random()<chanceToRemove) {
                toRemove.push(location);
            }
        }
        for( let location of toRemove ) {
            this._removeLocationFromArray(locations, location);
        }

    }

    //Type of polar 
    get_foil(stars:number = 30): Location[]{
        //Equations lambda x: 1+ np.cos(x/2 + x/3)*np.sin(x/2 + x/3)
        
        //Domain is 0 to 2pi
        const get_r = (theta) =>{
            return 1 + Math.cos(5*theta/6)*Math.sin(5*theta/6);
        }
        let locations: Location[] = [];
        let domain = 6*Math.PI;
        //Loop through numbers between 0 and 2pi based on number of stars
        for (let theta = 0; theta < domain; theta += domain/stars){
            locations.push({
                x: 1000*get_r(theta)*Math.cos(theta)-500,
                y: 1000*get_r(theta)*Math.sin(theta)-500
            } as Location);
        }
        return locations;

    }
    //Randomized function to return a gaussian point given mean mu and standard deviation std
    _gaussian(mu,std){
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return z*std + mu;
    }
    //Gaussian for a 2D point centered at x,y
    _gaussian_point(x,y,std){
        return {x: this._gaussian(x,std), y: this._gaussian(y,std)};
    }

    get_gaussian_foil(players:number, stars:number, std:number = 100, avoid_locations:Location[] = []): Location[]{
        const LIMIT_DIST = 50;
        let centers = this.get_foil(players);
        let locations: Location[] = [];
        let count = Math.round(stars/players);
        for (let center of centers){
            for(let i = 0; i < count; i++){
                let point = this._gaussian_point(center.x,center.y,std);
                let min_dist = 0;
                let dist = Infinity;
                let local_std = std;

                //Check if the point is too close to any other point
                while (min_dist < LIMIT_DIST){
                    for (let avoid of avoid_locations){
                        dist = this.distanceService.getDistanceBetweenLocations(avoid,point);
                        if (dist < LIMIT_DIST){
                            min_dist = dist;
                            point = this._gaussian_point(center.x,center.y,local_std);
                            break;
                        }
                    }
                    min_dist = dist;
                    local_std *= 1.01; //Stops infinite loop; grows gaussian variance every failure
                }

                locations.push(point);
                avoid_locations.push(point);
            }
        }
        return locations;
    }
    generateLocations(game, starCount: number, resourceDistribution: GameResourceDistribution, playerCount: number): Location[] {
        if (this.gameTypeService.isKingOfTheHillMode(game)) {
            throw new ValidationError(`King of the hill is not supported in irregular maps.`);
        }

        const SEED = ( Math.random()*(10**8) ).toFixed(0);
        const SPREAD = 2.5
        const RNG = randomSeeded.create(SEED);
        const SIMPLEX_NOISE = createNoise2D(alea(SEED));
        const NOISE_BASE_SPREAD = 32.0;
        //const NOISE_SPREAD = NOISE_BASE_SPREAD * Math.sqrt(starCount*1.3);// try to make the noise spread with the size of the galaxy. this makes the void gaps also proportional to galaxy size. 
        //const NOISE_SPREAD = 512; //optionally could keep the voids constant in size, no matter the galaxy size
        const TAU = 2.0*Math.PI;
        const STARS_PER_PLAYER = starCount/playerCount;
        const INITIAL_HYPER_RANGE = game.settings.technology.startingTechnologyLevel.hyperspace;
        const STARTING_STAR_COUNT = game.settings.player.startingStars-1;
        const MINIMUM_STAR_DISTANCE = game.constants.distances.minDistanceBetweenStars * 0.75; // TODO: This is a bit of a bodge to ensure that stars do not spawn too far away from players.

        const NOISE_SPREAD = NOISE_BASE_SPREAD * ( (STARS_PER_PLAYER+20)/9.0 )
       
        //the amount of rings must produce about 30% more stars then requested. this way they can be pruned latter with noise to produce nice gap
        const STAR_COUNT_MULTIPLYER = 1.3;
        const RING_COUNT = this._getRingCount(STARS_PER_PLAYER, (STARS_PER_PLAYER*STAR_COUNT_MULTIPLYER));
        const STAR_DISTANCE = MINIMUM_STAR_DISTANCE*SPREAD;
        const STAR_DISLOCATION_THRESHOLD = MINIMUM_STAR_DISTANCE*((SPREAD-1.0)/2.0);
        const PIVOT_DISTANCE = RING_COUNT*STAR_DISTANCE;

        let locations: Location[] = [];
        let homeLocations = this.get_foil(playerCount);
        console.log("Polar Plottting");
        locations.concat(homeLocations);
        locations = this.get_gaussian_foil(playerCount*2,starCount/2,100,locations);
        //locations.concat(locations)
        locations = this.get_gaussian_foil(playerCount*4,starCount/2,50,locations);
        for(let location of locations){
            (location as any).homeStar = false;
            (location as any).linkedLocations = [];
        } 
        for(let homeLocation of homeLocations) {
            (homeLocation as any).homeStar = true;
            (homeLocation as any).linkedLocations = [];
        }
        locations = locations.concat(homeLocations);
        /*
        for( let homeLocation of homeLocations ) {
            this._generateConcentricHexRingsLocations( homeLocation, RING_COUNT, STAR_DISTANCE, baseLocations );
        }
        for( let supplementaryHomeLocation of supplementaryHomeLocations ) {
            this._generateConcentricHexRingsLocations( supplementaryHomeLocation, RING_COUNT, STAR_DISTANCE, supplementaryLocations );
        }

        locations = locations.concat(baseLocations, supplementaryLocations);

        for(let homeLocation of homeLocations) {
            (homeLocation as any).homeStar = true;
            (homeLocation as any).linkedLocations = [];
        }

        */

        this.resourceService.distribute(game, locations, resourceDistribution);
        
        return locations;
    }
};

