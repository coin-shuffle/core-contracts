import "@nomiclabs/hardhat-truffle5/dist/src/type-extensions";

import { Deployer } from "@dlsl/hardhat-migrate";
import { artifacts } from "hardhat";

const EthereumUTXO = artifacts.require("EthereumUTXO");

export = async (deployer: Deployer) => {
  await deployer.deploy(EthereumUTXO);
};
