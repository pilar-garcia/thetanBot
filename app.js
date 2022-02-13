const express = require('express')
const request = require('request');
const cors = require('cors')

const app = express()
app.use(cors())

const port = 3000
const bnbPriceURL = 'https://exchange.thetanarena.com/exchange/v1/currency/price/32'
const thcPriceURL = 'https://exchange.thetanarena.com/exchange/v1/currency/price/1'
const heroStatsURL = 'https://data.thetanarena.com/thetan/v1/hero?id='
const searchURL = 'https://data.thetanarena.com/thetan/v1/nif/search?sort=Latest&batPercentMin=20&priceMax=12500000&from=0&size=50'
//'https://data.thetanarena.com/thetan/v1/nif/search?sort=Latest&batPercentMin=20&batPercentMax=100&priceMax=12000000&from=0&size=16'//https://data.thetanarena.com/thetan/v1/nif/search?sort=Latest&batPercentMin=60&from=0&size=16';
////'https://data.thetanarena.com/thetan/v1/nif/search?sort=Latest&batPercentMin=0&from=0&size=24'//'https://data.thetanarena.com/thetan/v1/nif/search?sort=Latest&batPercentMin=0&heroRarity=1&from=0&size=60'
const imageURL = 'https://storage.googleapis.com/thetanarena-asset/'

//https://marketplace.thetanarena.com/?batPercentMin=0&page=1&priceMax=11100000&sort=Latest

function runAsyncWrapper (callback) {
  return function (req, res, next) {
    callback(req, res, next)
      .catch(next)
  }
}

app.get('/', runAsyncWrapper(async(req, res) => {
  const bnbPrice = await getBnbPrice();
  const thcPrice = await getThcPrice();
  const heroes = await searchHeroes();
  let champs = [];
  for (const searchedHero of heroes) {
    const heroStats = await getHeroStats(searchedHero, bnbPrice, thcPrice);
    if(heroStats.agregar){
      champs.push(heroStats);
    }
  }
  res.send(heroes);
}))

async function getHeroStats(element, bnbPrice, thcPrice){
  const response = await axios.get(heroStatsURL+element.refId);
  const heroStats = response.data.data;
  let champ = {
    id: element.id,
    skin: imageURL + heroStats.skinInfo.imageSmallAvatar,
    refId: element.refId,
    systemCurrency: element.systemCurrency,
    name: element.name,
    battleCap: element.battleCap,
    battleCapMax: element.battleCapMax,
    battleAvailable: element.battleCapMax - ( element.battleCapMax - element.battleCap),
    thcBonus: 6 + heroStats.thcBonus,
    dailyBattles: heroStats.dailyTHCBattleConfig,
    price: element.price / 100000000,
    usdPrice: (element.price / 100000000) * bnbPrice,
    daysToPlay: Math.ceil((element.battleCapMax - ( element.battleCapMax - element.battleCap)) /  heroStats.dailyTHCBattleConfig),
  }
  let games =  calculateGames(thcPrice, champ)
  
  champ.games = games;
  return champ;
}

function calculateGames(thcPrice, champ){
  let games = [];
  let agregar = true;

  for (let index = 5; index <= 10; index++) {
    let gamesWin = champ.battleAvailable * (index/10);
    let gamesLosses = champ.battleAvailable - gamesWin;
    let thcGain = (gamesWin * champ.thcBonus + gamesLosses);
    let dailyThc = thcGain / champ.daysToPlay;
    let dailyUSD = dailyThc*thcPrice;
    let daysToPay = champ.usdPrice / dailyUSD; 
    thcGain = thcGain/1.04;
    let dollarGain = thcGain*thcPrice;
    let dollarFuture = thcGain*(thcPrice-0.03);
    let dollarRise = thcGain*(thcPrice+0.02);
    let game = {
      winRate: index*10+'%',
      gamesWin: gamesWin,
      thcGained: thcGain,
      dollarGained: dollarGain,
      profit: dollarGain - champ.usdPrice,
      futureProfit: dollarFuture - champ.usdPrice,
      futurePostiveProfit: dollarRise - champ.usdPrice,
      dailyUSD: dailyUSD,
      daysToPay: daysToPay
    }
    if(index == 4 || index == 5){
      agregar = game.profit >= 10;
    }
    games.push(game);
  }
  champ.agregar = agregar;
  return games;
}

async function searchHeroes(){
  const response = await axios.get(searchURL);
  return response.data.data;
}

async function searchAllHeroes(){
  const response = await axios.get(searchURL);
  
  return response.data;
}

async function getBnbPrice(){
  const response = await axios.get(bnbPriceURL);
  return response.data.data;
}

async function getThcPrice(){
  const response = await axios.get(thcPriceURL);
  return response.data.data;
}

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})