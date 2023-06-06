module.exports = function(evalString, appendedAttributes){
	// We can riskily modify global because of our limited working scope, significantly faster performance
	for(const appendKey in appendedAttributes) global[appendKey] = appendedAttributes[appendKey];
	return eval(evalString);
}