import { expect } from "chai";
import { ethers } from "hardhat";
import { ERC20Mock, EthereumUTXO } from "../generated-types/ethers";

import { BigNumber, BigNumberish } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { wei } from "../scripts/utils/utils";
import { sign } from "./utils/signature";
import { Reverter } from "./helpers/reverter";

import { IUTXO } from "../generated-types/ethers/contracts/core/UTXO.sol/EthereumUTXO";

import OutputStruct = IUTXO.OutputStruct;
import InputStruct = IUTXO.InputStruct;

function buildOutputs(amounts: BigNumber[], owner: string): OutputStruct[] {
  return amounts.map((amount) => {
    return {
      amount,
      owner,
    };
  });
}

// ids and to must be the same length
async function buildInputsWithAddress(
  ids: BigNumberish[],
  from: SignerWithAddress,
  recipients: string[]
): Promise<InputStruct[]> {
  let iter = 0;
  if (ids.length !== recipients.length) {
    throw new Error("IDs and recipients must be the same length");
  }
  return ids.map((id) => {
    return {
      id,
      signature: sign(
        from,
        ethers.utils.solidityPack(
          ["uint256", "address"],
          [id, recipients[iter++]]
        )
      ),
    };
  });
}

describe("EthereumUTXO", () => {
  const reverter = new Reverter();

  let ethereumUTXO: EthereumUTXO;
  let someToken: ERC20Mock;
  let otherToken: ERC20Mock;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  before(async function () {
    [user1, user2, user3] = await ethers.getSigners();
    const EthereumUTXO = await ethers.getContractFactory("EthereumUTXO");
    ethereumUTXO = (await EthereumUTXO.deploy()) as EthereumUTXO;

    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    someToken = (await ERC20.deploy("SomeToken", "ST", 18)) as ERC20Mock;
    otherToken = (await ERC20.deploy("OtherToken", "OT", 18)) as ERC20Mock;

    await someToken.mint(user1.address, wei(1000));
    await someToken.connect(user1).approve(ethereumUTXO.address, wei(1000));

    await someToken.mint(user2.address, wei(1000));
    await someToken.connect(user2).approve(ethereumUTXO.address, wei(1000));

    await someToken.mint(user3.address, wei(2000));
    await someToken.connect(user3).approve(ethereumUTXO.address, wei(2000));

    await otherToken.mint(user3.address, wei(2000));
    await otherToken.connect(user3).approve(ethereumUTXO.address, wei(2000));

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  describe("Function: deposit", () => {
    it("should deposit with correct data", async () => {
      const outputs = buildOutputs([wei(100), wei(200)], user1.address);

      await expect(someToken.balanceOf(user1.address)).to.be.eventually.eq(
        wei(1000)
      );

      await ethereumUTXO.deposit(someToken.address, outputs);
      await expect(ethereumUTXO.getUTXOsLength()).to.be.eventually.eq(2);

      await expect(someToken.balanceOf(user1.address)).to.be.eventually.eq(
        wei(700)
      );

      await expect(
        isEqUTXOs(0, someToken.address, wei(100), user1.address, false)
      ).to.be.eventually.true;
      await expect(
        isEqUTXOs(1, someToken.address, wei(200), user1.address, false)
      ).to.be.eventually.true;
    });

    it("should revert with invalid data provided", async () => {
      await expect(
        ethereumUTXO.deposit(someToken.address, [])
      ).to.be.rejectedWith("EthereumUTXO: empty outputs");

      const outputs = buildOutputs(Array(11).fill(wei(1)), user1.address);
      await expect(
        ethereumUTXO.deposit(someToken.address, outputs)
      ).to.be.rejectedWith("EthereumUTXO: too many outputs");
    });
  });

  describe("Function: withdraw", () => {
    beforeEach(async () => {
      const outputs = buildOutputs([wei(100), wei(200)], user1.address);
      await ethereumUTXO.deposit(someToken.address, outputs);
    });

    it("should withdraw by the owner with correct data", async () => {
      const inputs = await buildInputsWithAddress(
        [0, 1],
        user1,
        Array(2).fill(user1.address)
      );
      await expect(someToken.balanceOf(user1.address)).to.be.eventually.eq(
        wei(700)
      );

      await ethereumUTXO.withdraw(inputs[0], user1.address);
      await expect(someToken.balanceOf(user1.address)).to.be.eventually.eq(
        wei(800)
      );

      await ethereumUTXO.withdraw(inputs[1], user1.address);
      await expect(someToken.balanceOf(user1.address)).to.be.eventually.eq(
        wei(1000)
      );
    });

    it("should revert if trying to withdraw with invalid data or by not an owner", async () => {
      const inputs = await buildInputsWithAddress(
        [0, 1, 2, 3],
        user1,
        Array(4).fill(user1.address)
      );
      await expect(someToken.balanceOf(user1.address)).to.be.eventually.eq(
        wei(700)
      );

      await expect(
        ethereumUTXO.withdraw(inputs[2], user1.address)
      ).to.be.rejectedWith("EthereumUTXO: UTXO doesn't exist");
      await expect(
        ethereumUTXO.withdraw(inputs[0], user2.address)
      ).to.be.rejectedWith("EthereumUTXO: invalid signature");

      await ethereumUTXO.withdraw(inputs[0], user1.address);
      await expect(
        ethereumUTXO.withdraw(inputs[0], user1.address)
      ).to.be.rejectedWith("EthereumUTXO: UTXO has been spent");
    });
  });

  describe("Function: transfer", () => {
    beforeEach(async () => {
      const outputsForUser1 = buildOutputs(
        [wei(100), wei(300), wei(230)],
        user1.address
      );

      const outputsForUser2 = buildOutputs(
        [wei(150), wei(250), wei(250)],
        user2.address
      );

      const outputsForUser3 = buildOutputs([wei(400), wei(350)], user3.address);

      await ethereumUTXO
        .connect(user1)
        .deposit(someToken.address, outputsForUser1);

      await ethereumUTXO
        .connect(user2)
        .deposit(someToken.address, outputsForUser2);

      await ethereumUTXO
        .connect(user3)
        .deposit(someToken.address, outputsForUser3);
    });

    it("should transfer the UTXO with correct data", async () => {
      let inputsFromUser1 = await buildInputsWithAddress([0, 2], user1, [
        user2.address,
        user3.address,
      ]);
      let inputsFromUser2 = await buildInputsWithAddress([3, 4], user1, [
        user1.address,
        user3.address,
      ]);
      let inputsFromUser3 = await buildInputsWithAddress([6], user1, [
        user2.address,
      ]);

      let inputs = inputsFromUser1.concat(inputsFromUser2, inputsFromUser3);
      const newOutputs = await buildOutputsFromInputs(inputs, [
        user2.address,
        user3.address,
        user1.address,
        user3.address,
        user2.address,
      ]);

      const signedData = newSignedData(inputs, newOutputs);

      await expect(
        ethereumUTXO.transfer(inputs, newOutputs)
      ).to.be.rejectedWith("EthereumUTXO: invalid signature");

      inputsFromUser1 = replaceSignature(inputsFromUser1, user1, signedData);
      inputsFromUser2 = replaceSignature(inputsFromUser2, user2, signedData);
      inputsFromUser3 = replaceSignature(inputsFromUser3, user3, signedData);

      inputs = inputsFromUser1.concat(inputsFromUser2, inputsFromUser3);

      await ethereumUTXO.transfer(inputs, newOutputs);

      await expect(
        ethereumUTXO.transfer(inputs, newOutputs)
      ).to.be.rejectedWith("EthereumUTXO: UTXO has been spent");

      await expect(
        isEqUTXOs(0, someToken.address, wei(100), user1.address, true)
      ).to.be.eventually.true;

      await expect(
        isEqUTXOs(1, someToken.address, wei(300), user1.address, false)
      ).to.be.eventually.true;

      await expect(
        isEqUTXOs(2, someToken.address, wei(230), user1.address, true)
      ).to.be.eventually.true;

      await expect(
        isEqUTXOs(3, someToken.address, wei(150), user2.address, true)
      ).to.be.eventually.true;

      await expect(
        isEqUTXOs(4, someToken.address, wei(250), user2.address, true)
      ).to.be.eventually.true;

      await expect(
        isEqUTXOs(5, someToken.address, wei(250), user2.address, false)
      ).to.be.eventually.true;

      await expect(
        isEqUTXOs(6, someToken.address, wei(400), user3.address, true)
      ).to.be.eventually.true;

      await expect(
        isEqUTXOs(7, someToken.address, wei(350), user3.address, false)
      ).to.be.eventually.true;

      /// new UTXOs

      await expect(
        isEqUTXOs(8, someToken.address, wei(100), user2.address, false)
      ).to.be.eventually.true;

      await expect(
        isEqUTXOs(9, someToken.address, wei(230), user3.address, false)
      ).to.be.eventually.true;

      await expect(
        isEqUTXOs(10, someToken.address, wei(150), user1.address, false)
      ).to.be.eventually.true;

      await expect(
        isEqUTXOs(11, someToken.address, wei(250), user3.address, false)
      ).to.be.eventually.true;

      await expect(
        isEqUTXOs(12, someToken.address, wei(400), user2.address, false)
      ).to.be.eventually.true;
    });

    it("should revert if trying to transfer with invalid data", async () => {
      let inputs = await buildInputsWithAddress([12, 2], user1, [
        user2.address,
        user2.address,
      ]);

      let newOutputs = buildOutputs([wei(100), wei(300)], user2.address);

      let signedData = newSignedData(inputs, newOutputs);

      inputs = replaceSignature(inputs, user1, signedData);

      await expect(
        ethereumUTXO.transfer(inputs, newOutputs)
      ).to.be.rejectedWith("EthereumUTXO: UTXO doesn't exist");

      await expect(ethereumUTXO.transfer(inputs, [])).to.be.rejectedWith(
        "EthereumUTXO: outputs can not be empty"
      );
      await expect(ethereumUTXO.transfer([], newOutputs)).to.be.rejectedWith(
        "EthereumUTXO: inputs can not be empty"
      );

      inputs = await buildInputsWithAddress([0, 12], user1, [
        user2.address,
        user2.address,
      ]);

      signedData = newSignedData(inputs, newOutputs);

      inputs = replaceSignature(inputs, user1, signedData);

      await expect(
        ethereumUTXO.transfer(inputs, newOutputs)
      ).to.be.rejectedWith("EthereumUTXO: UTXO doesn't exist");

      inputs = await buildInputsWithAddress([0, 2], user1, [
        user2.address,
        user2.address,
      ]);

      signedData = newSignedData(inputs, newOutputs);

      inputs = replaceSignature(inputs, user1, signedData);

      await expect(
        ethereumUTXO.transfer(inputs, newOutputs)
      ).to.be.rejectedWith("EthereumUTXO: input and output amount mismatch");
    });

    it("should revert if trying to use different tokens", async () => {
      const outputsForUser3_1 = buildOutputs([wei(351)], user3.address);

      const outputsForUser3_2 = buildOutputs([wei(352)], user3.address);

      await ethereumUTXO
        .connect(user3)
        .deposit(someToken.address, outputsForUser3_1);

      await ethereumUTXO
        .connect(user3)
        .deposit(otherToken.address, outputsForUser3_2);

      let inputs = await buildInputsWithAddress([8, 9], user3, [
        user2.address,
        user2.address,
      ]);

      const newOutputs = buildOutputs([wei(350), wei(350)], user2.address);

      const signedData = newSignedData(inputs, newOutputs);

      inputs = replaceSignature(inputs, user3, signedData);

      await expect(
        ethereumUTXO.transfer(inputs, newOutputs)
      ).to.be.rejectedWith("EthereumUTXO: UTXO token mismatch");
    });
  });

  describe("View functions", () => {
    beforeEach(async () => {
      const outputsForUser1 = buildOutputs(
        [wei(100), wei(300), wei(230), wei(250)],
        user1.address
      );

      const outputsForUser2 = buildOutputs([wei(321), wei(123)], user2.address);

      await ethereumUTXO
        .connect(user1)
        .deposit(someToken.address, outputsForUser1);

      await ethereumUTXO
        .connect(user2)
        .deposit(someToken.address, outputsForUser2);
    });

    it("should return correct UTXOs", async () => {
      const utxo = await ethereumUTXO.getUTXOById(1);

      expect(utxo.token).to.be.equal(someToken.address);
      expect(utxo.amount).to.be.equal(wei(300));
      expect(utxo.owner).to.be.equal(user1.address);
      expect(utxo.isSpent).to.be.false;

      await expect(ethereumUTXO.getUTXOById(12)).to.be.rejectedWith(
        "EthereumUTXO: UTXO doesn't exist"
      );

      const utxos = await ethereumUTXO.getUTXOByIds([2, 3]);
      expect(utxos.length).to.be.equal(2);
      expect(utxos[0].amount).to.be.equal(wei(230));
      expect(utxos[1].amount).to.be.equal(wei(250));

      await expect(ethereumUTXO.getUTXOByIds([2, 31])).to.be.rejectedWith(
        "EthereumUTXO: UTXO doesn't exist"
      );
    });

    it("should return list UTXO", async () => {
      const utxoList = await ethereumUTXO.listUTXOs(1, 2);
      expect(utxoList.length).to.be.equal(2);
      expect(utxoList[0].amount).to.be.equal(wei(300));
      expect(utxoList[1].amount).to.be.equal(wei(230));

      const user2UTXOs = await ethereumUTXO.listUTXOsByAddress(
        user2.address,
        0,
        10
      );

      expect(user2UTXOs.length).to.be.equal(2);
      expect(user2UTXOs[0].amount).to.be.equal(wei(321));
      expect(user2UTXOs[1].amount).to.be.equal(wei(123));

      const user1UTXOs = await ethereumUTXO.listUTXOsByAddress(
        user1.address,
        10,
        100
      );
      expect(user1UTXOs.length).to.be.equal(0);

      const user1UTXOs2 = await ethereumUTXO.listUTXOsByAddress(
        user1.address,
        0,
        100
      );

      expect(user1UTXOs2.length).to.be.equal(4);
    });
  });

  async function isEqUTXOs(
    id: BigNumberish,
    token: string,
    amount: BigNumberish,
    owner: string,
    isSpent: boolean
  ): Promise<boolean> {
    const utxo = await ethereumUTXO.getUTXOById(id);
    return (
      utxo.token === token &&
      utxo.amount.eq(amount) &&
      utxo.owner === owner &&
      utxo.isSpent === isSpent
    );
  }

  function newSignedData(
    inputs: InputStruct[],
    newOutputs: OutputStruct[]
  ): string {
    if (inputs.length !== newOutputs.length) {
      throw new Error("EthereumUTXO: invalid inputs or newOutputs");
    }

    let dataToBeSigned = "0x";
    for (const output of newOutputs) {
      dataToBeSigned += ethers.utils
        .solidityPack(["uint256", "address"], [output.amount, output.owner])
        .replace("0x", "");
    }

    return dataToBeSigned;
  }

  function replaceSignature(
    inputs: InputStruct[],
    from: SignerWithAddress,
    data: string
  ): InputStruct[] {
    return inputs.map((input) => {
      return {
        id: input.id,
        signature: sign(
          from,
          ethers.utils.solidityPack(["uint256", "bytes"], [input.id, data])
        ),
      };
    });
  }

  async function buildOutputsFromInputs(
    inputs: InputStruct[],
    recipients: string[]
  ): Promise<OutputStruct[]> {
    if (inputs.length !== recipients.length) {
      throw new Error("EthereumUTXO: invalid inputs or recipients");
    }
    let iter = 0;
    const result = inputs.map(async (input) => {
      const oldUTXO = await ethereumUTXO.getUTXOById(input.id);
      return {
        amount: oldUTXO.amount,
        owner: recipients[iter++],
      };
    });
    return Promise.all(result);
  }
});
