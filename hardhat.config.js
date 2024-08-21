
require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");
// require("solidity-coverage")
// require('hardhat-contract-sizer'); //npx hardhat size-contracts

const kovanURL = `https://eth-kovan.alchemyapi.io/v2/${process.env.ALCHEMY_KOVAN}`
const goerliURL = `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_GOERLI}`
const rinkebyURL = /*`https://rinkeby.infura.io/v3/${process.env.INFURA_ID_PROJECT}` */`https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_RINKEBY}`
const bscURL = 'https://bsc-dataseed.binance.org' //`https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_RINKEBY}`
const mainnetURL = `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_MAINNET}`
const maticURL = `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_MATIC}`
const mumbaiURL = 'https://matic-mumbai.chainstacklabs.com';

const baseURL = 'https://mainnet.base.org';
const optimismURL = 'https://optimism.llamarpc.com';

module.exports = {
  networks: {
    local: {
      url: "http://localhost:8545", //rinkebyURL,
      chainId: 1337,
      //gasPrice: "auto",
      //accounts: {mnemonic: process.env.MNEMONIC,initialIndex:1},
      accounts: [process.env.private_key],
      saveDeployments: true
    },
    hardhat: {
      allowUnlimitedContractSize: false,
      // chainId: 137,  // sync with url or getting uniswap settings will reject transactions
      // forking: {url: maticURL}
      // @dev 
      // 1. there are no way to override chainid. in EVM on assembly section we will have 0x7a69 (local ganache id) whatever you write here or use any RPC urls
      // so if set url for BSC to be sure that libLiquidity supports
      // 2. set hardcoded "latest" block number on node. Else got an error "ProviderError: missing trie node" and happens only in BSC
      //-------------------------
      chainId: 1,
      forking: {url: mainnetURL}
    },
    bsc: {
      url: bscURL,
      chainId: 56,
      //gasPrice: "auto",
      accounts: [
        process.env.private_key,
        process.env.private_key_auxiliary,
        process.env.private_key_releasemanager,
        process.env.private_key_communitycoin,
        process.env.private_key_rewards
      ],
      saveDeployments: true
    },
    polygon: {
      url: maticURL,
      chainId: 137,
      //gasPrice: "auto",
      accounts: [
        process.env.private_key,
        process.env.private_key_auxiliary,
        process.env.private_key_releasemanager,
        process.env.private_key_communitycoin,
        process.env.private_key_rewards
      ],
      saveDeployments: true
    },
    // mumbai: {
    //   url: mumbaiURL,
    //   chainId: 80001,
    //   gasPrice: "auto",
    //   accounts: [process.env.private_key],
    //   saveDeployments: true
    // },
    mainnet: {
      url: mainnetURL,
      chainId: 1,
      //gasPrice: 3_000000000,
      accounts: [
        process.env.private_key,
        process.env.private_key_auxiliary,
        process.env.private_key_releasemanager,
        process.env.private_key_communitycoin,
        process.env.private_key_rewards
      ],
      saveDeployments: true
    },
    base: {
      url: baseURL,
      chainId: 8453,
      accounts: [
        process.env.private_key,
        process.env.private_key_auxiliary,
        process.env.private_key_releasemanager,
        process.env.private_key_communitycoin,
        process.env.private_key_rewards
      ],
      saveDeployments: true
    },
    optimisticEthereum: {
      url: optimismURL,
      chainId: 10,
      accounts: [
        process.env.private_key,
        process.env.private_key_auxiliary,
        process.env.private_key_releasemanager,
        process.env.private_key_communitycoin,
        process.env.private_key_rewards
      ],
      saveDeployments: true
    }
  },
  docgen: {
    theme: '../../docgen-custom-markdown',
    path: './docs',
    clear: true,
    runOnCompile: false,
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  },
  etherscan: {
    apiKey: {
      polygon: process.env.MATIC_API_KEY,
      bsc: process.env.BSCSCAN_API_KEY,
      mainnet: process.env.ETHERSCAN_API_KEY,
      optimisticEthereum: process.env.OPTIMISM_API_KEY,
      base: process.env.BASE_API_KEY
    }
    
    
  },
  solidity: {
    compilers: [
        {
          version: "0.8.11",
          settings: {
            optimizer: {
              enabled: true,
              runs: 1,
            },
            metadata: {
              // do not include the metadata hash, since this is machine dependent
              // and we want all generated code to be deterministic
              // https://docs.soliditylang.org/en/v0.7.6/metadata.html
              bytecodeHash: "none",
            },
          },
        },
        {
          version: "0.6.7",
          settings: {},
          settings: {
            optimizer: {
              enabled: false,
              runs: 1,
            },
            metadata: {
              // do not include the metadata hash, since this is machine dependent
              // and we want all generated code to be deterministic
              // https://docs.soliditylang.org/en/v0.7.6/metadata.html
              bytecodeHash: "none",
            },
          },
        },
      ],
  
    
  },

  namedAccounts: {
    deployer: 0
  },

  paths: {
    
    sources: "./contracts"
    
  },
  mocha: {
    timeout: 200000
  }
}
