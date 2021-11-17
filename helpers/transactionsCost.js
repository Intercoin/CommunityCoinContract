
const BigNumber = require('bignumber.js');


var transactionsArr;

transactionsClear = () => {
    transactionsArr = [];
}

transactionPush = (txObj, title) => {
    transactionsArr.push([txObj, title]);    
}

getTxHash = (arr) => {
    if (typeof arr[0] !== 'undefined') {
        arrI = arr[0];
    } else {
        arrI = arr;
    }
    if (typeof arrI.transactionHash !== 'undefined') {
        txHash = arrI.transactionHash;
    } else {
        txHash = arrI.receipt.transactionHash;
        //objI["name"] = '';
    }
    return txHash;
}
getTransactionsCostEth = async (supposedGasPriceGwei, removeDuplicate) => {
    if (typeof removeDuplicate ==='undefined') {
        removeDuplicate = false;
    }
    
    let arr; 
    let signTitles=[];
    
        
    
    let 
        ret = [], objI, arrI, receipt, transaction, tmp, tmp2, gasUsedI, txHash,
        total = BigNumber(0),
        total2Supposed = BigNumber(0);
        
        let supposeTotal = false;
   
    
    arr = transactionsArr; 
    
    
    for(var i =0; i<arr.length; i++) {
        if (removeDuplicate==true) {
            if (signTitles.indexOf(arr[i][1]) == -1) {
               signTitles.push(arr[i][1]);
            } else {
                continue;
            }
            
        }
        
        
        objI = {};
        
        if (typeof arr[i][0] !== 'undefined') {
            arrI = arr[i][0];
            objI["name"] = arr[i][1];
        } else {
            arrI = arr[i];
        }
        if (typeof arrI.transactionHash !== 'undefined') {
            txHash = arrI.transactionHash;
            objI["name"] = arrI.constructor._json.contractName;
        } else {
            txHash = arrI.receipt.transactionHash;
            //objI["name"] = '';
        }
        receipt = await web3.eth.getTransactionReceipt(txHash);
        transaction = await web3.eth.getTransaction(txHash);
        tmp = BigNumber(transaction.gasPrice).times(BigNumber(receipt.gasUsed)).div(1e18*1);
        gasUsedI = BigNumber(receipt.gasUsed);
        
        objI["gasPrice"] = (BigNumber(transaction.gasPrice).div(1e9*1)).toString();
        objI["gasUsed"] = gasUsedI.toString();
        objI["cost"] = (tmp.toFixed(8)).toString();
        
        if (typeof(supposedGasPriceGwei) !== 'undefined') {
            objI["supposed_gasPrice"] = supposedGasPriceGwei.toString();
            tmp2 = BigNumber(supposedGasPriceGwei).times(BigNumber(receipt.gasUsed)).div(1e9*1);
            objI["supposed_cost"] = (tmp2.toFixed(8)).toString();
            total2Supposed = BigNumber(total2Supposed).plus(BigNumber(tmp2));
        }
        
        ret.push(objI);
        total = BigNumber(total).plus(BigNumber(tmp));
        
        
    }
    
    objI = {};
    objI["name"] = '...';
    objI["gasPrice"] = '...';
    objI["gasUsed"] = '...';
    objI["cost"] = (total.toFixed(8)).toString();
    if (typeof(supposedGasPriceGwei) !== 'undefined') {
        objI["supposed_gasPrice"] = '...';

        objI["supposed_cost"] = (total2Supposed.toFixed(8)).toString();
    } 
    ret.push(objI);
    
    
        
        
    
    // return ret;
    return Promise.resolve(ret);
    
}

// advanceTimeAndBlock = async (time) => {
//     await advanceTime(time);
//     await advanceBlock();

//     return Promise.resolve(web3.eth.getBlock('latest'));
// }

// advanceTime = (time) => {
//     return new Promise((resolve, reject) => {
//         web3.currentProvider.send({
//             jsonrpc: "2.0",
//             method: "evm_increaseTime",
//             params: [time],
//             id: new Date().getTime()
//         }, (err, result) => {
//             if (err) { return reject(err); }
//             return resolve(result);
//         });
//     });
// }

// advanceBlock = () => {
//     return new Promise((resolve, reject) => {
//         web3.currentProvider.send({
//             jsonrpc: "2.0",
//             method: "evm_mine",
//             id: new Date().getTime()
//         }, (err, result) => {
//             if (err) { return reject(err); }
//             const newBlockHash = web3.eth.getBlock('latest').hash;

//             return resolve(newBlockHash)
//         });
//     });
// }

module.exports = {
    transactionPush,
    transactionsClear,
    getTransactionsCostEth
}