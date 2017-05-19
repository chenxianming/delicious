var request = require('request');
var jsdom = require('jsdom');
var fs = require('fs');
var querystring = require('querystring');
var AsyncArr = require('async-arr');

var jquery = fs.readFileSync(__dirname+"/utils/jquery.min.js", "utf-8");

var distance = require('geo-dist-calc');

/*
const userAgent = {
    'user-agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
};
*/

const url = 'http://api.map.baidu.com/geocoder/v2/';

var citys = JSON.parse(fs.readFileSync(__dirname+'/data/citys.json','utf-8'));

var c = {
    get:function(url,obj,cb){
        var url = url + '?' + querystring.stringify(obj),
            args = arguments,
            userAgent = {
            'User-Agent': ~~(Math.random()*10000000)
        };
        
        request({
            url:url,
            headers:userAgent,
            method:'get'
        },function(err,data){
            if(err){
                return (typeof args[args.length-1] == 'function') && args[args.length-1](err);
            }
            
            (typeof args[args.length-1] == 'function') && args[args.length-1](data.body);
        });
    },
    post:function(url,obj,cb){
        var args = arguments,
            userAgent = {
            'User-Agent': ~~(Math.random()*10000000)
        };
        
        request({
            url:url,
            headers:userAgent,
            method:'post',
            form:obj
        },function(err,data){
            if(err){
                return (typeof args[args.length-1] == 'function') && args[args.length-1](err);
            }
            
            (typeof args[args.length-1] == 'function') && args[args.length-1](data.body);
        });
    }
}

module.exports = function(location,keywords,maxCount,callback){
    var output = '';
    var querys;
    var args = arguments;
    var curPos = [];
    
    ;( () => new Promise( (resolve,reject) => { //city id
        
        ;( () => new Promise( (rev,rej) => {
            
            if(typeof location == 'object'){
                rev(location);
            }else{
                querys = location;
                c.get(url,{
                    address:location,
                    output:'json',
                    ak:'yTfvVEFO4EI9vWnwNgky3LKP'
                },function(result){
                    rev(JSON.parse(result));
                });
            }
            
        } ) )().then( (data) => new Promise( (rev,rej) => {
            
            var geo = '';
            if(data.result){
                var obj = data;
                var a = obj.result && obj.result.location;
                geo = a.lat+','+a.lng;
            }else{
                geo = data[0]+','+data[1];
            }

            curPos = geo.split(',');

            c.get(url,{
                location:geo,
                output:'json',
                ak:'yTfvVEFO4EI9vWnwNgky3LKP'
            },function(result){
                rev(result);
            });

        } ) ).then( (locationData) => new Promise( (rev,rej) => {
            
            var lData = JSON.parse(locationData);
            var city = (lData.result.addressComponent.city).replace('市','');

            if(!querys){
                querys = (lData.result.addressComponent.street || lData.result.formatted_address);
            }

            var id = null;
            citys.forEach(function(p){
                if(p.name.indexOf(city)>-1){
                    id = p.id;
                }
            });

            resolve(id);

        } ) )
        
    } ) )().then( (id) => new Promise( (resolve,reject) => {
        
            if(!id){
                return output = '获取位置信息失败';
            }
            
            var counts = maxCount || 25;
            var f = ~~(counts/25);
            var arr = [];
            
            for(var i = 0;i<f;i++){
                arr.push(i);
            }
            
            var outof = null;
            
            if(!arr.length){
                arr = [0];
                outof = maxCount;
            }
            
            var results = [];
            var tasks = new AsyncArr(arr);
            tasks.each(function(item,index){
                return new Promise(function(rev,rej){
                    c.get('http://m.api.dianping.com/searchshop.json',{
                        start:item*25,
                        regionid:0,
                        categoryid:10,
                        sortid:0,
                        locatecityid:id,
                        cityid:id,
                        keyword:querys + keywords
                    },function(data){
                        var data = JSON.parse(data);
                        data.list.forEach(function(p){
                            results.push(p);
                        });
                        rev();
                    });
                });
            }).then(function(){
                var rsArr = outof ? [] : results;
                if(outof){
                    results.forEach(function(p,i){
                        if(i<outof){
                            rsArr.push(p);
                        }
                    });
                }
                resolve(rsArr);
            });
        
    } ) ).then( (results) => new Promise( (resolve,reject) => {
        
        var rs = results;
        var getDetails = new AsyncArr(rs);
        getDetails.each(function(item,index){
            return ( new Promise(function(rev,rej){
                var id = item.id;

                c.get('http://m.dianping.com/shop/'+id,function(data){
                    jsdom.env({
                        html:data,
                        src:[jquery],
                        done:function(err,window){

                            var $ = window.$;
                            var a = $('.info-address a');
                            a.find('.icon-address').remove();
                            a.find('.arrowent').remove();
                            var address = a.html().replace(/ /g,'');
                            address = address.replace(/\n/g,'');

                            var b = $('.J_phone a');
                            b.find('.icon-call').remove();
                            b.find('.arrowent').remove();

                            var d = $('.businessTime');

                            item.photoLink = $('.shopInfoPagelet a')[0] ? $('.shopInfoPagelet a')[0].href : '';

                            try{
                                var tel = b.html().replace(/ /g,'');
                                tel = tel.replace(/\n/g,'');
                                item.tel = tel;

                                var businessTime = d.html().replace(/ /g,'');
                                businessTime = businessTime.replace(/\n/g,'');
                                item.businessTime = businessTime;
                            }catch(e){}

                            item.address = address;

                            rev();
                        }
                    });
                });

            }) ).then( () => {
                return new Promise(function(rev,rej){
                    c.get('http://api.map.baidu.com/geocoder/v2/',{
                        address:item.address,
                        output:'json',
                        ak:'yTfvVEFO4EI9vWnwNgky3LKP'
                    },function(result){
                        var dt = JSON.parse(result);
                        if(dt.geolocation){
                            try{                                    
                                var sourcePoints = {
                                    latitude:dt.geolocation.lat * 1,
                                    longitude:dt.geolocation.lng * 1
                                },
                                destinationPoints = {
                                    latitude:curPos[0] * 1,
                                    longitude:curPos[1] * 1
                                };

                                var dst = distance.discal(sourcePoints,destinationPoints);

                                item.distance = ~~(dst.kilometers * 1000);

                                rev();
                            }catch(e){
                                console.log(e);
                            }
                        }else{
                            rev();
                        }
                    });
                });
            } ).then( () => new Promise( (resolve,reject) => {
                
                request({
                    url:'https://m.dianping.com/index/api/module',
                    method:'post',
                    form:{
                        pageEnName:'shopphoto',
                        "moduleInfoList[0][moduleName]":'list',
                        "moduleInfoList[0][config][pullDown]":false,
                        "moduleInfoList[0][query][shopId]":item.id,
                        "moduleInfoList[0][query][page]":1
                    }
                },function(err,d){
                    if(err){
                        item['photos'] = [];
                        return rev();
                    }

                    var json = eval(`[${d.body}]`);
                    var body = json[0];

                    var arr = [];
                    body.data.moduleInfoList[0].moduleData.data.photos.forEach(function(j){
                        arr.push('http:'+j.bigUrl);
                    });

                    item['photos'] = arr;
                    
                    resolve();
                });
                
            } ) )
        }).then(() => {
            resolve(rs);
        });
        
    } ) ).then( (results) => new Promise( (resolve,reject) => {
        
        (typeof args[args.length-1] == 'function') && args[args.length-1](results);
        
    } ) );
    
}