import "@nomiclabs/hardhat-ethers";

import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { BigNumber as BigNumberJS } from "bignumber.js";

export function wei(value: string | number, decimal: number = 18) {
  return BigNumber.from(
    new BigNumberJS(value).times(new BigNumberJS(10).pow(decimal)).toFixed()
  );
}

export function fromWei(value: string | number, decimal: number = 18) {
  return BigNumber.from(value).div(BigNumber.from(10).pow(decimal));
}

export async function account(index: number) {
  return (await ethers.getSigners())[index];
}
