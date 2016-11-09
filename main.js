var request = require('request');
var jsdom = require('jsdom');
var fs = require('fs');
var jquery = fs.readFileSync("./utils/jquery.min.js", "utf-8");
var querystring = require('querystring');

/*
    request({
        url:'http://m.api.dianping.com/searchshop.json?start=1&regionid=0&categoryid=10&sortid=0&locatecityid=2&cityid=2&keyword=%E6%80%A1%E4%B9%90%E4%B8%AD%E8%A1%97',
        method:'get',
        headers:userAgent
    },function(err,data){
        console.log(data.body);
        resolve();
    });
*/

    
const userAgent = {
    'user-agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
};

var citys = JSON.parse(fs.readFileSync('./data/citys.json','utf-8'));

var c = {
    get:function(url,obj,cb){
        //var url = (url[url.length-1] == '/') ? (url + '?' + querystring.stringify(obj)) : (url + '/?' + querystring.stringify(obj));
        var url = url + '?' + querystring.stringify(obj);
        
        request({
            url:url,
            headers:userAgent,
            method:'get'
        },function(err,data){
            if(err){
                return cb && cb(err);
            }
            cb && cb(data.body);
        });
    },
    post:function(url,obj,cb){
        request({
            url:url,
            headers:userAgent,
            method:'post',
            form:obj
        },function(err,data){
            if(err){
                return cb && cb(err);
            }
            cb && cb(data.body);
        });
    }
}

module.exports = function(location,maxCount){
    var jar = request.jar();
    var output = '';
    
    var querys;
    
    ;( () => { //get city id
        return new Promise((resolve,reject) => {
            const url = 'http://api.map.baidu.com/geocoder/v2/';
            
            ;( ()=>{
                return new Promise( (rev,rej) => {
                    if(location.indexOf(',')>-1){
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
                    if(typeof data == 'object'){
                        var obj = data;
                        var a = obj.result && obj.result.location;
                        geo = a.lat+','+a.lng;
                    }else{
                        geo = data;
                    }
                    
                    c.get(url,{
                        location:geo,
                        output:'json',
                        ak:'yTfvVEFO4EI9vWnwNgky3LKP'
                    },function(result){
                        rev(result);
                    });
                    
                } )
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
            
            c.get('http://m.api.dianping.com/searchshop.json',{
                start:1,
                regionid:0,
                categoryid:10,
                sortid:0,
                locatecityid:id,
                cityid:id,
                keyword:querys
            },function(data){
                var data = JSON.parse(data);
                console.log(data);
            });
            
            resolve();
        } );
    } ).then( () => {
        return new Promise( (resolve,reject) => {
            
        } );
    } );
    
}