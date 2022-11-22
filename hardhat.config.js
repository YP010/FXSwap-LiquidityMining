require("@nomiclabs/hardhat-waffle");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-web3");
//require("@nomiclabs/hardhat-etherscan");
//require('hardhat-deploy');
//require("dotenv").config()
require("dotenv").config({path: '../.env'}) // Directory: scripts

const privateKey = process.env.PRIVATE_KEY;
const infuraKey = process.env.INFURA_KEY;
const etherscanKey = process.env.ETHERSCAN_KEY;
const bscscanKey = process.env.BSCSCAN_KEY;

module.exports = {
  networks: {
    fxcore: {
      url: "https://fx-json-web3.functionx.io:8545",
      chainId: 530,
      accounts: [`0x${privateKey}`]
    },
    fxtestnet: {
      url: "https://testnet-fx-json-web3.functionx.io:8545",
      chainId: 90001,
      accounts: [`0x${privateKey}`]
    },
    development: {
      url: "127.0.0.1:8585",
      network_id: "*",
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${infuraKey}`,
      network_id: 4,
      accounts: [`0x${privateKey}`]
    },
    bsctestnet: {
      url: `https://data-seed-prebsc-1-s1.binance.org:8545`,
      network_id: 97,
      accounts: [`0x${privateKey}`]
    },
    bsc: {
      url: `https://bsc-dataseed.binance.org`,
      network_id: 56,
      accounts: [`0x${privateKey}`]
    }
  },
  etherscan: {
    apiKey: {
      etherscan: etherscanKey,
      bscscan: bscscanKey
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  paths: {
    sources: './contracts'
  }
}
