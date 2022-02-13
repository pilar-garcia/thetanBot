const express = require('express')
const request = require('request')
const cors = require('cors')

const app = express()
app.use(cors())

const port = 3000
const bnbPriceURL = 'https://exchange.thetanarena.com/exchange/v1/currency/price/32'
const thcPriceURL = 'https://exchange.thetanarena.com/exchange/v1/currency/price/1'
const heroStatsURL = 'https://data.thetanarena.com/thetan/v1/hero?id='
const searchURL = 'https://data.thetanarena.com/thetan/v1/nif/search?sort=Latest&batPercentMin=20&batPercentMax=100&priceMax=8000000&from=0&size=16'//'https://data.thetanarena.com/thetan/v1/nif/search?sort=PriceAsc&batPercentMin=30&batPercentMax=60&from=16&size=16'
// 'https://data.thetanarena.com/thetan/v1/nif/search?sort=Latest&batPercentMin=20&priceMax=12500000&from=0&size=50'
//'https://data.thetanarena.com/thetan/v1/nif/search?sort=Latest&batPercentMin=20&batPercentMax=100&priceMax=12000000&from=0&size=16'//https://data.thetanarena.com/thetan/v1/nif/search?sort=Latest&batPercentMin=60&from=0&size=16';
////'https://data.thetanarena.com/thetan/v1/nif/search?sort=Latest&batPercentMin=0&from=0&size=24'//'https://data.thetanarena.com/thetan/v1/nif/search?sort=Latest&batPercentMin=0&heroRarity=1&from=0&size=60'
const imageURL = 'https://storage.googleapis.com/thetanarena-asset/'

//https://marketplace.thetanarena.com/?batPercentMin=0&page=1&priceMax=11100000&sort=Latest
app.get('/', (req, res) => {
  let bnbPrice = 0
  let thcPrice = 0
  
  request.get(bnbPriceURL,null,function(err,response,body){
    if(err){
      console.log(err);
    } //TODO: handle err
    if(response.statusCode === 200 ){
      bnbPrice = JSON.parse(body).data
      console.log(bnbPrice)
      request.get(thcPriceURL,null,function(errThc,responseThc,bodyThc){
        if(errThc){
          console.log(errThc);
        } //TODO: handle err
        if(responseThc.statusCode === 200 ){
          thcPrice = JSON.parse(bodyThc).data
          console.log(thcPrice)
          request.get(searchURL,null,function(errChamps,responseChamps,bodyChamps){
            if(errChamps){
              console.log(errChamps);
            } //TODO: handle err
            if(responseChamps.statusCode === 200 ){
              let result = JSON.parse(bodyChamps).data;
              let herosPromise = [];
              result.forEach(element => {
                let promiseHero = new Promise((resolve, reject) => {
                    request.get(heroStatsURL+element.refId,null,function(errHero,responseHero,bodyHero){
                        if(responseHero.statusCode === 200 ){
                          let resultHero = JSON.parse(bodyHero).data
                          let champ = {
                            id: element.id,
                            skin: imageURL + resultHero.skinInfo.imageSmallAvatar,
                            refId: element.refId,
                            systemCurrency: element.systemCurrency,
                            name: element.name,
                            battleCap: element.battleCap,
                            battleCapMax: element.battleCapMax,
                            battleAvailable: element.battleCapMax - ( element.battleCapMax - element.battleCap),
                            thcBonus: 6 + resultHero.thcBonus,
                            dailyBattles: resultHero.dailyTHCBattleConfig,
                            price: element.price / 100000000,
                            usdPrice: (element.price / 100000000) * bnbPrice,
                            daysToPlay: Math.ceil((element.battleCapMax - ( element.battleCapMax - element.battleCap)) /  resultHero.dailyTHCBattleConfig),
                          }
                          let games = [];
                          let agregar = true;
              
                          for (let index = 5; index <= 10; index++) {
                            
                            let gamesWin = champ.battleAvailable * (index/10)
                            let gamesLosses = champ.battleAvailable - gamesWin
                            let thcGain = (gamesWin * champ.thcBonus + gamesLosses)
                            let dailyThc = thcGain / champ.daysToPlay;
                            let dailyUSD = dailyThc*thcPrice;
                            let daysToPay = champ.usdPrice / dailyUSD; 
                            thcGain = thcGain/1.04
                            let dollarGain = thcGain*thcPrice
                            let dollarFuture = thcGain*(thcPrice-0.03)
                            let dollarRise = thcGain*(thcPrice+0.02)
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
                            }//4347220000093839
                           /* if(index == 4){
                              agregar = game.profit >= 10;
                            }
                            if(index == 5){
                              agregar = game.profit >= 10;
                            }*/
                            games.push(game)
                          }
                          champ.games = games;
                          champ.agregar = agregar;
                          resolve(champ);
                        } else {
                            resolve(element);
                        }
                      });
                }); 
                herosPromise.push(promiseHero);
              });  
              Promise.all(herosPromise).then(values => {
                let response = values.filter((el) =>
                  el.agregar
                );
                res.send(response);
              }).catch(errors =>{
                  console.log(errors)
              });
            } 
          })
        }
      })
      
    }
  })
 
})

function orderByGain() {
 
}


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})