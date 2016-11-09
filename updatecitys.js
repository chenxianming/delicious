var request = require('request');
var jsdom = require('jsdom');
var fs = require('fs');
var jquery = fs.readFileSync("./utils/jquery.min.js", "utf-8");

//update citys
module.exports = function(){
    var texts = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
    
    var citys = [];
    
    texts.forEach(function(p,i){
            jsdom.env({
                url:'http://m.dianping.com/citylist?c='+p+'&returl=&type=0&from=city_more',
                src:[jquery],
                done:function(err,window){
                    var $ = window.$;
                    $('.J_citylist li').each(function(){
                        var name = $(this).find('a').html(),
                            id = $(this).find('a').attr('data-id');
                        citys.push({
                            id:id,
                            name:name
                        });
                    });
                }
            });
        
            setTimeout(function(){
                citys.sort(function(a,b){
                    return a.id - b.id;
                });
                fs.writeFile('./data/citys.json',JSON.stringify(citys),function(err,done){
                    console.log(done);
                });
            },5000);
    });
}()