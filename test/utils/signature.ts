import "@nomiclabs/hardhat-ethers";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BytesLike } from "ethers";

export async function sign(
  signer: SignerWithAddress,
  message: string
): Promise<BytesLike> {
  const hash = ethers.utils.solidityKeccak256(["bytes"], [message]);

  const bytes = ethers.utils.arrayify(hash);

  return signer.signMessage(bytes);
}
