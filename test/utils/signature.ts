import "@nomiclabs/hardhat-ethers";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export async function signEach(
  signers: SignerWithAddress[],
  message: string
): Promise<string[]> {
  const hash = ethers.utils.solidityKeccak256(["bytes"], [message]);

  const bytes = ethers.utils.arrayify(hash);

  return Promise.all(signers.map(async (signer) => signer.signMessage(bytes)));
}
