var con = require('./db.js')
const InputDataDecoder = require('ethereum-input-data-decoder');
const uniswap = new InputDataDecoder('uniswap_abi.json')
const erc20 = require('./erc20_abi.json')
// configure uniswap router. Using V2 atm.
const uniswap_contract = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
// configure starting block here. defaults to latest
const start_block = 'latest'

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

async function insert_token(address, hash, block_number, input_method, from, amt_out) {
    // check if token is in db, if not insert
    let sql = "SELECT * from uniswap_coin WHERE contract_address='"+address+"'";
    let token_id = '';
    con.query(sql, async function (error, res, fields) {
        // if coin not found, insert
        if (!res.length) {
            console.log('New coin found, inserting... ')
            let contract = new web3.eth.Contract(erc20, address)
            let name = await contract.methods.name().call().then((res) => { return res })
            let symbol = await contract.methods.symbol().call().then((res) => { return res })
            let decimals  = await contract.methods.decimals().call().then((res) => { return res })
            let total_supply = await contract.methods.totalSupply().call().then((res) => { return res })
            // insert coin
            let sql1 = "INSERT INTO uniswap_coin (contract_address, name, symbol, decimals, total_supply) VALUES ('" + address + "','" + name + "','" + symbol + "','" + decimals + "','" + total_supply + "')";
            con.query(sql1);
            let sql2 = "select last_insert_id() as inserted_id";
            con.query(sql2, function (error, res, fields) {
                console.log('new token id found:' +res[0].inserted_id)
                token_id = res[0].inserted_id
            });

        }
        // coin found, just return id
        else {
            token_id = res[0].id
            console.log('Existing token found: '+token_id)
        }
        // wait for 1 sec
        await sleep(1000)
        console.log('block '+block_number+': token id to be inserted: '+token_id)
        let sql2 = "INSERT INTO uniswap_tx (txhash, blocknumber, uniswap_coin_in_id, uniswap_coin_out_id, method, address_from, amount_out) " +
            "VALUES ('" + hash + "','" + block_number + "','" + '1' + "','" + token_id + "','" + input_method + "','" + from + "','" + amt_out + "')";
        con.query(sql2)
    });
}

async function check_current_block(block_number) {
    web3.eth.getBlock('latest').then( async function (current_block) {
        // if block is not yet updated, call itself
        console.log('latest block: '+current_block.number+', processing block: '+block_number)
        if (parseInt(current_block.number) > parseInt(block_number)) {
            start_process(block_number)
        }
        else {
            console.log('waiting for 12 more secs. too fast..')
            await sleep(12000)
            check_current_block(block_number)
        }
    })
}

function start_process(block_number) {
    web3.eth.getBlock(block_number).then( async function (current_block) {
        console.log('Processing Block Number: '+current_block.number)
        for (let tx of current_block.transactions) {
            web3.eth.getTransaction(tx).then( (val) => {
                if (uniswap_contract == val.to) {
                    input = uniswap.decodeData(val.input)
                    switch(input.method) {
                        case "swapExactETHForTokens":
                            let amt_out = input.inputs[0].toNumber()
                            token_contract = input.inputs[1][1]
                            console.log('swapExactETHForTokens found - token contract: '+token_contract)
                            insert_token(token_contract, val.hash, val.blockNumber, input.method, val.from, amt_out);
                            break;
                        default:
                            // default method
                    }
                }
            })
        }
        await sleep(12000)
        // now loop start_process and increase counter by 1
        let next_block = current_block.number + 1
        check_current_block(next_block)
    })
}

module.exports = function() {
    // configure block here if you want to start at certain block
    start_process(start_block);
}