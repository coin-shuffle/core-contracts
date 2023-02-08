import { network } from "hardhat";

export async function impersonate(address: any) {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });

  await network.provider.send("hardhat_setBalance", [
    address,
    "0xFFFFFFFFFFFFFFFF",
  ]);
}
