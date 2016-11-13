# delicious
输入坐标或位置信息，显示附近美食

# Install
    
    npm i delicious
    
# Getstarted

使用坐标数组[lat,lng]
或者地理位置关键字
所有参数必填


    delicious(location,keywords,maxCount,function(results){
        console.log(results);
    });
    
    
    
# Example

    var delicious = require('delicious');
    
    
    delicious([39.80981488385131,116.74007918067626],'',100,function(results){
        console.log(results); //==>最大为100的结果
    });

    delicious('通州区','火锅',100,function(results){
        console.log(results); //==>最大为100的结果 类别为火锅的美食
    });
    
    
todo