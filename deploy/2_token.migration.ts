import "@nomiclabs/hardhat-truffle5/dist/src/type-extensions";

import { Deployer, Logger } from "@dlsl/hardhat-migrate";
import { artifacts } from "hardhat";

// TODO: change debug addresses
const addrr1 = "0xf41ceE234219D6cc3d90A6996dC3276aD378cfCF";
const addrr2 = "0xE461aa915538B81BA17995DF5FEDB96640f10BDE";

const ERC20 = artifacts.require("ERC20Mock");
const EthereumUTXO = artifacts.require("EthereumUTXO");

export = async (deployer: Deployer, logger: Logger) => {
  const token1 = await deployer.deploy(ERC20, "Ibrahim", "KEK", 18);

  logger.logTransaction(await token1.mint(addrr1, 100000000), "Mint 1 for 1");

  logger.logTransaction(await token1.mint(addrr2, 100000000), "Mint 1 for 2");

  logger.logContracts(
    ["Ibrahim", token1.address],
    ["EthereumUTXO", (await EthereumUTXO.deployed()).address]
  );
};
