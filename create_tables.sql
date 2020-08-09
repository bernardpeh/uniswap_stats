SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS uniswap_tx;
DROP TABLE IF EXISTS uniswap_coin;
DROP TABLE IF EXISTS my_portfolio;

CREATE TABLE `uniswap_tx` (
  `id` int(11) NOT NULL auto_increment,
  `txhash` varchar(66)  NULL,
  `blocknumber` int(11) NULL,
  `uniswap_coin_in_id` int(11) NULL,
  `uniswap_coin_out_id` int(11) NULL,
  `method` varchar(60) NULL,
  `address_from` varchar(45) NULL,
  `amount_in` varchar(30) NULL,
  `amount_out` varchar(30) NULL,
  `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY  (`id`),
   FOREIGN KEY (uniswap_coin_in_id) REFERENCES uniswap_coin(id),
   FOREIGN KEY (uniswap_coin_out_id) REFERENCES uniswap_coin(id)
);

CREATE TABLE `uniswap_coin` (
  `id` int(11) NOT NULL auto_increment,
  `contract_address` varchar(45) NULL,
  `name` varchar(40) NULL,
  `symbol` varchar(10) NULL,
  `decimals` varchar(2) NULL,
  `total_supply` varchar(40) NULL,
  `is_active`  TINYINT(1) NOT NULL DEFAULT '1',
  `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY  (`id`)
);

CREATE TABLE `my_portfolio` (
  `id` int(11) NOT NULL auto_increment,
  `uniswap_coin_in_id` int(11) NULL,
  `uniswap_coin_out_id` int(11) NULL,
  `amount_in` varchar(30) NULL,
  `amount_out` varchar(30) NULL,
  `is_active`  TINYINT(1) NOT NULL DEFAULT '1',
  `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY  (`id`),
   FOREIGN KEY (uniswap_coin_in_id) REFERENCES uniswap_coin(id),
   FOREIGN KEY (uniswap_coin_out_id) REFERENCES uniswap_coin(id)
);

CREATE INDEX uniswap_coin_in_id1 ON uniswap_tx (uniswap_coin_in_id);
CREATE INDEX uniswap_coin_out_id1 ON uniswap_tx (uniswap_coin_out_id);
CREATE UNIQUE INDEX contract_address1 ON uniswap_coin (contract_address);

INSERT INTO `uniswap_coin` (id, name, symbol, decimals) VALUES (1,'Ethereum','ETH','18');