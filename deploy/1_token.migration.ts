import "@nomiclabs/hardhat-truffle5/dist/src/type-extensions";

import { Deployer, Logger } from "@dlsl/hardhat-migrate";
import { artifacts } from "hardhat";

// TODO: change debug addresses
const addrr1 = "0xf41ceE234219D6cc3d90A6996dC3276aD378cfCF";
const addrr2 = "0xE461aa915538B81BA17995DF5FEDB96640f10BDE";

const ERC20 = artifacts.require("ERC20Mock");

export = async (deployer: Deployer, logger: Logger) => {
  const token1 = await deployer.deploy(ERC20, "Token1", "SWT1", 18);
  const token2 = await deployer.deploy(ERC20, "Token1", "SWT1", 18);

  logger.logTransaction(await token1.mint(addrr1, 100000000), "Mint 1 for 1");
  logger.logTransaction(await token2.mint(addrr1, 100000000), "Mint 2 for 1");

  logger.logTransaction(await token1.mint(addrr2, 100000000), "Mint 1 for 2");
  logger.logTransaction(await token2.mint(addrr2, 100000000), "Mint 2 for 2");

  logger.logContracts(["Token1", token1.address], ["Token2", token2.address]);
};
