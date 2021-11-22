// Example to USE
// include file in node
// > var tools = require('./addliq.js');
// adding initial liquidity with tokenA=7; tokenB=7
// > tools.addLiquidity(7,7,0,0)
// buy liquidity with tokenB=1 
// > tools.buyLiquidity(1)


// > var tools = require('./addliq.js');
// tools.clearReserves();tools.addLiquidity(7,7,0,0);tools.buyLiquidity(1)
// tools.clearReserves();tools.addLiquidity(10000,40000,0,0);tools.buyLiquidity(50000)
// tools.clearReserves();tools.addLiquidity(40000,10000,0,0);tools.buyLiquidity(50000)

module.exports = { 
	reserveA: 0,
	reserveB: 0,
	clearReserves: function() {
		this.reserveA = 0;
		this.reserveB = 0;
	},
		
	buyLiquidity: function(amountBTotal) {
		console.log('==== buyLiquidity ====');
		console.log('amountBTotal =', amountBTotal);
		let reserveABefore = this.reserveA;
		let reserveBBefore = this.reserveB;
		//Then the amount they would want to swap is
        // r3 = sqrt( (r1 + r2) * r1 ) - r1
        // where 
        //  r1 - reserve at uniswap(reserve1)
        //  r2 - incoming reserver token (incomeToken1)
        //uint256 r3 = sqrt( (reserve1.add(incomeToken1)).mul(reserve1)).sub(reserve1); //    
		let r3 = Math.sqrt((this.reserveB + amountBTotal)*this.reserveB)-(this.reserveB); //    
		
		// let r3 = (amountBTotal*this.reserveB / this.reserveA) / (1+this.reserveB / this.reserveA);
		//---
									//function(amountIn, reserveIn, reserveOut) 
		let amountADesired = this.getAmountOut(r3,this.reserveB,this.reserveA);
		this.reserveA -= amountADesired; 
		this.reserveB += r3;
		
		console.log('r3 	  =', r3);
		
		let amountBDesired = amountBTotal-r3;
		this.addLiquidity(amountADesired,amountBDesired,0,0);
		
	},
	addLiquidity: function(amountADesired,amountBDesired,amountAMin,amountBMin) {
		/// (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
		let reserveABefore = this.reserveA;
		let reserveBBefore = this.reserveB;
		
		console.log('==== addLiquidity::Before ====');
		console.log('reserveA =', this.reserveA);
		console.log('reserveB =', this.reserveB);
		console.log('amountADesired =', amountADesired);
		console.log('amountBDesired =', amountBDesired);
		
        if (this.reserveA == 0 && this.reserveB == 0) {
            //(amountA, amountB) = (amountADesired, amountBDesired);
			amountA = amountADesired;
			amountB = amountBDesired;
        } else {
            let amountBOptimal = this.quote(amountADesired, this.reserveA, this.reserveB);
            if (amountBOptimal <= amountBDesired) {
                if(amountBOptimal >= amountBMin) {} else {throw new Error('UniswapV2Router: INSUFFICIENT_B_AMOUNT')};
				amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                let amountAOptimal = this.quote(amountBDesired, this.reserveB, this.reserveA);
                if(amountAOptimal <= amountADesired) {} else {throw new Error('assertion')}
                if(amountAOptimal >= amountAMin) {} else {throw new Error('UniswapV2Router: INSUFFICIENT_A_AMOUNT')};
                amountA = amountAOptimal;
				amountB = amountBDesired;
            }
        }
		
		console.log('==== addLiquidity::After ====');
		console.log('amountA =', amountA);
		console.log('amountB =', amountB);
		
		console.log('leftAmountA =', amountADesired-amountA);
		console.log('leftAmountB =', amountBDesired-amountB);
		
		this.reserveA+=amountA;
		this.reserveB+=amountB;
		
		console.log('reserveA =', this.reserveA);
		console.log('reserveB =', this.reserveB);
		
		/// returns (uint amountA, uint amountB, uint liquidity) {
        
        //address pair = UniswapV2Library.pairFor(factory, tokenA, tokenB);
        //TransferHelper.safeTransferFrom(tokenA, msg.sender, pair, amountA);
        //TransferHelper.safeTransferFrom(tokenB, msg.sender, pair, amountB);
        //liquidity = IUniswapV2Pair(pair).mint(to);
    },
	// given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
    quote: function(amountA, reserveA, reserveB) {
		
        if (amountA > 0) {} else { throw new Error('UniswapV2Library: INSUFFICIENT_AMOUNT')};
		if (reserveA > 0 && reserveB > 0) {} else { throw new Error('UniswapV2Library: INSUFFICIENT_LIQUIDITY')};
        
		
        let amountB = amountA * reserveB / reserveA;
		//returns (uint amountB)
		return amountB;
    },
	getAmountOut: function(amountIn, reserveIn, reserveOut) {
		if (amountIn > 0) {} else { throw new Error('UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT')};
		if (reserveIn > 0 && reserveOut > 0) {} else { throw new Error('UniswapV2Library: INSUFFICIENT_LIQUIDITY')};
		//-------
		let amountInWithFee = amountIn * (997);
        let numerator = amountInWithFee * (reserveOut);
        let denominator = reserveIn * (1000) + (amountInWithFee);
        let amountOut = numerator / denominator;
		//-------
		//let amountInWithFee = amountIn;
        //let numerator = amountInWithFee * (reserveOut);
        //let denominator = reserveIn + (amountInWithFee);
        //let amountOut = numerator / denominator;
		//-------
		// returns (uint amountOut)
		return amountOut;
	}
	
    //this.sum = function(a,b) { return a+b };
    //this.multiply = function(a,b) { return a*b };
    //etc
}
