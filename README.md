Collect uniswap stats for research purpose

## Prerequisite

* install [truffle](https://github.com/trufflesuite/truffle)

## Installation
```
npm install
// configure truffle-config.js
cp truffle-config.sample.js truffle-config.js
// configure db.js
cp db.js.sample db.js
// create sql tables
cat create_tables.sql | mysql -uusername -ppassword db
```

## Usage

* start stats collection
```
// in index.js, configure the block to start gathering stats
truffle exec index.js --network=main
```

* adminer to help manage db
```
php -S localhost:8080
```


