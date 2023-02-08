import "@nomiclabs/hardhat-web3";

import { network, web3 } from "hardhat";

export async function setNextBlockTime(time: any) {
  await network.provider.send("evm_setNextBlockTimestamp", [time]);
}

export async function setTime(time: any) {
  await setNextBlockTime(time);
  await mine();
}

export async function getCurrentBlockTime() {
  return (await web3.eth.getBlock(await web3.eth.getBlockNumber())).timestamp;
}

export async function mine(numberOfBlocks = 1) {
  for (let i = 0; i < numberOfBlocks; i++) {
    await network.provider.send("evm_mine");
  }
}
