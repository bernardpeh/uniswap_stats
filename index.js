var con = require('./db.js')
const InputDataDecoder = require('ethereum-input-data-decoder');
const uniswap = new InputDataDecoder('uniswap_abi.json')
const erc20 = require('./erc20_abi.json')
const util = require('util')
// promisify mysql query
const query = util.promisify(con.query).bind(con);


// CONFIGURATION HERE
const uniswap_contract = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
const start_block = 'latest'

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

async function insert_coin(address) {
    let sql = "SELECT * from uniswap_coin WHERE contract_address='"+address+"'";
    let res = await query(sql);
    if (!res.length) {
        console.log('New coin found, inserting... ')
        let contract = new web3.eth.Contract(erc20, address)
        let coin_name = await contract.methods.name().call().then((res) => { return res })
        let symbol = await contract.methods.symbol().call().then((res) => { return res })
        let decimals  = await contract.methods.decimals().call().then((res) => { return res })
        let total_supply = await contract.methods.totalSupply().call().then((res) => { return res })
        // insert coin
        let sql2 = "INSERT INTO uniswap_coin (contract_address, name, symbol, decimals, total_supply) VALUES ('" + address + "','" + coin_name + "','" + symbol + "','" + decimals + "','" + total_supply + "')";
        await query(sql2);
    }
}

async function get_coin_id(address) {
    let token_id = 1
    if (address) {
        let sql = "SELECT * from uniswap_coin WHERE contract_address='"+address+"'";
        let res = await query(sql)
        // if coin found, assign id
        if (res.length) {
            token_id = res[0].id
        }

    }
    return token_id
}

async function insert_tx(token_contracts, hash, block_number, input_method, from, amt_out, amt_in) {
    for await (let address of token_contracts) {
        // check contract in is null, it is ethereum
        if (address) {
            await insert_coin(address)
        }
    }
    // get token in and token out
    let token_in_id = await get_coin_id(token_contracts[0])
    let token_out_id = await get_coin_id(token_contracts[1])

    console.log('block '+block_number+': token_in_id, token_out_id out: '+token_in_id+','+token_out_id)
    let sql= "INSERT INTO uniswap_tx (txhash, blocknumber, uniswap_coin_in_id, uniswap_coin_out_id, method, address_from, amount_out, amount_in) " +
        "VALUES ('" + hash + "','" + block_number + "','" + token_in_id + "','" + token_out_id + "','" + input_method + "','" + from + "','" + amt_out + "','" + amt_in + "')";
    await query(sql)
}

async function check_current_block(block_number) {
    web3.eth.getBlock('latest').then( async function (current_block) {
        // if block is not yet updated, call itself
        console.log('latest block: '+current_block.number+', processing block: '+block_number)
        if (parseInt(current_block.number) > parseInt(block_number)) {
            start_process(block_number)
        }
        else {
            console.log('waiting for 8 more secs. too fast..')
            await sleep(8000)
            check_current_block(block_number)
        }
    })
}

async function start_process(block_number) {
    web3.eth.getBlock(block_number).then( async function (current_block) {
        console.log('Processing Block Number: '+current_block.number)
        for (let tx of current_block.transactions) {
            web3.eth.getTransaction(tx).then( (val) => {
                if (uniswap_contract == val.to) {
                    let input = uniswap.decodeData(val.input)
                    let amt_in = ''
                    let amt_out = ''
                    let token_contracts = []
                    switch(input.method) {
                        case "swapETHForExactTokens":
                            amt_out = input.inputs[0].toNumber()
                            token_contracts = ['', input.inputs[1][1]]
                            console.log('swapETHForExactTokens activated')
                            insert_tx(token_contracts, val.hash, val.blockNumber, input.method, val.from, amt_out, val.value);
                            break;
                        case "swapExactETHForTokens":
                            amt_out = input.inputs[0].toNumber()
                            token_contracts = ['', input.inputs[1][1]]
                            console.log('swapExactETHForTokens activated')
                            insert_tx(token_contracts, val.hash, val.blockNumber, input.method, val.from, amt_out, val.value);
                            break;
                        case "swapExactETHForTokensSupportingFeeOnTransferTokens":
                            amt_out = input.inputs[0].toNumber()
                            token_contracts = ['', input.inputs[1][1]]
                            console.log('swapExactETHForTokensSupportingFeeOnTransferTokens activated')
                            insert_tx(token_contracts, val.hash, val.blockNumber, input.method, val.from, amt_out, val.value);
                            break;
                        case "swapExactTokensForETH":
                            amt_in = input.inputs[0].toNumber()
                            amt_out = input.inputs[1].toNumber()
                            token_contracts = [input.inputs[2][0],'']
                            console.log('swapExactTokensForETH activated')
                            insert_tx(token_contracts, val.hash, val.blockNumber, input.method, val.from, amt_out, amt_in);
                            break;
                        case "swapTokensForExactETH":
                            amt_in = input.inputs[0].toNumber()
                            amt_out = input.inputs[1].toNumber()
                            token_contracts = [input.inputs[2][0],'']
                            console.log('swapTokensForExactETH activated')
                            insert_tx(token_contracts, val.hash, val.blockNumber, input.method, val.from, amt_out, amt_in);
                            break;
                        case "swapExactTokensForETHSupportingFeeOnTransferTokens":
                            amt_in = input.inputs[0].toNumber()
                            amt_out = input.inputs[1].toNumber()
                            token_contracts = [input.inputs[2][0],'']
                            console.log('swapExactTokensForETHSupportingFeeOnTransferTokens activated')
                            insert_tx(token_contracts, val.hash, val.blockNumber, input.method, val.from, amt_out, amt_in);
                            break;
                        case "swapExactTokensForTokens":
                            amt_in = input.inputs[0].toNumber()
                            amt_out = input.inputs[1].toNumber()
                            token_contracts = [input.inputs[2][0], input.inputs[2][input.inputs[2].length-1]]
                            console.log('swapExactTokensForTokens activated')
                            insert_tx(token_contracts, val.hash, val.blockNumber, input.method, val.from, amt_out, amt_in);
                            break;
                        case "swapExactTokensForTokensSupportingFeeOnTransferTokens":
                            amt_in = input.inputs[0].toNumber()
                            amt_out = input.inputs[1].toNumber()
                            token_contracts = [input.inputs[2][0], input.inputs[2][input.inputs[2].length-1]]
                            console.log('swapExactTokensForTokensSupportingFeeOnTransferTokens activated')
                            insert_tx(token_contracts, val.hash, val.blockNumber, input.method, val.from, amt_out, amt_in);
                            break;
                        case "swapTokensForExactTokens":
                            amt_in = input.inputs[0].toNumber()
                            amt_out = input.inputs[1].toNumber()
                            token_contracts = [input.inputs[2][0], input.inputs[2][input.inputs[2].length-1]]
                            console.log('swapTokensForExactTokens activated')
                            insert_tx(token_contracts, val.hash, val.blockNumber, input.method, val.from, amt_out, amt_in);
                            break;
                        default:
                            // default method
                    }
                }
            })
        }
        // wait 8 secs
        await sleep(8000)
        // now loop start_process and increase counter by 1
        let next_block = current_block.number + 1
        check_current_block(next_block)
    })
}

module.exports = function() {
    start_process(start_block);
}
