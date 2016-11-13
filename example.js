var delicious = require('./main');

/*
    delicious(location,keywords,maxCount,function(results){
        console.log(results);
    });
*/

delicious([39.80981488385131,116.74007918067626],'',100,function(results){
    console.log(results); //==>最大为100的结果
});

delicious('通州区','火锅',100,function(results){
    console.log(results); //==>最大为100的结果 类别为火锅的美食
});