var request = require('request');
var jsdom = require('jsdom');
var fs = require('fs');
var jquery = fs.readFileSync("./utils/jquery.min.js", "utf-8");
var querystring = require('querystring');
var AsyncArr = require('async-arr');
    
const userAgent = {
    'user-agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
};

var citys = JSON.parse(fs.readFileSync('./data/citys.json','utf-8'));

var c = {
    get:function(url,obj,cb){
        var url = url + '?' + querystring.stringify(obj);
        var args = arguments;
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
        var args = arguments;
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
    var jar = request.jar();
    var output = '';
    
    var querys;
    
    var args = arguments;
    
    ;( () => { //get city id
        return new Promise((resolve,reject) => {
            const url = 'http://api.map.baidu.com/geocoder/v2/';
            
            ;( ()=>{
                return new Promise( (rev,rej) => {
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
                });
            } )().then( (data)=>{
                return new Promise( (rev,rej) => {
                    var geo = '';
                    if(data.result){
                        var obj = data;
                        var a = obj.result && obj.result.location;
                        geo = a.lat+','+a.lng;
                    }else{
                        geo = data[0]+','+data[1];
                    }
                    
                    c.get(url,{
                        location:geo,
                        output:'json',
                        ak:'yTfvVEFO4EI9vWnwNgky3LKP'
                    },function(result){
                        rev(result);
                    });
                    
                } );
            } ).then( (locationData) => {
                return new Promise( (rev,rej) => {
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
                } )
            } )
            
        });
    } )().then( (id) => {
        return new Promise( (resolve,reject) => {
            if(!id){
                return output = '获取位置信息失败';
            }
            
            var counts = maxCount || 25;
            var f = ~~(counts/25);
            var arr = [];
            
            for(var i = 1;i<=f;i++){
                arr.push(i);
            }
            
            var outof = null;
            
            if(!arr.length){
                arr = [1];
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
            
        } );
    } ).then( (results) => {
        return new Promise( (resolve,reject) => {
            var rs = results;
            var getDetails = new AsyncArr(rs);
            getDetails.each(function(item,index){
                return new Promise(function(rev,rej){
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
                    
                });
            }).then(function(){
                resolve(rs);
            })
        } );
    } ).then( (results) => {
        return new Promise( (resolve,reject) => {
            (typeof args[args.length-1] == 'function') && args[args.length-1](results);
        } );
    } );
    
}