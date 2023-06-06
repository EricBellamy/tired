const Cache = require('./main.js');

const testCache = new Cache("test");

testCache.set("hello", "world");
testCache.save();