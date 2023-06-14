module.exports = function(evalString, appendedAttributes){
	// We can riskily modify global because of our limited working scope, significantly faster performance
	for(const appendKey in appendedAttributes) global[appendKey] = appendedAttributes[appendKey];
	try {
		return eval(evalString);
	} catch(err){
		console.log("THE FAILED EVAL STRING:");
		console.log(evalString);
		throw new Error(err);
	}
}