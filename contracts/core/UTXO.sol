// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "../interfaces/IUTXO.sol";

import "../libs/UTXOArray.sol";
import "../libs/UTXOPaginator.sol";

contract EthereumUTXO is IUTXO {
    using ECDSA for bytes32;
    using UTXOArray for UTXOArray.Array;
    using Paginator for UTXOArray.Array;

    uint256 public constant MAX_UTXOS = 10;

    UTXOArray.Array internal UTXOs;

    function deposit(address token_, Output[] calldata outputs_) external override {
        require(outputs_.length > 0, "EthereumUTXO: empty outputs");
        require(outputs_.length <= MAX_UTXOS, "EthereumUTXO: too many outputs");

        uint256 amount_ = _getTotalAmount(outputs_);

        IERC20(token_).transferFrom(msg.sender, address(this), amount_);

        UTXOs.addOutputs(token_, outputs_);
    }

    function withdraw(Input memory input_, address to_) external override {
        require(input_.id < UTXOs.length(), "EthereumUTXO: UTXO doesn't exist");

        UTXO memory utxo_ = UTXOs.at(input_.id);
        require(!utxo_.isSpent, "EthereumUTXO: UTXO has been spent");

        bytes memory data_ = abi.encodePacked(input_.id, to_);
        require(
            utxo_.owner == keccak256(data_).recover(input_.signature),
            "EthereumUTXO: invalid signature"
        );

        UTXOs.remove(input_.id);

        IERC20(utxo_.token).transfer(to_, utxo_.amount);
    }

    function transfer(Input[] memory inputs_, Output[] memory outputs_) external override {
        require(outputs_.length != 0, "EthereumUTXO: outputs can not be empty");
        require(inputs_.length != 0, "EthereumUTXO: inputs can not be empty");

        uint256 outAmount_ = 0;
        uint256 inAmount_ = 0;

        bytes memory data_;
        for (uint i = 0; i < outputs_.length; i++) {
            outAmount_ += outputs_[i].amount;
            data_ = abi.encodePacked(data_, outputs_[i].amount, outputs_[i].owner);
        }

        uint256 UTXOsLength_ = UTXOs.length();

        address token_ = UTXOs._values[inputs_[0].id].token;

        for (uint i = 0; i < inputs_.length; i++) {
            require(inputs_[i].id < UTXOsLength_, "EthereumUTXO: UTXO doesn't exist");

            UTXO memory utxo_ = UTXOs._values[inputs_[i].id];

            require(token_ == utxo_.token, "EthereumUTXO: UTXO token mismatch");
            require(!utxo_.isSpent, "EthereumUTXO: UTXO has been spent");
            require(
                utxo_.owner ==
                    keccak256(abi.encodePacked(inputs_[i].id, data_)).recover(
                        inputs_[i].signature
                    ),
                "EthereumUTXO: invalid signature"
            );

            inAmount_ += utxo_.amount;
            UTXOs._values[inputs_[i].id].isSpent = true;
        }

        require(inAmount_ == outAmount_, "EthereumUTXO: input and output amount mismatch");

        UTXOs.addOutputs(token_, outputs_);
    }

    function listUTXOs(
        uint256 offset_,
        uint256 limit_
    ) external view override returns (UTXO[] memory) {
        return UTXOs.part(offset_, limit_);
    }

    function listUTXOsByAddress(
        address address_,
        uint256 offset_,
        uint256 limit_
    ) external view override returns (UTXO[] memory) {
        return UTXOs.partByAddress(address_, offset_, limit_);
    }

    function getUTXOsLength() external view override returns (uint256) {
        return UTXOs.length();
    }

    function getUTXOById(uint256 id_) external view override returns (UTXO memory) {
        require(id_ < UTXOs.length(), "EthereumUTXO: UTXO doesn't exist");

        return UTXOs._values[id_];
    }

    function getUTXOByIds(uint256[] memory ids_) external view override returns (UTXO[] memory) {
        return UTXOs.getUTXOByIds(ids_);
    }

    function _getTotalAmount(Output[] calldata outputs_) private pure returns (uint256 result) {
        for (uint i = 0; i < outputs_.length; i++) {
            result += outputs_[i].amount;
        }
    }
}
